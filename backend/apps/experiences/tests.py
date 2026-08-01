import json
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from apps.vendors.models import VendorProfile
from apps.experiences.models import FoodExperience, Category, Location, TimeSlot

User = get_user_model()

class ExperiencesAPITests(APITestCase):

    def setUp(self):
        self.public_list_url = reverse('experiences:public_list')

        # 1. Seed categories and locations
        self.category = Category.objects.create(category_name='Hawker Food', description='Hawker eats')
        self.location = Location.objects.create(address='Chinatown, Singapore')

        # 2. Seed Approved Vendor
        self.vendor_user_app = User.objects.create(
            username='vendor_app',
            email='app@vendor.sg',
            role='Vendor'
        )
        self.profile_app = VendorProfile.objects.create(
            user=self.vendor_user_app,
            business_name='Approved Satay',
            approval_status='Approved'
        )

        # 3. Seed Pending Vendor
        self.vendor_user_pend = User.objects.create(
            username='vendor_pend',
            email='pend@vendor.sg',
            role='Vendor'
        )
        self.profile_pend = VendorProfile.objects.create(
            user=self.vendor_user_pend,
            business_name='Pending Satay',
            approval_status='Pending'
        )

        # 4. Create FoodExperiences
        self.exp_published_approved = FoodExperience.objects.create(
            title='Satay Skewers Approved',
            vendor_profile=self.profile_app,
            category=self.category,
            location=self.location,
            description='Sample Satay.',
            price_sgd=15.00,
            status='Published'
        )

        self.exp_draft_approved = FoodExperience.objects.create(
            title='Satay Skewers Draft',
            vendor_profile=self.profile_app,
            category=self.category,
            location=self.location,
            description='Draft Satay.',
            price_sgd=25.00,
            status='Draft'
        )

        self.exp_published_pending = FoodExperience.objects.create(
            title='Curry House Pending',
            vendor_profile=self.profile_pend,
            category=self.category,
            location=self.location,
            description='Curry.',
            price_sgd=55.00,
            status='Published'
        )

    def test_public_browse_experiences_list_success(self):
        response = self.client.get(self.public_list_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify that only the published experience owned by approved vendor is returned
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Satay Skewers Approved')
        self.assertEqual(response.data[0]['vendor_profile']['business_name'], 'Approved Satay')

    def test_public_browse_excludes_draftings_and_pending_vendors(self):
        response = self.client.get(self.public_list_url, format='json')
        # Check titles to confirm exclusion
        titles = [item['title'] for item in response.data]
        self.assertNotIn('Satay Skewers Draft', titles)
        self.assertNotIn('Curry House Pending', titles)

    def test_public_experience_detail_success(self):
        url = reverse('experiences:public_detail', kwargs={'pk': self.exp_published_approved.food_experience_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Satay Skewers Approved')
        self.assertIn('timeslots', response.data)
        self.assertIn('reviews', response.data)

    def test_public_experience_detail_not_found(self):
        url = reverse('experiences:public_detail', kwargs={'pk': 99999})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_experience_detail_excludes_draft_and_pending_vendors(self):
        # Excludes Draft experience owned by approved vendor
        url_draft = reverse('experiences:public_detail', kwargs={'pk': self.exp_draft_approved.food_experience_id})
        response_draft = self.client.get(url_draft, format='json')
        self.assertEqual(response_draft.status_code, status.HTTP_404_NOT_FOUND)

        # Excludes Published experience owned by pending vendor
        url_pend = reverse('experiences:public_detail', kwargs={'pk': self.exp_published_pending.food_experience_id})
        response_pend = self.client.get(url_pend, format='json')
        self.assertEqual(response_pend.status_code, status.HTTP_404_NOT_FOUND)

    def test_search_by_keyword(self):
        # Keyword matches title
        response = self.client.get(self.public_list_url, {'q': 'Satay'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Satay Skewers Approved')

        # Keyword matches description
        response = self.client.get(self.public_list_url, {'q': 'Sample'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Keyword does not match
        response = self.client.get(self.public_list_url, {'q': 'Waffles'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_category(self):
        # Correct category
        response = self.client.get(self.public_list_url, {'category': self.category.category_id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Non-matching category ID
        response = self.client.get(self.public_list_url, {'category': 999}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Invalid category type
        response = self.client.get(self.public_list_url, {'category': 'invalid'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_location(self):
        # Correct location
        response = self.client.get(self.public_list_url, {'location': self.location.location_id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Non-matching location
        response = self.client.get(self.public_list_url, {'location': 999}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Invalid location type
        response = self.client.get(self.public_list_url, {'location': 'invalid'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_price_bounds(self):
        # Within bounds
        response = self.client.get(self.public_list_url, {'min_price': '10.00', 'max_price': '20.00'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Price below min_price
        response = self.client.get(self.public_list_url, {'min_price': '20.00'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Price above max_price
        response = self.client.get(self.public_list_url, {'max_price': '10.00'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Invalid price type
        response = self.client.get(self.public_list_url, {'min_price': 'abc'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_metadata_dropdown_endpoints(self):
        categories_url = reverse('experiences:category_list')
        locations_url = reverse('experiences:location_list')

        # Categories list retrieve
        response = self.client.get(categories_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

        # Locations list retrieve
        response = self.client.get(locations_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

class VendorExperiencesAPITests(APITestCase):

    def setUp(self):
        self.vendor_list_url = reverse('experiences:vendor_list_create')
        
        # Seed category and location
        self.category = Category.objects.create(category_name='Hawker Food', description='Hawker eats')
        self.location = Location.objects.create(address='Chinatown, Singapore')
        
        # 1. Create Approved Vendor
        self.vendor_approved_user = User.objects.create_user(
            username='vendor_app_test',
            email='app_test@vendor.sg',
            password='password123',
            role='Vendor'
        )
        self.profile_approved = VendorProfile.objects.create(
            user=self.vendor_approved_user,
            business_name='Approved Hawker Stall',
            approval_status='Approved'
        )
        self.token_approved = str(RefreshToken.for_user(self.vendor_approved_user).access_token)

        # 2. Create another Approved Vendor to test isolation
        self.other_vendor_user = User.objects.create_user(
            username='vendor_other_test',
            email='other_test@vendor.sg',
            password='password123',
            role='Vendor'
        )
        self.profile_other = VendorProfile.objects.create(
            user=self.other_vendor_user,
            business_name='Other Hawker Stall',
            approval_status='Approved'
        )
        self.token_other = str(RefreshToken.for_user(self.other_vendor_user).access_token)

        # 3. Create Pending Vendor
        self.vendor_pending_user = User.objects.create_user(
            username='vendor_pend_test',
            email='pend_test@vendor.sg',
            password='password123',
            role='Vendor'
        )
        self.profile_pending = VendorProfile.objects.create(
            user=self.vendor_pending_user,
            business_name='Pending Hawker Stall',
            approval_status='Pending'
        )
        self.token_pending = str(RefreshToken.for_user(self.vendor_pending_user).access_token)

        # 4. Create Tourist User
        self.tourist_user = User.objects.create_user(
            username='tourist_test',
            email='tourist_test@tourist.sg',
            password='password123',
            role='Tourist'
        )
        self.token_tourist = str(RefreshToken.for_user(self.tourist_user).access_token)

    def test_approved_vendor_list_own_experiences_success(self):
        # Create an experience for vendor_approved
        exp = FoodExperience.objects.create(
            title='Vendor Approved Satay',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            description='Good Satay',
            price_sgd=12.50,
            status='Draft'
        )
        # Create an experience for other vendor
        FoodExperience.objects.create(
            title='Other Vendor Curry',
            vendor_profile=self.profile_other,
            category=self.category,
            location=self.location,
            description='Good Curry',
            price_sgd=22.00,
            status='Draft'
        )

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        response = self.client.get(self.vendor_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return self.profile_approved's listing
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Vendor Approved Satay')

    def test_approved_vendor_create_draft_success(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        data = {
            'title': 'New Hawker Satay',
            'description': 'Delicious Satay skewers',
            'price_sgd': '15.00',
            'status': 'Draft',
            'category_id': self.category.category_id,
            'location_id': self.location.location_id
        }
        response = self.client.post(self.vendor_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FoodExperience.objects.filter(title='New Hawker Satay').count(), 1)
        
        # Verify automatic vendor assignment
        exp = FoodExperience.objects.get(title='New Hawker Satay')
        self.assertEqual(exp.vendor_profile, self.profile_approved)

    def test_approved_vendor_create_published_blocked_without_slots(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        data = {
            'title': 'Direct Published Satay',
            'description': 'Skewers',
            'price_sgd': '15.00',
            'status': 'Published',
            'category_id': self.category.category_id,
            'location_id': self.location.location_id
        }
        response = self.client.post(self.vendor_list_url, data, format='json')
        # Blocked because it's new and has no timeslots (Rule 8)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', response.data)

    def test_approved_vendor_publish_without_slots_blocked(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        # Create draft listing
        exp = FoodExperience.objects.create(
            title='Draft Experience',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            description='Draft Description',
            price_sgd=10.00,
            status='Draft'
        )
        url = reverse('experiences:vendor_detail_update_delete', kwargs={'pk': exp.food_experience_id})
        
        # Try to publish without slot
        response = self.client.patch(url, {'status': 'Published'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approved_vendor_publish_with_slots_success(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        exp = FoodExperience.objects.create(
            title='Draft Experience 2',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            description='Draft Description',
            price_sgd=10.00,
            status='Draft'
        )
        # Add a slot
        from datetime import date, time
        TimeSlot.objects.create(
            food_experience=exp,
            slot_date=date.today(),
            start_time=time(14, 0),
            end_time=time(16, 0),
            availability_status='Available'
        )
        url = reverse('experiences:vendor_detail_update_delete', kwargs={'pk': exp.food_experience_id})
        
        # Try to publish now that slot exists
        response = self.client.patch(url, {'status': 'Published'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        exp.refresh_from_db()
        self.assertEqual(exp.status, 'Published')

    def test_approved_vendor_create_invalid_price(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        data = {
            'title': 'New Hawker Satay',
            'description': 'Delicious Satay skewers',
            'price_sgd': '-2.50',
            'status': 'Draft',
            'category_id': self.category.category_id,
            'location_id': self.location.location_id
        }
        response = self.client.post(self.vendor_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price_sgd', response.data)

        # Test zero price (Rule 9)
        data['price_sgd'] = '0.00'
        response = self.client.post(self.vendor_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approved_vendor_update_other_vendor_listing_denied(self):
        # Create other vendor's listing
        other_exp = FoodExperience.objects.create(
            title='Other Vendor Curry',
            vendor_profile=self.profile_other,
            category=self.category,
            location=self.location,
            description='Good Curry',
            price_sgd=22.00,
            status='Draft'
        )
        url = reverse('experiences:vendor_detail_update_delete', kwargs={'pk': other_exp.food_experience_id})

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        # Try to edit it
        response = self.client.patch(url, {'title': 'Hacked title'}, format='json')
        # Scoped queryset returns 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_approved_vendor_delete_listing_soft_delete(self):
        exp = FoodExperience.objects.create(
            title='Delete Me',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            description='To be deleted',
            price_sgd=10.00,
            status='Draft'
        )
        url = reverse('experiences:vendor_detail_update_delete', kwargs={'pk': exp.food_experience_id})

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify it was soft-deleted (status = Inactive), not hard-deleted
        exp.refresh_from_db()
        self.assertEqual(exp.status, 'Inactive')

    def test_pending_vendor_cannot_manage_listings(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_pending)
        response = self.client.get(self.vendor_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tourist_cannot_manage_listings(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_tourist)
        response = self.client.get(self.vendor_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approved_vendor_create_timeslot_success(self):
        exp = FoodExperience.objects.create(
            title='Own Experience',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            description='Own Experience Description',
            price_sgd=10.00,
            status='Draft'
        )
        url = reverse('experiences:vendor_timeslot_create')
        data = {
            'food_experience': exp.food_experience_id,
            'slot_date': '2027-10-10', # future date
            'start_time': '14:00:00',
            'end_time': '16:00:00'
        }
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TimeSlot.objects.filter(food_experience=exp).count(), 1)

    def test_approved_vendor_create_timeslot_for_other_vendor_listing_denied(self):
        other_exp = FoodExperience.objects.create(
            title='Other Vendor Curry',
            vendor_profile=self.profile_other,
            category=self.category,
            location=self.location,
            description='Good Curry',
            price_sgd=22.00,
            status='Draft'
        )
        url = reverse('experiences:vendor_timeslot_create')
        data = {
            'food_experience': other_exp.food_experience_id,
            'slot_date': '2027-10-10',
            'start_time': '14:00:00',
            'end_time': '16:00:00'
        }
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('food_experience', response.data)

    def test_approved_vendor_delete_timeslot_success(self):
        exp = FoodExperience.objects.create(
            title='Own Experience',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            description='Own Description',
            price_sgd=10.00,
            status='Draft'
        )
        from datetime import date, time
        slot = TimeSlot.objects.create(
            food_experience=exp,
            slot_date=date.today(),
            start_time=time(14, 0),
            end_time=time(16, 0),
            availability_status='Available'
        )
        url = reverse('experiences:vendor_timeslot_delete', kwargs={'pk': slot.timeslot_id})

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_approved)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(TimeSlot.objects.filter(timeslot_id=slot.timeslot_id).count(), 0)

    def test_public_serializer_includes_coordinates(self):
        """Verify that the public experience serializer outputs location coordinates (UT-011-01)."""
        self.location.latitude = 1.280123
        self.location.longitude = 103.850456
        self.location.save()

        exp = FoodExperience.objects.create(
            title='Test coordinates serializing',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            price_sgd=15.00,
            status='Published'
        )

        url = reverse('experiences:public_detail', kwargs={'pk': exp.food_experience_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        location_data = response.data.get('location')
        self.assertIsNotNone(location_data)
        self.assertEqual(float(location_data.get('latitude')), 1.280123)
        self.assertEqual(float(location_data.get('longitude')), 103.850456)


from unittest.mock import patch, MagicMock

class AIRecommendationsAPITests(APITestCase):

    def setUp(self):
        self.recommend_url = reverse('experiences:ai_recommendations')
        self.category = Category.objects.create(category_name='Noodles', description='Warm broth')
        self.location = Location.objects.create(address='Geylang, Singapore')

        # Seed approved vendor
        self.vendor_approved = User.objects.create_user(
            username='vendor_approved_ai',
            email='ai_app@vendor.sg',
            password='password123',
            role='Vendor'
        )
        self.profile_approved = VendorProfile.objects.create(
            user=self.vendor_approved,
            business_name='Approved AI vendor',
            approval_status='Approved'
        )

        # Seed unapproved/pending vendor
        self.vendor_pending = User.objects.create_user(
            username='vendor_pending_ai',
            email='ai_pend@vendor.sg',
            password='password123',
            role='Vendor'
        )
        self.profile_pending = VendorProfile.objects.create(
            user=self.vendor_pending,
            business_name='Pending AI vendor',
            approval_status='Pending'
        )
        self.vendor_rejected = User.objects.create_user(
            username='vendor_rejected_ai',
            email='ai_rejected@vendor.sg',
            password='password123',
            role='Vendor'
        )
        self.profile_rejected = VendorProfile.objects.create(
            user=self.vendor_rejected,
            business_name='Rejected AI vendor',
            approval_status='Rejected'
        )

        # Approved/Published Experience
        self.exp_approved_published = FoodExperience.objects.create(
            title='Laksa Approved Published',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            price_sgd=8.50,
            status='Published'
        )

        self.exp_satay = FoodExperience.objects.create(
            title='Charcoal Satay Tasting',
            description='Smoky skewers with peanut sauce.',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            price_sgd=15.00,
            status='Published'
        )
        self.exp_chicken_rice = FoodExperience.objects.create(
            title='Hainanese Chicken Rice Tasting',
            description='Poached chicken with fragrant rice.',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            price_sgd=18.00,
            status='Published'
        )

        # Draft Experience
        self.exp_draft = FoodExperience.objects.create(
            title='Draft Noodles',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            price_sgd=10.00,
            status='Draft'
        )

        # Pending Vendor Experience
        self.exp_pending_vendor = FoodExperience.objects.create(
            title='Pending Vendor Satay',
            vendor_profile=self.profile_pending,
            category=self.category,
            location=self.location,
            price_sgd=9.00,
            status='Published'
        )

        self.exp_inactive = FoodExperience.objects.create(
            title='Inactive Satay Listing',
            description='Must never appear in public fallback.',
            vendor_profile=self.profile_approved,
            category=self.category,
            location=self.location,
            price_sgd=11.00,
            status='Inactive'
        )
        self.exp_rejected_vendor = FoodExperience.objects.create(
            title='Rejected Vendor Satay',
            description='Must never appear in public fallback.',
            vendor_profile=self.profile_rejected,
            category=self.category,
            location=self.location,
            price_sgd=12.00,
            status='Published'
        )

    def test_empty_query_rejected_http_400(self):
        """Verify that empty preference query is rejected with HTTP 400 and no Gemini API call (UT-012-01)."""
        response = self.client.post(self.recommend_url, {'query': '   '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('craving query is required', response.data.get('detail', ''))

    @patch('os.getenv')
    def test_missing_api_key_returns_fallback_http_200(self, mock_getenv):
        """Verify that missing GEMINI_API_KEY returns fallback recommendations with HTTP 200 (UT-012-02)."""
        mock_getenv.return_value = None
        response = self.client.post(self.recommend_url, {'query': 'laksa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_fallback'))
        self.assertIn('ranked', response.data.get('explanation'))
        recs = response.data.get('recommendations', [])
        self.assertTrue(len(recs) > 0)
        titles = [r['title'] for r in recs]
        self.assertIn('Laksa Approved Published', titles)
        self.assertNotIn('Draft Noodles', titles)
        self.assertNotIn('Pending Vendor Satay', titles)

    @patch('os.getenv')
    def test_missing_key_fallback_is_query_aware_for_seeded_food_terms(self, mock_getenv):
        mock_getenv.return_value = None
        expectations = (
            ('I want to eat satay', 'Charcoal Satay Tasting'),
            ('I want to eat chicken rice', 'Hainanese Chicken Rice Tasting'),
            ('I want to eat laksa', 'Laksa Approved Published'),
        )
        for query, expected_title in expectations:
            with self.subTest(query=query):
                response = self.client.post(self.recommend_url, {'query': query}, format='json')
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertTrue(response.data.get('is_fallback'))
                titles = [item['title'] for item in response.data.get('recommendations', [])]
                self.assertIn(expected_title, titles)
                if 'chicken rice' in query:
                    self.assertTrue(all('Chicken Rice' in title for title in titles))

    @patch('os.getenv')
    def test_no_meaningful_match_uses_safe_generic_public_fallback(self, mock_getenv):
        mock_getenv.return_value = None
        response = self.client.post(
            self.recommend_url,
            {'query': 'quantum mooncake telescope'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_fallback'))
        self.assertIn('no direct catalogue match', response.data.get('explanation'))
        self.assertGreater(len(response.data.get('recommendations', [])), 0)

    @patch('urllib.request.urlopen')
    @patch('os.getenv')
    def test_gemini_timeout_returns_fallback_safely(self, mock_getenv, mock_urlopen):
        """Verify that Gemini request timeout returns fallback list safely (UT-012-03)."""
        mock_getenv.return_value = 'some_key'
        mock_urlopen.side_effect = Exception("Timeout calling Generative Language API")
        response = self.client.post(self.recommend_url, {'query': 'laksa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_fallback'))
        titles = [item['title'] for item in response.data.get('recommendations', [])]
        self.assertIn('Laksa Approved Published', titles)

    @patch('urllib.request.urlopen')
    @patch('os.getenv')
    def test_malformed_gemini_response_returns_fallback(self, mock_getenv, mock_urlopen):
        """Verify that malformed Gemini JSON payload response returns fallback safely (UT-012-04)."""
        mock_getenv.return_value = 'some_key'
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"candidates": [{"content": {"parts": [{"text": "invalid-json"}]}}]}'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        response = self.client.post(self.recommend_url, {'query': 'laksa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_fallback'))

    @patch('urllib.request.urlopen')
    @patch('os.getenv')
    def test_gemini_ids_validated_against_database_records(self, mock_getenv, mock_urlopen):
        """Verify that recommended IDs from Gemini are matched back to database records (UT-012-05)."""
        mock_getenv.return_value = 'some_key'
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps({
                            "recommended_ids": [self.exp_approved_published.food_experience_id, 999],
                            "explanation": "Matching experiences found."
                        })
                    }]
                }
            }]
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        response = self.client.post(self.recommend_url, {'query': 'laksa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get('is_fallback'))
        self.assertEqual(response.data.get('explanation'), "Matching experiences found.")
        recs = response.data.get('recommendations', [])
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]['food_experience_id'], self.exp_approved_published.food_experience_id)

    @patch('urllib.request.urlopen')
    @patch('os.getenv')
    def test_exclusion_of_unapproved_vendor_or_draft_listings(self, mock_getenv, mock_urlopen):
        """Verify that unapproved vendor or draft listings are excluded from final recommendations (UT-012-06)."""
        mock_getenv.return_value = 'some_key'
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps({
                            "recommended_ids": [self.exp_draft.food_experience_id, self.exp_pending_vendor.food_experience_id],
                            "explanation": "These drafts match."
                        })
                    }]
                }
            }]
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        response = self.client.post(self.recommend_url, {'query': 'laksa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_fallback'))
        recs = response.data.get('recommendations', [])
        ids = [r['food_experience_id'] for r in recs]
        self.assertNotIn(self.exp_draft.food_experience_id, ids)
        self.assertNotIn(self.exp_pending_vendor.food_experience_id, ids)
        self.assertNotIn(self.exp_inactive.food_experience_id, ids)
        self.assertNotIn(self.exp_rejected_vendor.food_experience_id, ids)

    @patch('urllib.request.urlopen')
    @patch('os.getenv')
    def test_api_key_not_exposed_to_frontend_responses(self, mock_getenv, mock_urlopen):
        """Verify that GEMINI_API_KEY value is not exposed in frontend responses (UT-012-07)."""
        mock_getenv.return_value = 'super-secret-gemini-api-key-value'
        mock_urlopen.side_effect = Exception('Controlled Gemini failure')
        response = self.client.post(self.recommend_url, {'query': 'laksa'}, format='json')
        response_str = json.dumps(response.data)
        self.assertNotIn('super-secret-gemini-api-key-value', response_str)
