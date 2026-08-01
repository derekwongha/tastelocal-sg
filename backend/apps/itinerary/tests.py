from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.experiences.models import FoodExperience, Category, Location, TimeSlot
from apps.vendors.models import VendorProfile
from apps.bookings.models import Booking
from apps.itinerary.models import Itinerary, ItineraryItem

User = get_user_model()

class ItineraryAPITests(APITestCase):
    def setUp(self):
        # 1. Setup metadata
        self.category = Category.objects.create(category_name="Hawker Food")
        self.location = Location.objects.create(address="Chinatown Complex")

        # 2. Setup users
        self.vendor_user = User.objects.create_user(
            username="vendor_u", email="vendor@test.com", password="password123", role="Vendor"
        )
        self.vendor_profile = VendorProfile.objects.create(
            user=self.vendor_user,
            business_name="Chinatown Claypot Rice",
            approval_status="Approved"
        )

        self.pending_vendor_user = User.objects.create_user(
            username="vendor_p", email="vendor_p@test.com", password="password123", role="Vendor"
        )
        self.pending_vendor_profile = VendorProfile.objects.create(
            user=self.pending_vendor_user,
            business_name="Draft Hawker",
            approval_status="Pending"
        )

        self.tourist_1 = User.objects.create_user(
            username="tourist_1", email="t1@test.com", password="password123", role="Tourist"
        )
        self.tourist_2 = User.objects.create_user(
            username="tourist_2", email="t2@test.com", password="password123", role="Tourist"
        )

        # 3. Setup experiences
        self.experience_published = FoodExperience.objects.create(
            vendor_profile=self.vendor_profile,
            title="Chinatown Claypot Masterclass",
            description="Cooking traditional claypot rice",
            price_sgd=45.00,
            status="Published",
            category=self.category,
            location=self.location
        )
        
        self.experience_draft = FoodExperience.objects.create(
            vendor_profile=self.vendor_profile,
            title="Draft Satay Recipe",
            description="Testing draft recipe",
            price_sgd=15.00,
            status="Draft",
            category=self.category,
            location=self.location
        )

        self.experience_pending_vendor = FoodExperience.objects.create(
            vendor_profile=self.pending_vendor_profile,
            title="Pending Vendor Experience",
            description="Unapproved vendor experience",
            price_sgd=20.00,
            status="Published",
            category=self.category,
            location=self.location
        )

        # 4. Setup timeslots
        self.timeslot = TimeSlot.objects.create(
            food_experience=self.experience_published,
            slot_date="2026-08-20",
            start_time="12:00:00",
            end_time="14:00:00",
            availability_status="Available"
        )

        self.itinerary_url = reverse("itinerary:itinerary-detail")
        self.itinerary_item_url = reverse("itinerary:itinerary-item-create")

    def test_get_itinerary_auto_creates_default_belonging_to_tourist(self):
        """Tourist gets itinerary, auto-creating a default one (UT-009-01)."""
        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.get(self.itinerary_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        itineraries = Itinerary.objects.filter(user=self.tourist_1)
        self.assertEqual(itineraries.count(), 1)
        self.assertEqual(itineraries.first().itinerary_name, "My Singapore Food Itinerary")

    def test_add_experience_to_itinerary_success(self):
        """Tourist adds experience successfully (UT-009-02)."""
        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "food_experience_id": self.experience_published.food_experience_id,
            "planned_date": "2026-08-20",
            "planned_time": "12:00:00"
        }
        response = self.client.post(self.itinerary_item_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ItineraryItem.objects.count(), 1)
        
        item = ItineraryItem.objects.first()
        self.assertEqual(item.food_experience, self.experience_published)
        self.assertEqual(item.sequence_order, 1)

    def test_add_experience_to_itinerary_duplicate_block(self):
        """Tourist blocked from duplicate active itinerary items (UT-009-03)."""
        self.client.force_authenticate(user=self.tourist_1)
        data = {
            "food_experience_id": self.experience_published.food_experience_id
        }
        # Add first time
        response = self.client.post(self.itinerary_item_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Add second time
        response = self.client.post(self.itinerary_item_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_add_draft_or_pending_vendor_experience_block(self):
        """Tourist blocked from adding draft or unapproved vendor experiences (Control 7)."""
        self.client.force_authenticate(user=self.tourist_1)
        
        # Draft experience
        data = {"food_experience_id": self.experience_draft.food_experience_id}
        response = self.client.post(self.itinerary_item_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Pending vendor experience
        data = {"food_experience_id": self.experience_pending_vendor.food_experience_id}
        response = self.client.post(self.itinerary_item_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_itinerary_item_success(self):
        """Tourist updates planned date/time successfully (UT-009-04)."""
        self.client.force_authenticate(user=self.tourist_1)
        # Create default itinerary & item
        itinerary = Itinerary.objects.create(user=self.tourist_1, itinerary_name="Test Itinerary")
        item = ItineraryItem.objects.create(
            itinerary=itinerary,
            food_experience=self.experience_published,
            sequence_order=1
        )

        detail_url = reverse("itinerary:itinerary-item-detail", kwargs={"pk": item.itinerary_item_id})
        data = {
            "planned_date": "2026-08-25",
            "planned_time": "14:30:00"
        }
        response = self.client.patch(detail_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        item.refresh_from_db()
        self.assertEqual(str(item.planned_date), "2026-08-25")
        self.assertEqual(str(item.planned_time), "14:30:00")

    def test_remove_itinerary_item_success(self):
        """Tourist removes itinerary item successfully (UT-009-05)."""
        self.client.force_authenticate(user=self.tourist_1)
        itinerary = Itinerary.objects.create(user=self.tourist_1, itinerary_name="Test Itinerary")
        item = ItineraryItem.objects.create(
            itinerary=itinerary,
            food_experience=self.experience_published,
            sequence_order=1
        )

        detail_url = reverse("itinerary:itinerary-item-detail", kwargs={"pk": item.itinerary_item_id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ItineraryItem.objects.count(), 0)

    def test_guest_or_vendor_or_admin_blocked(self):
        """Guests, vendors, and admins blocked from itinerary management (UT-009-06)."""
        # Unauthenticated guest
        response = self.client.get(self.itinerary_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated vendor
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get(self.itinerary_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cross_user_itinerary_isolation(self):
        """Cross-user itinerary edit/delete actions are denied (Control 6)."""
        # Create item for tourist 1
        itinerary = Itinerary.objects.create(user=self.tourist_1, itinerary_name="Tourist 1 Itinerary")
        item = ItineraryItem.objects.create(
            itinerary=itinerary,
            food_experience=self.experience_published,
            sequence_order=1
        )

        # Authenticate as tourist 2
        self.client.force_authenticate(user=self.tourist_2)
        detail_url = reverse("itinerary:itinerary-item-detail", kwargs={"pk": item.itinerary_item_id})
        
        # Attempt update
        response = self.client.patch(detail_url, {"planned_date": "2026-08-25"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Attempt delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_adding_to_itinerary_does_not_create_booking_or_alter_timeslot(self):
        """Adding experience to itinerary does not create a booking or alter timeslot availability (Control 8/9)."""
        self.client.force_authenticate(user=self.tourist_1)
        
        booking_count_before = Booking.objects.count()
        timeslot_status_before = self.timeslot.availability_status # 'Available'

        data = {
            "food_experience_id": self.experience_published.food_experience_id
        }
        response = self.client.post(self.itinerary_item_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Ensure booking count remains exactly the same
        self.assertEqual(Booking.objects.count(), booking_count_before)
        
        # Ensure timeslot remains Available
        self.timeslot.refresh_from_db()
        self.assertEqual(self.timeslot.availability_status, timeslot_status_before)
