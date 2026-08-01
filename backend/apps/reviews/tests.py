from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.experiences.models import FoodExperience, Category, Location, TimeSlot
from apps.vendors.models import VendorProfile
from apps.bookings.models import Booking
from apps.reviews.models import Review

User = get_user_model()

class ReviewAPITests(APITestCase):
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
            business_name="Omelette Master",
            approval_status="Approved"
        )

        self.tourist_1 = User.objects.create_user(
            username="tourist_1", email="t1@test.com", password="password123", role="Tourist"
        )
        self.tourist_2 = User.objects.create_user(
            username="tourist_2", email="t2@test.com", password="password123", role="Tourist"
        )

        # 3. Setup experience & timeslot
        self.experience = FoodExperience.objects.create(
            vendor_profile=self.vendor_profile,
            title="Maxwell Satay Heritage",
            description="Grilling satay masterclass",
            price_sgd=25.00,
            status="Published",
            category=self.category,
            location=self.location
        )
        self.timeslot = TimeSlot.objects.create(
            food_experience=self.experience,
            slot_date="2026-08-20",
            start_time="12:00:00",
            end_time="14:00:00",
            availability_status="Unavailable"
        )

        # 4. Setup bookings
        self.booking_completed = Booking.objects.create(
            user=self.tourist_1,
            food_experience=self.experience,
            timeslot=self.timeslot,
            booking_status="Completed"
        )
        self.booking_approved = Booking.objects.create(
            user=self.tourist_2,
            food_experience=self.experience,
            timeslot=self.timeslot,
            booking_status="Approved"
        )

        self.review_url = reverse("reviews:review-create")

    def test_review_creation_success(self):
        """Tourist creates review successfully for completed booking (UT-008-01)."""
        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "booking_id": self.booking_completed.booking_id,
            "rating": 5,
            "comment": "Incredible grilling experience!"
        }
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)
        
        review = Review.objects.first()
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.comment, "Incredible grilling experience!")
        self.assertEqual(review.user, self.tourist_1)
        self.assertEqual(review.food_experience, self.experience)

    def test_review_creation_incomplete_booking_block(self):
        """Tourist cannot submit review for incomplete booking status (UT-008-02)."""
        self.client.force_authenticate(user=self.tourist_2)
        data = {
            "booking_id": self.booking_approved.booking_id,
            "rating": 4,
            "comment": "Nice experience!"
        }
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("booking_id", response.data)

    def test_review_creation_different_user_booking_block(self):
        """Tourist cannot submit review for another tourist's booking (UT-008-03)."""
        self.client.force_authenticate(user=self.tourist_2)
        data = {
            "booking_id": self.booking_completed.booking_id,
            "rating": 5,
            "comment": "Trying to review someone else's booking"
        }
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_creation_duplicate_block(self):
        """Tourist is blocked from submitting duplicate reviews for the same booking (UT-008-04)."""
        # Create first review
        Review.objects.create(
            user=self.tourist_1,
            food_experience=self.experience,
            booking=self.booking_completed,
            rating=5,
            comment="First review comment"
        )

        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "booking_id": self.booking_completed.booking_id,
            "rating": 3,
            "comment": "Second review comment"
        }
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vendor_role_blocked_from_reviews(self):
        """Vendors are blocked from submitting reviews (UT-008-05)."""
        self.client.force_authenticate(user=self.vendor_user)
        data = {
            "booking_id": self.booking_completed.booking_id,
            "rating": 5,
            "comment": "Vendor comment"
        }
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_validate_rating_bounds(self):
        """Validate rating bounds are within 1 to 5 (UT-008-06)."""
        self.client.force_authenticate(user=self.tourist_1)
        # Rating = 6
        data = {
            "booking_id": self.booking_completed.booking_id,
            "rating": 6,
            "comment": "Very high rating"
        }
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rating", response.data)

        # Rating = 0
        data["rating"] = 0
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validate_comment_blank(self):
        """Validate comment cannot be empty or whitespace only (Control 10)."""
        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "booking_id": self.booking_completed.booking_id,
            "rating": 4,
            "comment": "   "
        }
        response = self.client.post(self.review_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("comment", response.data)

    def test_vendor_complete_booking_success(self):
        """Vendor completes approved booking successfully (Control 15)."""
        self.client.force_authenticate(user=self.vendor_user)
        complete_url = reverse("bookings:vendor-booking-complete", kwargs={"pk": self.booking_approved.booking_id})
        response = self.client.post(complete_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking_approved.refresh_from_db()
        self.assertEqual(self.booking_approved.booking_status, "Completed")
        self.assertIsNotNone(self.booking_approved.completed_at)

    def test_different_vendor_cannot_complete_booking(self):
        """A different vendor is blocked from completing another vendor's booking (Control 15)."""
        self.client.force_authenticate(user=self.vendor_user_2)
        complete_url = reverse("bookings:vendor-booking-complete", kwargs={"pk": self.booking_approved.booking_id})
        response = self.client.post(complete_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
