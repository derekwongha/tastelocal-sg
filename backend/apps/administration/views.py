from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from apps.accounts.permissions import IsAdministrator
from apps.vendors.models import VendorProfile
from apps.experiences.models import Category, FoodExperience
from apps.reviews.models import Review
from .serializers import (
    AdminVendorProfileSerializer,
    AdminCategorySerializer,
    AdminFoodExperienceSerializer,
    AdminReviewSerializer,
    AdminUserSerializer
)

# 1. Vendor management
class AdminVendorProfileListView(generics.ListAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminVendorProfileSerializer
    queryset = VendorProfile.objects.all().order_by('-vendor_profile_id')

class AdminVendorProfileApproveView(generics.GenericAPIView):
    permission_classes = [IsAdministrator]
    queryset = VendorProfile.objects.all()

    def post(self, request, *args, **kwargs):
        profile = self.get_object()
        profile.approval_status = 'Approved'
        profile.save()
        return Response({'detail': f'Vendor application for "{profile.business_name}" approved.'}, status=status.HTTP_200_OK)

class AdminVendorProfileRejectView(generics.GenericAPIView):
    permission_classes = [IsAdministrator]
    queryset = VendorProfile.objects.all()

    def post(self, request, *args, **kwargs):
        profile = self.get_object()
        profile.approval_status = 'Rejected'
        profile.save()
        return Response({'detail': f'Vendor application for "{profile.business_name}" rejected.'}, status=status.HTTP_200_OK)


# 2. Category management
class AdminCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all().order_by('category_name')

class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()

    def perform_destroy(self, instance):
        # Category in-use protection (Control 11)
        if instance.food_experiences.exists():
            raise ValidationError({'detail': 'Cannot delete category because it is in use by food experiences.'})
        instance.delete()


# 3. Listing management / moderation
class AdminFoodExperienceListView(generics.ListAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminFoodExperienceSerializer
    queryset = FoodExperience.objects.all().order_by('-food_experience_id')

class AdminFoodExperienceDeactivateView(generics.UpdateAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminFoodExperienceSerializer
    queryset = FoodExperience.objects.all()

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        # Toggle experience status to 'Inactive' (Control 12)
        instance.status = 'Inactive'
        instance.save()
        return Response({'detail': f'Experience "{instance.title}" has been deactivated.'}, status=status.HTTP_200_OK)


# 4. Review moderation
class AdminReviewListView(generics.ListAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminReviewSerializer
    queryset = Review.objects.all().order_by('-review_id')

class AdminReviewDetailView(generics.DestroyAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminReviewSerializer
    queryset = Review.objects.all()


# 5. User management (Control 9)
class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AdminUserSerializer
    queryset = get_user_model().objects.all().order_by('-user_id')
