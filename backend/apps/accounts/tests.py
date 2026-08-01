from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.vendors.models import VendorProfile


User = get_user_model()


class AccountsAPITests(APITestCase):

    def setUp(self):
        self.tourist_register_url = reverse('accounts:register_tourist')
        self.vendor_register_url = reverse('accounts:register_vendor')
        self.login_url = reverse('accounts:login')
        self.logout_url = reverse('accounts:logout')
        self.refresh_url = reverse('accounts:token_refresh')
        self.profile_url = reverse('accounts:profile')

        self.tourist_data = {
            'username': 'tourist_test',
            'email': 'tourist@tastelocal.sg',
            'full_name': 'Test Tourist',
            'password': 'password123',
            'password_confirm': 'password123',
        }

    def register_tourist(self):
        return self.client.post(
            self.tourist_register_url,
            self.tourist_data,
            format='json',
        )

    def authenticate_with_access(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def jwt_for(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token), str(refresh)

    def test_tourist_registration_returns_jwt_pair(self):
        response = self.register_tourist()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotIn('token', response.data)
        self.assertEqual(response.data['user']['role'], 'Tourist')
        self.assertEqual(response.data['user']['account_status'], 'Active')

    def test_vendor_registration_returns_jwt_pair_with_pending_status(self):
        vendor_data = {
            'username': 'vendor_test',
            'email': 'vendor@tastelocal.sg',
            'full_name': 'Test Vendor',
            'password': 'password123',
            'password_confirm': 'password123',
            'business_name': 'Authentic Satay Club',
            'description': 'Delicious local satay since 1990.',
            'contact_number': '+65 9123 4567',
            'business_address': 'Lau Pa Sat Stall 10, Singapore',
        }

        response = self.client.post(self.vendor_register_url, vendor_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotIn('token', response.data)
        self.assertEqual(response.data['user']['role'], 'Vendor')
        self.assertEqual(response.data['vendor_profile']['approval_status'], 'Pending')

        user = User.objects.get(username='vendor_test')
        profile = VendorProfile.objects.get(user=user)
        self.assertEqual(profile.approval_status, 'Pending')
        self.assertEqual(profile.business_name, 'Authentic Satay Club')

    def test_duplicate_registration_details_rejection(self):
        self.register_tourist()
        duplicate_data = self.tourist_data.copy()
        duplicate_data['email'] = 'different@tastelocal.sg'

        response = self.client.post(
            self.tourist_register_url,
            duplicate_data,
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_login_returns_jwt_pair(self):
        self.register_tourist()

        response = self.client.post(
            self.login_url,
            {'username': 'tourist_test', 'password': 'password123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'tourist_test')

    def test_login_invalid_credentials_fails_safely(self):
        self.register_tourist()

        response = self.client.post(
            self.login_url,
            {'username': 'tourist_test', 'password': 'wrongpassword'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)

    def test_profile_accepts_bearer_access_token(self):
        registration = self.register_tourist()
        self.authenticate_with_access(registration.data['access'])

        response = self.client.get(self.profile_url, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'tourist_test')

    def test_guest_profile_access_is_rejected(self):
        response = self.client.get(self.profile_url, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_access_token_is_rejected(self):
        self.register_tourist()
        user = User.objects.get(username='tourist_test')
        access = RefreshToken.for_user(user).access_token
        access.set_exp(lifetime=timedelta(seconds=-1))
        self.authenticate_with_access(str(access))

        response = self.client.get(self.profile_url, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_tokens_and_blacklists_previous_refresh(self):
        registration = self.register_tourist()
        original_refresh = registration.data['refresh']

        response = self.client.post(
            self.refresh_url,
            {'refresh': original_refresh},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotEqual(response.data['refresh'], original_refresh)
        self.assertEqual(BlacklistedToken.objects.count(), 1)

        reused = self.client.post(
            self.refresh_url,
            {'refresh': original_refresh},
            format='json',
        )
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        registration = self.register_tourist()
        self.authenticate_with_access(registration.data['access'])

        response = self.client.post(
            self.logout_url,
            {'refresh': registration.data['refresh']},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(BlacklistedToken.objects.count(), 1)

        self.client.credentials()
        reused = self.client.post(
            self.refresh_url,
            {'refresh': registration.data['refresh']},
            format='json',
        )
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_logout_requires_refresh_token(self):
        registration = self.register_tourist()
        self.authenticate_with_access(registration.data['access'])

        response = self.client.post(self.logout_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('refresh', response.data)

    def test_logout_rejects_another_users_refresh_token(self):
        registration = self.register_tourist()
        another_user = User.objects.create_user(
            username='another_tourist',
            email='another@tastelocal.sg',
            full_name='Another Tourist',
            password='password123',
            role='Tourist',
        )
        another_refresh = str(RefreshToken.for_user(another_user))
        self.authenticate_with_access(registration.data['access'])

        response = self.client.post(
            self.logout_url,
            {'refresh': another_refresh},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(BlacklistedToken.objects.count(), 0)

    def test_legacy_token_authentication_remains_temporarily_compatible(self):
        self.register_tourist()
        user = User.objects.get(username='tourist_test')
        legacy_token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {legacy_token.key}')

        profile = self.client.get(self.profile_url, format='json')
        logout = self.client.post(self.logout_url, {}, format='json')

        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(logout.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(key=legacy_token.key).exists())

    def test_role_permissions_remain_database_backed_under_jwt(self):
        tourist = User.objects.create_user(
            username='role_tourist',
            email='role_tourist@tastelocal.sg',
            full_name='Role Tourist',
            password='password123',
            role='Tourist',
        )
        pending_vendor = User.objects.create_user(
            username='role_pending',
            email='role_pending@tastelocal.sg',
            full_name='Pending Vendor',
            password='password123',
            role='Vendor',
        )
        pending_profile = VendorProfile.objects.create(
            user=pending_vendor,
            business_name='Pending Kitchen',
            description='Pending approval.',
            contact_number='+65 6000 0001',
            business_address='Singapore',
            approval_status='Pending',
        )
        approved_vendor = User.objects.create_user(
            username='role_approved',
            email='role_approved@tastelocal.sg',
            full_name='Approved Vendor',
            password='password123',
            role='Vendor',
        )
        VendorProfile.objects.create(
            user=approved_vendor,
            business_name='Approved Kitchen',
            description='Approved vendor.',
            contact_number='+65 6000 0002',
            business_address='Singapore',
            approval_status='Approved',
        )
        administrator = User.objects.create_superuser(
            username='role_admin',
            email='role_admin@tastelocal.sg',
            full_name='Role Administrator',
            password='password123',
            role='Administrator',
        )

        tourist_access, _ = self.jwt_for(tourist)
        self.authenticate_with_access(tourist_access)
        self.assertEqual(
            self.client.get(reverse('bookings:booking-list-create')).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.get(reverse('administration:user-list')).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        pending_access, _ = self.jwt_for(pending_vendor)
        self.authenticate_with_access(pending_access)
        self.assertEqual(
            self.client.get(reverse('experiences:vendor_list_create')).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        approved_access, _ = self.jwt_for(approved_vendor)
        self.authenticate_with_access(approved_access)
        self.assertEqual(
            self.client.get(reverse('experiences:vendor_list_create')).status_code,
            status.HTTP_200_OK,
        )

        # Approval is checked from the current VendorProfile, not from a JWT claim.
        pending_profile.approval_status = 'Approved'
        pending_profile.save(update_fields=['approval_status'])
        self.authenticate_with_access(pending_access)
        self.assertEqual(
            self.client.get(reverse('experiences:vendor_list_create')).status_code,
            status.HTTP_200_OK,
        )

        admin_access, _ = self.jwt_for(administrator)
        self.authenticate_with_access(admin_access)
        self.assertEqual(
            self.client.get(reverse('administration:user-list')).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.get(reverse('experiences:vendor_list_create')).status_code,
            status.HTTP_403_FORBIDDEN,
        )
