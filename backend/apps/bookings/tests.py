from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from apps.experiences.models import Category, Location, FoodExperience, TimeSlot
from apps.vendors.models import VendorProfile
from apps.bookings.models import Booking
from apps.reviews.models import Review

User = get_user_model()

class BookingAPITests(APITestCase):
    def setUp(self):
        # 1. Setup metadata
        self.category = Category.objects.create(category_name="Hawker Food")
        self.location = Location.objects.create(address="Maxwell Food Centre")

        # 2. Setup users
        self.vendor_user = User.objects.create_user(
            username="vendor_u", email="vendor@test.com", password="password123", role="Vendor"
        )
        self.vendor_profile = VendorProfile.objects.create(
            user=self.vendor_user,
            business_name="Maxwell Satay Master",
            approval_status="Approved"
        )

        self.vendor_user_2 = User.objects.create_user(
            username="vendor_u2", email="vendor2@test.com", password="password123", role="Vendor"
        )
        self.vendor_profile_2 = VendorProfile.objects.create(
            user=self.vendor_user_2,
            business_name="Maxwell Oyster Omelette Master",
            approval_status="Approved"
        )

        self.tourist_1 = User.objects.create_user(
            username="tourist_1", email="t1@test.com", password="password123", role="Tourist"
        )
        self.tourist_2 = User.objects.create_user(
            username="tourist_2", email="t2@test.com", password="password123", role="Tourist"
        )

        # 3. Setup experiences
        self.published_exp = FoodExperience.objects.create(
            vendor_profile=self.vendor_profile,
            title="Maxwell Satay Heritage",
            description="Grilling satay masterclass",
            price_sgd=25.00,
            status="Published",
            category=self.category,
            location=self.location
        )
        self.published_exp_2 = FoodExperience.objects.create(
            vendor_profile=self.vendor_profile_2,
            title="Maxwell Oyster Omelette Heritage",
            description="Omelette masterclass",
            price_sgd=20.00,
            status="Published",
            category=self.category,
            location=self.location
        )
        self.draft_exp = FoodExperience.objects.create(
            vendor_profile=self.vendor_profile,
            title="Draft Tour",
            description="Draft masterclass",
            price_sgd=15.00,
            status="Draft",
            category=self.category,
            location=self.location
        )

        # 4. Setup timeslots
        self.slot_available = TimeSlot.objects.create(
            food_experience=self.published_exp,
            slot_date="2026-08-20",
            start_time="12:00:00",
            end_time="14:00:00",
            availability_status="Available"
        )
        self.slot_unavailable = TimeSlot.objects.create(
            food_experience=self.published_exp,
            slot_date="2026-08-20",
            start_time="15:00:00",
            end_time="17:00:00",
            availability_status="Unavailable"
        )
        self.slot_draft = TimeSlot.objects.create(
            food_experience=self.draft_exp,
            slot_date="2026-08-20",
            start_time="12:00:00",
            end_time="14:00:00",
            availability_status="Available"
        )

        self.bookings_url = reverse("bookings:booking-list-create")

    def test_tourist_booking_success(self):
        """Authenticated tourist can submit a valid booking request for an available slot."""
        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "food_experience_id": self.published_exp.food_experience_id,
            "timeslot_id": self.slot_available.timeslot_id
        }
        response = self.client.post(self.bookings_url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["booking_status"], "Pending Approval")

        # Control 8: The slot availability status remains 'Available'
        self.slot_available.refresh_from_db()
        self.assertEqual(self.slot_available.availability_status, "Available")

    def test_tourist_booking_duplicate_block(self):
        """Tourist is blocked from submitting a duplicate request for the same slot."""
        # Create first booking
        Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )

        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "food_experience_id": self.published_exp.food_experience_id,
            "timeslot_id": self.slot_available.timeslot_id
        }
        response = self.client.post(self.bookings_url, data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("timeslot_id", response.data)

    def test_tourist_booking_draft_block(self):
        """Tourist is blocked from booking a Draft experience."""
        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "food_experience_id": self.draft_exp.food_experience_id,
            "timeslot_id": self.slot_draft.timeslot_id
        }
        response = self.client.post(self.bookings_url, data)
        self.assertEqual(response.status_code, 400)

    def test_tourist_booking_unavailable_slot_block(self):
        """Tourist is blocked from booking an already Unavailable slot."""
        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "food_experience_id": self.published_exp.food_experience_id,
            "timeslot_id": self.slot_unavailable.timeslot_id
        }
        response = self.client.post(self.bookings_url, data)
        self.assertEqual(response.status_code, 400)

    def test_guest_booking_unauthorized(self):
        """Unauthenticated guest cannot submit booking requests."""
        data = {
            "food_experience_id": self.published_exp.food_experience_id,
            "timeslot_id": self.slot_available.timeslot_id
        }
        response = self.client.post(self.bookings_url, data)
        self.assertEqual(response.status_code, 401)

    def test_vendor_booking_forbidden(self):
        """Vendors are forbidden from submitting booking requests."""
        self.client.force_authenticate(user=self.vendor_user)
        data = {
            "food_experience_id": self.published_exp.food_experience_id,
            "timeslot_id": self.slot_available.timeslot_id
        }
        response = self.client.post(self.bookings_url, data)
        self.assertEqual(response.status_code, 403)

    def test_tourist_fetches_own_bookings_only(self):
        """Tourist fetches only their own booking history."""
        # Booking for tourist 1
        booking_1 = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )
        # Booking for tourist 2
        booking_2 = Booking.objects.create(
            user=self.tourist_2,
            food_experience=self.published_exp,
            timeslot=self.slot_unavailable,
            booking_status="Pending Approval"
        )

        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.get(self.bookings_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["booking_id"], booking_1.booking_id)

    def test_tourist_booking_without_review_returns_empty_summary(self):
        """An unreviewed booking retains has_review and returns a null review summary."""
        booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Completed"
        )

        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.get(self.bookings_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["booking_id"], booking.booking_id)
        self.assertFalse(response.data[0]["has_review"])
        self.assertIsNone(response.data[0]["review"])

    def test_tourist_booking_with_review_returns_limited_summary(self):
        """A reviewed booking returns only the read-only review summary fields."""
        booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Completed"
        )
        review = Review.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            booking=booking,
            rating=5,
            comment="Excellent satay experience."
        )

        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.get(self.bookings_url)

        self.assertEqual(response.status_code, 200)
        payload = response.data[0]
        self.assertTrue(payload["has_review"])
        self.assertEqual(
            set(payload["review"].keys()),
            {"review_id", "rating", "comment", "created_at"}
        )
        self.assertEqual(payload["review"]["review_id"], review.review_id)
        self.assertEqual(payload["review"]["rating"], 5)
        self.assertEqual(payload["review"]["comment"], "Excellent satay experience.")

    def test_tourist_cannot_retrieve_another_tourists_review(self):
        """Tourist booking history does not expose another tourist's reviewed booking."""
        own_booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Completed"
        )
        other_booking = Booking.objects.create(
            user=self.tourist_2,
            food_experience=self.published_exp,
            timeslot=self.slot_unavailable,
            booking_status="Completed"
        )
        Review.objects.create(
            user=self.tourist_2,
            food_experience=self.published_exp,
            booking=other_booking,
            rating=4,
            comment="Another tourist's review."
        )

        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.get(self.bookings_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["booking_id"], own_booking.booking_id)
        self.assertIsNone(response.data[0]["review"])

    def test_tourist_cancellation_pending(self):
        """Tourist can cancel their own pending booking request."""
        booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )

        cancel_url = reverse("bookings:booking-cancel", kwargs={"pk": booking.booking_id})
        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, 200)

        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, "Cancelled")
        self.assertIsNotNone(booking.cancelled_at)

    def test_tourist_cancel_other_user_booking_404(self):
        """Tourist is blocked from cancelling another user's booking request."""
        booking = Booking.objects.create(
            user=self.tourist_2,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )

        cancel_url = reverse("bookings:booking-cancel", kwargs={"pk": booking.booking_id})
        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, 404)

    # Vendor approval, rejection and permission tests (FR-007)
    def test_vendor_booking_list_success(self):
        """Approved vendor gets list of bookings for their own experiences."""
        Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )
        self.client.force_authenticate(user=self.vendor_user)
        url = reverse("bookings:vendor-booking-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_different_vendor_booking_list_empty(self):
        """Vendor cannot see another vendor's booking requests."""
        Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp, # owned by vendor 1
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )
        self.client.force_authenticate(user=self.vendor_user_2)
        url = reverse("bookings:vendor-booking-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_vendor_booking_list_includes_only_own_listing_reviews(self):
        """Vendor review summaries remain constrained to bookings for owned listings."""
        own_booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Completed"
        )
        own_review = Review.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            booking=own_booking,
            rating=5,
            comment="Review for vendor one."
        )
        other_slot = TimeSlot.objects.create(
            food_experience=self.published_exp_2,
            slot_date="2026-08-21",
            start_time="12:00:00",
            end_time="14:00:00",
            availability_status="Unavailable"
        )
        other_booking = Booking.objects.create(
            user=self.tourist_2,
            food_experience=self.published_exp_2,
            timeslot=other_slot,
            booking_status="Completed"
        )
        Review.objects.create(
            user=self.tourist_2,
            food_experience=self.published_exp_2,
            booking=other_booking,
            rating=2,
            comment="Review for vendor two."
        )

        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get(reverse("bookings:vendor-booking-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["booking_id"], own_booking.booking_id)
        self.assertTrue(response.data[0]["has_review"])
        self.assertEqual(response.data[0]["review"]["review_id"], own_review.review_id)
        self.assertEqual(response.data[0]["review"]["comment"], "Review for vendor one.")

    def test_vendor_booking_approve_success(self):
        """Vendor approves pending request. Status becomes Approved, slot is Unavailable."""
        booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )
        self.client.force_authenticate(user=self.vendor_user)
        approve_url = reverse("bookings:vendor-booking-approve", kwargs={"pk": booking.booking_id})
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, 200)
        
        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, "Approved")
        self.slot_available.refresh_from_db()
        self.assertEqual(self.slot_available.availability_status, "Unavailable")

    def test_vendor_booking_approve_duplicate_slot_fail(self):
        """Approved vendor is blocked from double-approving same slot."""
        # Booking 1 approved
        booking_1 = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Approved"
        )
        self.slot_available.availability_status = "Unavailable"
        self.slot_available.save()

        # Booking 2 pending for the same slot
        booking_2 = Booking.objects.create(
            user=self.tourist_2,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )

        self.client.force_authenticate(user=self.vendor_user)
        approve_url = reverse("bookings:vendor-booking-approve", kwargs={"pk": booking_2.booking_id})
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, 400) # Only one approved booking per slot

    def test_vendor_booking_reject_success(self):
        """Vendor rejects pending request. Status is Rejected, slot remains Available."""
        booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )
        self.client.force_authenticate(user=self.vendor_user)
        reject_url = reverse("bookings:vendor-booking-reject", kwargs={"pk": booking.booking_id})
        response = self.client.post(reject_url)
        self.assertEqual(response.status_code, 200)

        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, "Rejected")
        self.slot_available.refresh_from_db()
        self.assertEqual(self.slot_available.availability_status, "Available")

    def test_vendor_booking_cancel_success(self):
        """Vendor cancels approved booking request. Status Cancelled, slot restored to Available."""
        booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp,
            timeslot=self.slot_available,
            booking_status="Approved"
        )
        self.slot_available.availability_status = "Unavailable"
        self.slot_available.save()

        self.client.force_authenticate(user=self.vendor_user)
        cancel_url = reverse("bookings:vendor-booking-cancel", kwargs={"pk": booking.booking_id})
        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, 200)

        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, "Cancelled")
        self.slot_available.refresh_from_db()
        self.assertEqual(self.slot_available.availability_status, "Available")

    def test_different_vendor_cannot_decide_booking(self):
        """A different vendor is blocked from approving another vendor's booking."""
        booking = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.published_exp, # owned by vendor 1
            timeslot=self.slot_available,
            booking_status="Pending Approval"
        )
        self.client.force_authenticate(user=self.vendor_user_2)
        approve_url = reverse("bookings:vendor-booking-approve", kwargs={"pk": booking.booking_id})
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, 404) # 404 since it's not in the scoped queryset
