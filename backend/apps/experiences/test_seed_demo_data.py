"""Focused safety and repeatability tests for the controlled demo seeder."""

from decimal import Decimal
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.experiences.demo_seed_manifest import (
    BOOKINGS,
    EXPERIENCES,
    ITINERARIES,
    LOCATIONS,
    REVIEWS,
    USERS,
    VENDORS,
)
from apps.experiences.models import Category, FoodExperience, Location, TimeSlot
from apps.itinerary.models import Itinerary, ItineraryItem
from apps.reviews.models import Review
from apps.vendors.models import VendorProfile


TEST_PASSWORD = "DemoTestOnly!2026"


class DemoSeedCommandTests(TestCase):
    def run_seed(self):
        output = StringIO()
        with patch.dict("os.environ", {"DEMO_SEED_PASSWORD": TEST_PASSWORD}):
            call_command("seed_demo_data", stdout=output)
        return output.getvalue()

    def test_dry_run_is_read_only_and_does_not_require_password(self):
        output = StringIO()
        with patch.dict("os.environ", {}, clear=True):
            call_command("seed_demo_data", dry_run=True, stdout=output)

        self.assertIn("no database writes were performed", output.getvalue())
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(FoodExperience.objects.count(), 0)

    def test_write_requires_runtime_password(self):
        with patch.dict("os.environ", {}, clear=True), patch("sys.stdin.isatty", return_value=False):
            with self.assertRaisesMessage(CommandError, "DEMO_SEED_PASSWORD"):
                call_command("seed_demo_data", stdout=StringIO())

    def test_preferred_dataset_counts_password_hashing_and_admin_protection(self):
        administrator = User.objects.create_superuser(
            username="existing_admin",
            email="existing.admin@example.test",
            password="AdminUnchanged!2026",
            full_name="Existing Administrator",
            role="Administrator",
        )
        original_admin_hash = administrator.password

        self.run_seed()

        self.assertEqual(User.objects.filter(username__in=[item.username for item in USERS]).count(), len(USERS))
        self.assertEqual(VendorProfile.objects.filter(user__username__startswith="demo_").count(), len(VENDORS))
        self.assertEqual(FoodExperience.objects.filter(title__startswith="[Demo]").count(), len(EXPERIENCES))
        self.assertEqual(TimeSlot.objects.filter(food_experience__title__startswith="[Demo]").count(), 54)
        self.assertEqual(Booking.objects.filter(user__username__startswith="demo_").count(), len(BOOKINGS))
        self.assertEqual(Review.objects.filter(comment__startswith="[Demo review]").count(), len(REVIEWS))
        self.assertEqual(Itinerary.objects.filter(user__username__startswith="demo_").count(), len(ITINERARIES))
        self.assertEqual(ItineraryItem.objects.filter(itinerary__user__username__startswith="demo_").count(), 12)

        project_root = Path(__file__).resolve().parents[3]
        for item in EXPERIENCES:
            experience = FoodExperience.objects.get(title=item.title)
            self.assertEqual(experience.image_url, item.image_url)
            self.assertFalse(experience.image_url.startswith(("http://", "https://")))
            self.assertTrue((project_root / "frontend" / "public" / item.image_url.lstrip("/")).is_file())

        tourist = User.objects.get(username="demo_tourist_01")
        self.assertNotEqual(tourist.password, TEST_PASSWORD)
        self.assertTrue(tourist.check_password(TEST_PASSWORD))

        administrator.refresh_from_db()
        self.assertEqual(administrator.password, original_admin_hash)
        self.assertTrue(administrator.is_superuser)

    def test_business_relationships_match_existing_workflow_rules(self):
        self.run_seed()

        public_demo = FoodExperience.objects.filter(
            title__startswith="[Demo]",
            status="Published",
            vendor_profile__approval_status="Approved",
        )
        self.assertEqual(public_demo.count(), 16)
        self.assertEqual(
            public_demo.filter(location__latitude__isnull=False, location__longitude__isnull=False).count(),
            16,
        )
        self.assertFalse(
            FoodExperience.objects.filter(
                title__startswith="[Demo]",
                vendor_profile__approval_status__in=["Pending", "Rejected"],
            ).exists()
        )

        for booking in Booking.objects.filter(user__username__startswith="demo_").select_related(
            "user", "food_experience", "timeslot"
        ):
            self.assertEqual(booking.user.role, "Tourist")
            self.assertEqual(booking.timeslot.food_experience_id, booking.food_experience_id)
            if booking.booking_status in {"Approved", "Completed"}:
                self.assertEqual(booking.timeslot.availability_status, "Unavailable")
            if booking.booking_status == "Completed":
                self.assertIsNotNone(booking.completed_at)
                self.assertLess(booking.timeslot.slot_date, public_demo.first().timeslots.order_by("slot_date").last().slot_date)
            if booking.booking_status == "Cancelled":
                self.assertIsNotNone(booking.cancelled_at)

        for review in Review.objects.filter(comment__startswith="[Demo review]").select_related("booking"):
            self.assertEqual(review.booking.booking_status, "Completed")
            self.assertEqual(review.user_id, review.booking.user_id)
            self.assertEqual(review.food_experience_id, review.booking.food_experience_id)
            self.assertTrue(1 <= review.rating <= 5)

        eligible = Booking.objects.filter(
            user__username__startswith="demo_", booking_status="Completed", review__isnull=True
        )
        self.assertEqual(eligible.count(), 1)
        self.assertEqual(eligible.get().user.username, "demo_tourist_02")

    def test_coordinate_only_apply_is_unique_and_preserves_passwords_and_legacy_data(self):
        self.run_seed()
        demo_user = User.objects.get(username="demo_tourist_01")
        original_password_hash = demo_user.password

        vendor = VendorProfile.objects.filter(approval_status="Approved").first()
        category = Category.objects.first()
        legacy_location = Location.objects.create(
            address="Legacy shared map location",
            latitude="1.2830000",
            longitude="103.8430000",
        )
        legacy_experiences = [
            FoodExperience.objects.create(
                vendor_profile=vendor,
                category=category,
                location=legacy_location,
                title=f"Legacy coordinate sentinel {index}",
                description="Must remain unchanged.",
                price_sgd="20.00",
                status="Published",
            )
            for index in (1, 2)
        ]

        public_demo = FoodExperience.objects.filter(
            title__startswith="[Demo]",
            status="Published",
            vendor_profile__approval_status="Approved",
        )
        public_demo.update(location=legacy_location)

        output = StringIO()
        call_command("seed_demo_data", coordinates_only=True, stdout=output)

        demo_user.refresh_from_db()
        legacy_location.refresh_from_db()
        for experience in legacy_experiences:
            experience.refresh_from_db()

        coordinate_pairs = set(
            public_demo.values_list("location__latitude", "location__longitude")
        )
        expected_pairs = {
            (Decimal(location.latitude), Decimal(location.longitude))
            for location in LOCATIONS
            if location.key in {
                item.location_key for item in EXPERIENCES if item.status == "Published"
            }
        }
        self.assertEqual(len(coordinate_pairs), 16)
        self.assertEqual(coordinate_pairs, expected_pairs)
        self.assertEqual(demo_user.password, original_password_hash)
        self.assertEqual(legacy_location.latitude, Decimal("1.2830000"))
        self.assertEqual(legacy_location.longitude, Decimal("103.8430000"))
        self.assertTrue(all(item.location_id == legacy_location.location_id for item in legacy_experiences))
        self.assertIn("Demo credentials and non-demo records were not changed", output.getvalue())

    def test_repeated_seed_is_idempotent(self):
        self.run_seed()
        counts_before = self._tracked_counts()
        self.run_seed()
        self.assertEqual(self._tracked_counts(), counts_before)

        rotated_password = "RotatedDemoOnly!2026"
        with patch.dict("os.environ", {"DEMO_SEED_PASSWORD": rotated_password}):
            call_command("seed_demo_data", stdout=StringIO())
        self.assertEqual(self._tracked_counts(), counts_before)
        self.assertTrue(User.objects.get(username="demo_tourist_01").check_password(rotated_password))

    def test_reset_removes_only_manifest_owned_records(self):
        legacy_user = User.objects.create_user(
            username="legacy_sentinel",
            email="legacy.sentinel@example.test",
            password="LegacySentinel!2026",
            full_name="Legacy Sentinel",
        )
        shared_category = Category.objects.create(
            category_name="Legacy Sentinel Category", description="Must survive demo reset."
        )
        shared_location = Location.objects.create(address="Legacy Sentinel Location")
        self.run_seed()

        call_command(
            "seed_demo_data",
            reset_demo_data=True,
            confirm_reset=True,
            stdout=StringIO(),
        )

        self.assertTrue(User.objects.filter(pk=legacy_user.pk).exists())
        self.assertTrue(Category.objects.filter(pk=shared_category.pk).exists())
        self.assertTrue(Location.objects.filter(pk=shared_location.pk).exists())
        self.assertFalse(User.objects.filter(username__in=[item.username for item in USERS]).exists())
        self.assertFalse(FoodExperience.objects.filter(title__startswith="[Demo]").exists())
        self.assertFalse(Category.objects.filter(category_name__startswith="[Demo]").exists())
        self.assertFalse(Location.objects.filter(address__startswith="Demo area —").exists())

    def test_summary_is_read_only(self):
        self.run_seed()
        before = self._tracked_counts()
        output = StringIO()
        call_command("seed_demo_data", summary=True, stdout=output)
        self.assertEqual(self._tracked_counts(), before)
        self.assertIn('"public_demo_experiences": 16', output.getvalue())
        self.assertNotIn(TEST_PASSWORD, output.getvalue())

    @staticmethod
    def _tracked_counts():
        return {
            "users": User.objects.count(),
            "vendors": VendorProfile.objects.count(),
            "categories": Category.objects.count(),
            "locations": Location.objects.count(),
            "experiences": FoodExperience.objects.count(),
            "slots": TimeSlot.objects.count(),
            "bookings": Booking.objects.count(),
            "reviews": Review.objects.count(),
            "itineraries": Itinerary.objects.count(),
            "items": ItineraryItem.objects.count(),
        }
