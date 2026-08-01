"""Create, inspect, or safely remove the TasteLocal SG fictional demo dataset."""

import getpass
import json
import os
import sys
from collections import Counter
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.experiences.demo_seed_manifest import (
    BOOKINGS,
    CATEGORIES,
    DATASET_VERSION,
    DEMO_EMAIL_DOMAIN,
    DEMO_EXPERIENCE_PREFIX,
    DEMO_PROFILE_PREFIX,
    DEMO_REVIEW_PREFIX,
    DEMO_USERNAME_PREFIX,
    DEMO_VENDOR_PREFIX,
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


PASSWORD_ENVIRONMENT_VARIABLE = "DEMO_SEED_PASSWORD"
FUTURE_SLOT_TIMES = {
    "future_1": (time(10, 0), time(12, 0), 0),
    "future_2": (time(14, 0), time(16, 0), 7),
    "future_3": (time(18, 0), time(20, 0), 14),
}
HISTORICAL_SLOT_TIME = (time(11, 0), time(13, 0))


class Command(BaseCommand):
    help = "Seed the controlled, clearly fictional TasteLocal SG capstone dataset."

    def add_arguments(self, parser):
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and preview the dataset without writing to the database.",
        )
        mode.add_argument(
            "--summary",
            action="store_true",
            help="Print counts for manifest-owned records without writing.",
        )
        mode.add_argument(
            "--reset-demo-data",
            action="store_true",
            help="Remove only exact manifest-owned demo records.",
        )
        mode.add_argument(
            "--coordinates-only",
            action="store_true",
            help="Update only published manifest-owned demo location records and assignments.",
        )
        parser.add_argument(
            "--confirm-reset",
            action="store_true",
            help="Required non-interactive confirmation for --reset-demo-data.",
        )

    def handle(self, *args, **options):
        self._validate_manifest()
        self._validate_database_collisions()

        if options["summary"]:
            self._write_summary("current")
            return

        if options["dry_run"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Dry run passed for demo dataset {DATASET_VERSION}; no database writes were performed."
                )
            )
            self.stdout.write(json.dumps(self._planned_summary(), indent=2, sort_keys=True))
            self._write_summary("current")
            return

        if options["reset_demo_data"]:
            self._confirm_reset(options["confirm_reset"])
            with transaction.atomic():
                deleted = self._reset_demo_data()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Reset complete for demo dataset {DATASET_VERSION}; removed {deleted} records."
                )
            )
            self._write_summary("current")
            return

        if options["coordinates_only"]:
            with transaction.atomic():
                updated = self._apply_published_demo_coordinates()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated {updated} published demo coordinate assignments for dataset {DATASET_VERSION}. "
                    "Demo credentials and non-demo records were not changed."
                )
            )
            self._write_summary("current")
            return

        password = self._get_runtime_password()
        with transaction.atomic():
            self._apply(password)
            self._assert_applied_dataset()

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo dataset {DATASET_VERSION} applied successfully. Existing non-demo records were not changed."
            )
        )
        self._write_summary("current")

    def _validate_manifest(self):
        errors = []

        def require_unique(values, label):
            duplicates = sorted(key for key, count in Counter(values).items() if count > 1)
            if duplicates:
                errors.append(f"Duplicate {label}: {', '.join(duplicates)}")

        require_unique((item.username for item in USERS), "usernames")
        require_unique((item.email for item in USERS), "emails")
        require_unique((item.username for item in VENDORS), "vendor usernames")
        require_unique((item.key for item in CATEGORIES), "category keys")
        require_unique((item.name for item in CATEGORIES), "category names")
        require_unique((item.key for item in LOCATIONS), "location keys")
        require_unique((item.address for item in LOCATIONS), "location addresses")
        require_unique((item.key for item in EXPERIENCES), "experience keys")
        require_unique((item.title for item in EXPERIENCES), "experience titles")
        require_unique((item.image_url for item in EXPERIENCES), "experience image URLs")
        require_unique((item.key for item in BOOKINGS), "booking keys")
        require_unique((item.booking_key for item in REVIEWS), "review booking keys")
        require_unique((item.tourist_username for item in ITINERARIES), "itinerary tourists")

        user_map = {item.username: item for item in USERS}
        vendor_map = {item.username: item for item in VENDORS}
        category_map = {item.key: item for item in CATEGORIES}
        location_map = {item.key: item for item in LOCATIONS}
        experience_map = {item.key: item for item in EXPERIENCES}
        booking_map = {item.key: item for item in BOOKINGS}

        for item in USERS:
            if not item.username.startswith(DEMO_USERNAME_PREFIX):
                errors.append(f"User {item.username} is outside the demo namespace.")
            if item.email.rsplit("@", 1)[-1] != DEMO_EMAIL_DOMAIN:
                errors.append(f"User {item.username} does not use {DEMO_EMAIL_DOMAIN}.")
            if item.role not in {"Tourist", "Vendor"}:
                errors.append(f"User {item.username} has forbidden seed role {item.role}.")

        for item in VENDORS:
            user = user_map.get(item.username)
            if not user or user.role != "Vendor":
                errors.append(f"Vendor {item.username} has no matching Vendor user.")
            if not item.business_name.startswith(DEMO_VENDOR_PREFIX):
                errors.append(f"Vendor {item.username} is missing the visible demo prefix.")
            if item.approval_status not in {"Pending", "Approved", "Rejected"}:
                errors.append(f"Vendor {item.username} has invalid approval status.")

        for item in LOCATIONS:
            latitude = Decimal(item.latitude)
            longitude = Decimal(item.longitude)
            if not (Decimal("1.20") <= latitude <= Decimal("1.48")):
                errors.append(f"Location {item.key} latitude is outside the Singapore demo range.")
            if not (Decimal("103.60") <= longitude <= Decimal("104.10")):
                errors.append(f"Location {item.key} longitude is outside the Singapore demo range.")

        published_count = 0
        for item in EXPERIENCES:
            vendor = vendor_map.get(item.vendor_username)
            if not vendor:
                errors.append(f"Experience {item.key} has no manifest vendor.")
            elif item.status == "Published" and vendor.approval_status != "Approved":
                errors.append(f"Published experience {item.key} is not owned by an Approved vendor.")
            if item.category_key not in category_map:
                errors.append(f"Experience {item.key} has no manifest category.")
            if item.location_key not in location_map:
                errors.append(f"Experience {item.key} has no manifest location.")
            if not item.title.startswith(DEMO_EXPERIENCE_PREFIX):
                errors.append(f"Experience {item.key} is missing the visible demo prefix.")
            if item.price_sgd <= 0:
                errors.append(f"Experience {item.key} price must be positive.")
            if item.status not in {"Published", "Draft", "Inactive"}:
                errors.append(f"Experience {item.key} has invalid status.")
            if not item.image_url.startswith("/demo-images/experiences/") or not item.image_url.endswith(".webp"):
                errors.append(f"Experience {item.key} has an invalid local demo image URL.")
            published_count += item.status == "Published"

        if published_count != 16:
            errors.append(f"Demo dataset v2 requires 16 Published experiences, found {published_count}.")

        published_locations = [
            location_map[item.location_key] for item in EXPERIENCES if item.status == "Published"
        ]
        require_unique(
            (f"{item.latitude},{item.longitude}" for item in published_locations),
            "Published demo coordinate pairs",
        )
        for item in published_locations:
            if not item.managed:
                errors.append(f"Published demo location {item.key} is not manifest-owned.")

        booking_statuses = Counter()
        completed_slots = set()
        for item in BOOKINGS:
            user = user_map.get(item.tourist_username)
            experience = experience_map.get(item.experience_key)
            if not user or user.role != "Tourist":
                errors.append(f"Booking {item.key} has no matching Tourist user.")
            if not experience or experience.status != "Published":
                errors.append(f"Booking {item.key} does not target a Published experience.")
            if item.slot_kind not in {*FUTURE_SLOT_TIMES, "historical"}:
                errors.append(f"Booking {item.key} has invalid slot kind.")
            if item.status not in dict(Booking.STATUS_CHOICES):
                errors.append(f"Booking {item.key} has invalid status.")
            if item.status == "Completed" and item.slot_kind != "historical":
                errors.append(f"Completed booking {item.key} must use a historical slot.")
            slot_identity = (item.experience_key, item.slot_kind)
            if item.status in {"Approved", "Completed"} and slot_identity in completed_slots:
                errors.append(f"Consumed slot reused by booking {item.key}.")
            if item.status in {"Approved", "Completed"}:
                completed_slots.add(slot_identity)
            booking_statuses[item.status] += 1

        expected_booking_statuses = {
            "Pending Approval": 5,
            "Approved": 4,
            "Rejected": 3,
            "Cancelled": 3,
            "Completed": 6,
        }
        if dict(booking_statuses) != expected_booking_statuses:
            errors.append(f"Booking distribution is {dict(booking_statuses)}, expected {expected_booking_statuses}.")

        reviewed_booking_keys = {item.booking_key for item in REVIEWS}
        for item in REVIEWS:
            booking = booking_map.get(item.booking_key)
            if not booking or booking.status != "Completed":
                errors.append(f"Review for {item.booking_key} has no Completed booking.")
            if not 1 <= item.rating <= 5:
                errors.append(f"Review for {item.booking_key} has invalid rating.")
            if not item.comment.startswith(DEMO_REVIEW_PREFIX):
                errors.append(f"Review for {item.booking_key} is missing the demo prefix.")
        completed_keys = {item.key for item in BOOKINGS if item.status == "Completed"}
        if completed_keys - reviewed_booking_keys != {"completed_06_review_eligible"}:
            errors.append("Exactly completed_06_review_eligible must remain without a review.")

        for itinerary in ITINERARIES:
            user = user_map.get(itinerary.tourist_username)
            if not user or user.role != "Tourist":
                errors.append(f"Itinerary for {itinerary.tourist_username} has no Tourist user.")
            if len(itinerary.items) != 3:
                errors.append(f"Itinerary for {itinerary.tourist_username} must contain three items.")
            item_keys = [item.experience_key for item in itinerary.items]
            if len(item_keys) != len(set(item_keys)):
                errors.append(f"Itinerary for {itinerary.tourist_username} has duplicate experiences.")
            for item in itinerary.items:
                experience = experience_map.get(item.experience_key)
                if not experience or experience.status != "Published":
                    errors.append(f"Itinerary item {item.experience_key} is not public.")

        if errors:
            raise CommandError("Demo seed manifest validation failed:\n- " + "\n- ".join(errors))

    def _validate_database_collisions(self):
        errors = []
        user_by_name = {item.username: item for item in USERS}
        usernames = tuple(user_by_name)
        emails = tuple(item.email for item in USERS)

        for existing in User.objects.filter(username__in=usernames):
            expected = user_by_name[existing.username]
            if existing.email != expected.email or existing.is_staff or existing.is_superuser:
                errors.append(
                    f"Protected user collision for {existing.username}; email or administrator flags do not match."
                )
        for existing in User.objects.filter(email__in=emails).exclude(username__in=usernames):
            errors.append(f"Protected email collision: {existing.email} belongs to {existing.username}.")

        manifest_titles = {item.title: item for item in EXPERIENCES}
        for existing in FoodExperience.objects.filter(title__in=tuple(manifest_titles)):
            expected = manifest_titles[existing.title]
            if existing.vendor_profile.user.username != expected.vendor_username:
                errors.append(f"Protected experience-title collision: {existing.title}.")

        managed_categories = {item.name for item in CATEGORIES if item.managed}
        for category in Category.objects.filter(category_name__in=managed_categories):
            non_demo_reference = category.food_experiences.exclude(
                title__in=[item.title for item in EXPERIENCES]
            ).exists()
            if non_demo_reference:
                errors.append(f"Managed demo category is used by non-demo data: {category.category_name}.")

        managed_locations = {item.address for item in LOCATIONS if item.managed}
        for location in Location.objects.filter(address__in=managed_locations):
            non_demo_reference = location.food_experiences.exclude(
                title__in=[item.title for item in EXPERIENCES]
            ).exists()
            if non_demo_reference:
                errors.append(f"Managed demo location is used by non-demo data: {location.address}.")

        if errors:
            raise CommandError("Database collision check failed:\n- " + "\n- ".join(errors))

    def _get_runtime_password(self):
        password = os.environ.get(PASSWORD_ENVIRONMENT_VARIABLE)
        if password is None and sys.stdin.isatty():
            password = getpass.getpass("Demo account password (input hidden): ")
        if not password:
            raise CommandError(
                f"Set {PASSWORD_ENVIRONMENT_VARIABLE} for this process or run interactively."
            )
        if len(password) < 12:
            raise CommandError("The runtime demo password must contain at least 12 characters.")
        return password

    def _confirm_reset(self, confirmed):
        if confirmed:
            return
        if not sys.stdin.isatty():
            raise CommandError("Non-interactive reset requires --confirm-reset.")
        response = input("Remove only manifest-owned TasteLocal demo data? Type RESET-DEMO: ")
        if response != "RESET-DEMO":
            raise CommandError("Demo reset cancelled.")

    @staticmethod
    def _next_monday_on_or_after(value):
        return value + timedelta(days=(7 - value.weekday()) % 7)

    def _resolve_anchor_date(self, experiences):
        first_published = next(item for item in EXPERIENCES if item.status == "Published")
        existing_anchor = TimeSlot.objects.filter(
            food_experience=experiences[first_published.key],
            start_time=FUTURE_SLOT_TIMES["future_1"][0],
            end_time=FUTURE_SLOT_TIMES["future_1"][1],
        ).order_by("slot_date").values_list("slot_date", flat=True).first()
        if existing_anchor:
            return existing_anchor
        return self._next_monday_on_or_after(date.today() + timedelta(days=14))

    def _apply(self, password):
        users = self._apply_users(password)
        vendors = self._apply_vendors(users)
        categories = self._apply_categories()
        locations = self._apply_locations()
        experiences = self._apply_experiences(vendors, categories, locations)
        anchor_date = self._resolve_anchor_date(experiences)
        slots = self._apply_slots(experiences, anchor_date)
        bookings = self._apply_bookings(users, experiences, slots)
        self._apply_reviews(bookings)
        self._apply_itineraries(users, experiences, anchor_date)

    def _apply_users(self, password):
        result = {}
        for item in USERS:
            user = User.objects.filter(username=item.username).first()
            if user is None:
                user = User.objects.create_user(
                    username=item.username,
                    email=item.email,
                    password=password,
                    full_name=item.full_name,
                    role=item.role,
                    account_status="Active",
                )
            else:
                user.email = item.email
                user.full_name = item.full_name
                user.role = item.role
                user.account_status = "Active"
                user.is_staff = False
                user.is_superuser = False
                update_fields = [
                    "email", "full_name", "role", "account_status", "is_staff", "is_superuser"
                ]
                if not user.check_password(password):
                    user.set_password(password)
                    update_fields.append("password")
                user.full_clean()
                user.save(update_fields=update_fields)
            result[item.username] = user
        return result

    def _apply_vendors(self, users):
        result = {}
        for item in VENDORS:
            profile, _ = VendorProfile.objects.get_or_create(
                user=users[item.username],
                defaults={
                    "business_name": item.business_name,
                    "description": f"{DEMO_PROFILE_PREFIX} This profile presents {item.speciality}.",
                    "contact_number": "Demo contact only",
                    "approval_status": item.approval_status,
                    "business_address": f"Demo profile — {item.neighbourhood}, Singapore",
                },
            )
            profile.business_name = item.business_name
            profile.description = f"{DEMO_PROFILE_PREFIX} This profile presents {item.speciality}."
            profile.contact_number = "Demo contact only"
            profile.approval_status = item.approval_status
            profile.business_address = f"Demo profile — {item.neighbourhood}, Singapore"
            profile.full_clean()
            profile.save()
            result[item.username] = profile
        return result

    def _apply_categories(self):
        result = {}
        for item in CATEGORIES:
            category = Category.objects.filter(category_name=item.name).first()
            if category is None:
                category = Category(
                    category_name=item.name,
                    description=item.description,
                    is_active=True,
                )
                category.full_clean()
                category.save()
            elif item.managed:
                category.description = item.description
                category.is_active = True
                category.full_clean()
                category.save(update_fields=["description", "is_active"])
            result[item.key] = category
        return result

    def _apply_locations(self):
        result = {}
        for item in LOCATIONS:
            location = Location.objects.filter(address=item.address).order_by("location_id").first()
            if location is None:
                location = Location(
                    address=item.address,
                    latitude=Decimal(item.latitude),
                    longitude=Decimal(item.longitude),
                )
                location.full_clean()
                location.save()
            elif item.managed:
                location.latitude = Decimal(item.latitude)
                location.longitude = Decimal(item.longitude)
                location.full_clean()
                location.save(update_fields=["latitude", "longitude"])
            result[item.key] = location
        return result

    def _apply_published_demo_coordinates(self):
        location_map = {item.key: item for item in LOCATIONS}
        updated = 0
        for item in (item for item in EXPERIENCES if item.status == "Published"):
            location_seed = location_map[item.location_key]
            location = Location.objects.filter(address=location_seed.address).order_by("location_id").first()
            if location is None:
                location = Location(
                    address=location_seed.address,
                    latitude=Decimal(location_seed.latitude),
                    longitude=Decimal(location_seed.longitude),
                )
                location.full_clean()
                location.save()
            else:
                location.latitude = Decimal(location_seed.latitude)
                location.longitude = Decimal(location_seed.longitude)
                location.full_clean()
                location.save(update_fields=["latitude", "longitude"])

            experience = FoodExperience.objects.filter(
                title=item.title,
                vendor_profile__user__username=item.vendor_username,
            ).first()
            if experience is None:
                raise CommandError(
                    f"Coordinates-only update requires existing manifest experience {item.key}."
                )
            if experience.location_id != location.location_id:
                experience.location = location
                experience.save(update_fields=["location"])
            updated += 1
        return updated

    def _apply_experiences(self, vendors, categories, locations):
        result = {}
        for item in EXPERIENCES:
            experience = FoodExperience.objects.filter(
                vendor_profile=vendors[item.vendor_username], title=item.title
            ).first()
            if experience is None:
                experience = FoodExperience(
                    vendor_profile=vendors[item.vendor_username], title=item.title
                )
            experience.category = categories[item.category_key]
            experience.location = locations[item.location_key]
            experience.description = item.description
            experience.price_sgd = item.price_sgd
            experience.status = item.status
            experience.image_url = item.image_url
            experience.full_clean()
            experience.save()
            result[item.key] = experience
        return result

    def _apply_slots(self, experiences, anchor_date):
        result = {}
        published = [item for item in EXPERIENCES if item.status == "Published"]
        for index, item in enumerate(published):
            experience = experiences[item.key]
            for slot_kind, (start, end, week_offset) in FUTURE_SLOT_TIMES.items():
                slot_date = anchor_date + timedelta(days=week_offset + (index % 7))
                slot, _ = TimeSlot.objects.get_or_create(
                    food_experience=experience,
                    slot_date=slot_date,
                    start_time=start,
                    end_time=end,
                    defaults={"availability_status": "Available"},
                )
                slot.availability_status = "Available"
                slot.full_clean()
                slot.save(update_fields=["availability_status"])
                result[(item.key, slot_kind)] = slot

        completed_experience_keys = []
        for booking in BOOKINGS:
            if booking.status == "Completed" and booking.experience_key not in completed_experience_keys:
                completed_experience_keys.append(booking.experience_key)
        for index, experience_key in enumerate(completed_experience_keys):
            slot_date = anchor_date - timedelta(days=30 + index)
            slot, _ = TimeSlot.objects.get_or_create(
                food_experience=experiences[experience_key],
                slot_date=slot_date,
                start_time=HISTORICAL_SLOT_TIME[0],
                end_time=HISTORICAL_SLOT_TIME[1],
                defaults={"availability_status": "Unavailable"},
            )
            slot.availability_status = "Unavailable"
            slot.full_clean()
            slot.save(update_fields=["availability_status"])
            result[(experience_key, "historical")] = slot
        return result

    def _apply_bookings(self, users, experiences, slots):
        result = {}
        now = timezone.now()
        for item in BOOKINGS:
            slot = slots[(item.experience_key, item.slot_kind)]
            booking, _ = Booking.objects.get_or_create(
                user=users[item.tourist_username],
                food_experience=experiences[item.experience_key],
                timeslot=slot,
                defaults={"booking_status": item.status},
            )
            booking.booking_status = item.status
            booking.cancelled_at = (
                booking.cancelled_at or now - timedelta(days=2)
                if item.status == "Cancelled"
                else None
            )
            booking.completed_at = (
                booking.completed_at or now - timedelta(days=7)
                if item.status == "Completed"
                else None
            )
            booking.full_clean()
            booking.save(update_fields=["booking_status", "cancelled_at", "completed_at"])
            if item.status in {"Approved", "Completed"}:
                slot.availability_status = "Unavailable"
                slot.save(update_fields=["availability_status"])
            result[item.key] = booking
        return result

    def _apply_reviews(self, bookings):
        for item in REVIEWS:
            booking = bookings[item.booking_key]
            review = Review.objects.filter(booking=booking).first()
            if review is None:
                review = Review(booking=booking)
            review.user = booking.user
            review.food_experience = booking.food_experience
            review.rating = item.rating
            review.comment = item.comment
            review.full_clean()
            review.save()

    def _apply_itineraries(self, users, experiences, anchor_date):
        for item in ITINERARIES:
            tourist = users[item.tourist_username]
            existing = list(Itinerary.objects.filter(user=tourist))
            if len(existing) > 1:
                raise CommandError(f"Demo tourist {tourist.username} has multiple itineraries.")
            itinerary = existing[0] if existing else Itinerary(user=tourist)
            itinerary.itinerary_name = item.name
            itinerary.full_clean()
            itinerary.save()
            for sequence, item_seed in enumerate(item.items, start=1):
                itinerary_item, _ = ItineraryItem.objects.get_or_create(
                    itinerary=itinerary,
                    food_experience=experiences[item_seed.experience_key],
                )
                itinerary_item.sequence_order = sequence
                itinerary_item.planned_date = (
                    anchor_date + timedelta(days=item_seed.day_offset)
                    if item_seed.day_offset is not None
                    else None
                )
                itinerary_item.planned_time = (
                    datetime.strptime(item_seed.planned_time, "%H:%M").time()
                    if item_seed.planned_time
                    else None
                )
                itinerary_item.full_clean()
                itinerary_item.save()

    def _assert_applied_dataset(self):
        summary = self._current_summary()
        expected = self._planned_summary()
        for key in (
            "demo_users", "demo_vendor_profiles", "demo_experiences", "demo_timeslots",
            "demo_bookings", "demo_reviews", "demo_itineraries", "demo_itinerary_items",
        ):
            if summary[key] != expected[key]:
                raise CommandError(f"Post-seed assertion failed for {key}: {summary[key]} != {expected[key]}.")
        if summary["public_demo_experiences"] != expected["public_demo_experiences"]:
            raise CommandError("Post-seed public catalogue assertion failed.")
        if summary["review_eligible_completed_bookings"] != 1:
            raise CommandError("Post-seed review eligibility assertion failed.")

    def _reset_demo_data(self):
        usernames = [item.username for item in USERS]
        expected_emails = {item.username: item.email for item in USERS}
        users = list(User.objects.filter(username__in=usernames))
        for user in users:
            if (
                user.email != expected_emails[user.username]
                or user.is_staff
                or user.is_superuser
                or not user.username.startswith(DEMO_USERNAME_PREFIX)
            ):
                raise CommandError(f"Reset refused for protected collision {user.username}.")

        before = self._current_summary()
        User.objects.filter(user_id__in=[user.user_id for user in users]).delete()

        managed_category_names = [item.name for item in CATEGORIES if item.managed]
        for category in Category.objects.filter(category_name__in=managed_category_names):
            if not category.food_experiences.exists():
                category.delete()

        managed_location_addresses = [item.address for item in LOCATIONS if item.managed]
        for location in Location.objects.filter(address__in=managed_location_addresses):
            if not location.food_experiences.exists():
                location.delete()

        after = self._current_summary()
        tracked_keys = (
            "demo_users", "demo_vendor_profiles", "managed_demo_categories", "managed_demo_locations",
            "demo_experiences", "demo_timeslots", "demo_bookings", "demo_reviews",
            "demo_itineraries", "demo_itinerary_items",
        )
        return sum(max(0, before[key] - after[key]) for key in tracked_keys)

    @staticmethod
    def _planned_summary():
        published = [item for item in EXPERIENCES if item.status == "Published"]
        completed_experiences = {item.experience_key for item in BOOKINGS if item.status == "Completed"}
        return {
            "dataset_version": DATASET_VERSION,
            "demo_users": len(USERS),
            "demo_tourists": sum(item.role == "Tourist" for item in USERS),
            "demo_vendor_users": sum(item.role == "Vendor" for item in USERS),
            "demo_vendor_profiles": len(VENDORS),
            "vendor_statuses": dict(Counter(item.approval_status for item in VENDORS)),
            "managed_demo_categories": sum(item.managed for item in CATEGORIES),
            "managed_demo_locations": sum(item.managed for item in LOCATIONS),
            "demo_experiences": len(EXPERIENCES),
            "experience_statuses": dict(Counter(item.status for item in EXPERIENCES)),
            "public_demo_experiences": len(published),
            "demo_timeslots": len(published) * 3 + len(completed_experiences),
            "demo_bookings": len(BOOKINGS),
            "booking_statuses": dict(Counter(item.status for item in BOOKINGS)),
            "demo_reviews": len(REVIEWS),
            "review_eligible_completed_bookings": 1,
            "demo_itineraries": len(ITINERARIES),
            "demo_itinerary_items": sum(len(item.items) for item in ITINERARIES),
        }

    def _current_summary(self):
        usernames = [item.username for item in USERS]
        experience_titles = [item.title for item in EXPERIENCES]
        managed_category_names = [item.name for item in CATEGORIES if item.managed]
        managed_location_addresses = [item.address for item in LOCATIONS if item.managed]
        demo_users = User.objects.filter(username__in=usernames)
        demo_experiences = FoodExperience.objects.filter(title__in=experience_titles)
        demo_bookings = Booking.objects.filter(
            user__username__in=usernames,
            food_experience__title__in=experience_titles,
        )
        demo_reviews = Review.objects.filter(booking__in=demo_bookings)
        public_demo = demo_experiences.filter(
            status="Published", vendor_profile__approval_status="Approved"
        )
        eligible = demo_bookings.filter(booking_status="Completed", review__isnull=True)
        itineraries = Itinerary.objects.filter(user__username__in=usernames)
        return {
            "dataset_version": DATASET_VERSION,
            "demo_users": demo_users.count(),
            "demo_tourists": demo_users.filter(role="Tourist").count(),
            "demo_vendor_users": demo_users.filter(role="Vendor").count(),
            "demo_vendor_profiles": VendorProfile.objects.filter(user__username__in=usernames).count(),
            "vendor_statuses": dict(Counter(
                VendorProfile.objects.filter(user__username__in=usernames).values_list("approval_status", flat=True)
            )),
            "managed_demo_categories": Category.objects.filter(category_name__in=managed_category_names).count(),
            "managed_demo_locations": Location.objects.filter(address__in=managed_location_addresses).count(),
            "demo_experiences": demo_experiences.count(),
            "experience_statuses": dict(Counter(demo_experiences.values_list("status", flat=True))),
            "public_demo_experiences": public_demo.count(),
            "mapped_public_demo_experiences": public_demo.filter(
                location__latitude__isnull=False, location__longitude__isnull=False
            ).count(),
            "demo_timeslots": TimeSlot.objects.filter(food_experience__in=demo_experiences).count(),
            "demo_bookings": demo_bookings.count(),
            "booking_statuses": dict(Counter(demo_bookings.values_list("booking_status", flat=True))),
            "demo_reviews": demo_reviews.count(),
            "review_eligible_completed_bookings": eligible.count(),
            "demo_itineraries": itineraries.count(),
            "demo_itinerary_items": ItineraryItem.objects.filter(itinerary__in=itineraries).count(),
        }

    def _write_summary(self, label):
        self.stdout.write(f"Demo dataset {label} summary:")
        self.stdout.write(json.dumps(self._current_summary(), indent=2, sort_keys=True))
