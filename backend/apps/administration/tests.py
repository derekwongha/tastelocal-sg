from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.vendors.models import VendorProfile
from apps.experiences.models import Category, FoodExperience, Location, TimeSlot
from apps.bookings.models import Booking
from apps.reviews.models import Review

User = get_user_model()

class AdminAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@tastelocal.sg',
            password='password123',
            role='Administrator',
            full_name='Admin User'
        )
        self.tourist_user = User.objects.create_user(
            username='tourist_user',
            email='tourist@tastelocal.sg',
            password='password123',
            role='Tourist',
            full_name='Tourist User'
        )
        self.vendor_user = User.objects.create_user(
            username='vendor_user',
            email='vendor@tastelocal.sg',
            password='password123',
            role='Vendor',
            full_name='Vendor User'
        )
        
        # Vendor profile
        self.vendor_profile = VendorProfile.objects.create(
            user=self.vendor_user,
            business_name="Hawker Satay Master",
            description="Legendary Satay",
            contact_number="91234567",
            approval_status="Pending",
            business_address="East Coast Lagoon Hawker Centre"
        )
        
        # Predefined categories
        self.category = Category.objects.create(
            category_name="Hawker Classics",
            description="Heritage Singapore Hawker food"
        )
        
        # Location
        self.location = Location.objects.create(
            address="Singapore",
            latitude=1.3521,
            longitude=103.8198
        )
        
        # Food experience
        self.experience = FoodExperience.objects.create(
            vendor_profile=self.vendor_profile,
            category=self.category,
            location=self.location,
            title="Hawker Satay Masterclass",
            description="Learn how to grill satay",
            price_sgd=45.00,
            status="Published"
        )

        # Time Slot
        self.timeslot = TimeSlot.objects.create(
            food_experience=self.experience,
            slot_date="2026-07-15",
            start_time="10:00:00",
            end_time="12:00:00",
            availability_status="Available"
        )

        # Booking
        self.booking = Booking.objects.create(
            user=self.tourist_user,
            food_experience=self.experience,
            timeslot=self.timeslot,
            booking_status="Completed"
        )

        # Review
        self.review = Review.objects.create(
            user=self.tourist_user,
            food_experience=self.experience,
            booking=self.booking,
            rating=5,
            comment="Awesome grill tutorial!"
        )

        # URLs
        self.vendors_list_url = reverse('administration:vendor-list')
        self.vendor_approve_url = reverse('administration:vendor-approve', kwargs={'pk': self.vendor_profile.pk})
        self.vendor_reject_url = reverse('administration:vendor-reject', kwargs={'pk': self.vendor_profile.pk})
        self.category_list_url = reverse('administration:category-list-create')
        self.category_detail_url = reverse('administration:category-detail', kwargs={'pk': self.category.pk})
        self.experience_list_url = reverse('administration:experience-list')
        self.experience_deactivate_url = reverse('administration:experience-deactivate', kwargs={'pk': self.experience.pk})
        self.reviews_list_url = reverse('administration:review-list')
        self.review_detail_url = reverse('administration:review-detail', kwargs={'pk': self.review.pk})

    def test_non_admin_blocked(self):
        # Test guest access denied
        response = self.client.get(self.vendors_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test Tourist access denied
        self.client.force_authenticate(user=self.tourist_user)
        response = self.client.get(self.vendors_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test Vendor access denied
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get(self.vendors_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_view_vendors(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.vendors_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_admin_approve_vendor(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.vendor_approve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vendor_profile.refresh_from_db()
        self.assertEqual(self.vendor_profile.approval_status, 'Approved')

    def test_admin_reject_vendor(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.vendor_reject_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vendor_profile.refresh_from_db()
        self.assertEqual(self.vendor_profile.approval_status, 'Rejected')

    def test_admin_category_management(self):
        self.client.force_authenticate(user=self.admin_user)
        
        # 1. Create category
        response = self.client.post(self.category_list_url, {
            'category_name': 'Seafood Dinners',
            'description': 'Fresh local seafood experiences'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 2)

        # 2. Prevent duplicate names
        response = self.client.post(self.category_list_url, {
            'category_name': 'seafood dinners',
            'description': 'Another one'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Update category
        response = self.client.patch(self.category_detail_url, {
            'description': 'Updated description text'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertEqual(self.category.description, 'Updated description text')

    def test_category_in_use_delete_protection(self):
        self.client.force_authenticate(user=self.admin_user)
        # Attempt to delete the category that has an experience linked to it
        response = self.client.delete(self.category_detail_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot delete category because it is in use', response.data['detail'])
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())

        # Create unused category and delete it successfully
        unused_cat = Category.objects.create(category_name="Unused", description="Draft")
        url = reverse('administration:category-detail', kwargs={'pk': unused_cat.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_experience_moderation(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(self.experience_deactivate_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.experience.refresh_from_db()
        self.assertEqual(self.experience.status, 'Inactive')

    def test_review_moderation(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.review_detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Review.objects.filter(pk=self.review.pk).exists())
