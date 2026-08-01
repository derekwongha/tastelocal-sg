from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model
from rest_framework.authtoken.models import Token as DRFToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.serializers import (
    LogoutSerializer,
    TouristRegisterSerializer, 
    VendorRegisterSerializer, 
    UserSerializer, 
    VendorProfileSerializer
)

User = get_user_model()


def token_pair_for_user(user):
    """Issue the JWT pair used by login and both registration flows."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }

class TouristRegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TouristRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                **token_pair_for_user(user),
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VendorRegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VendorRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Fetch the generated profile to serialize
            profile = user.vendor_profile
            return Response({
                **token_pair_for_user(user),
                'user': UserSerializer(user).data,
                'vendor_profile': VendorProfileSerializer(profile).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'non_field_errors': ['Please provide both username and password.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {'non_field_errors': ['Unable to log in with provided credentials.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        response_data = {
            **token_pair_for_user(user),
            'user': UserSerializer(user).data
        }

        # If user is a vendor, attach vendor profile status
        if user.role == 'Vendor':
            try:
                response_data['vendor_profile'] = VendorProfileSerializer(user.vendor_profile).data
            except Exception:
                response_data['vendor_profile'] = None

        return Response(response_data, status=status.HTTP_200_OK)

class LogoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_value = serializer.validated_data.get('refresh')

        if refresh_value:
            try:
                refresh = RefreshToken(refresh_value)
                if str(refresh['user_id']) != str(request.user.pk):
                    raise TokenError('Refresh token does not belong to the authenticated user.')
                refresh.blacklist()
            except TokenError:
                return Response(
                    {'refresh': ['Refresh token is invalid, expired, or already blacklisted.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)

        # Temporary compatibility for a client authenticated with a legacy DRF token.
        if isinstance(request.auth, DRFToken):
            request.auth.delete()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)

        return Response(
            {'refresh': ['This field is required for JWT logout.']},
            status=status.HTTP_400_BAD_REQUEST
        )

class ProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        response_data = {
            'user': UserSerializer(user).data
        }

        if user.role == 'Vendor':
            try:
                response_data['vendor_profile'] = VendorProfileSerializer(user.vendor_profile).data
            except Exception:
                response_data['vendor_profile'] = None

        return Response(response_data, status=status.HTTP_200_OK)
