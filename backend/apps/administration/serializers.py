from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.vendors.models import VendorProfile
from apps.experiences.models import Category, FoodExperience
from apps.reviews.models import Review

User = get_user_model()

class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'role', 'account_status', 'full_name', 'created_at']

class AdminVendorProfileSerializer(serializers.ModelSerializer):
    user = AdminUserSerializer(read_only=True)

    class Meta:
        model = VendorProfile
        fields = [
            'vendor_profile_id', 'user', 'business_name', 'description', 
            'contact_number', 'approval_status', 'business_address'
        ]

class AdminCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['category_id', 'category_name', 'description', 'is_active']

    def validate_category_name(self, value):
        # Prevent duplicates on category name (Control 11)
        qs = Category.objects.filter(category_name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value

class AdminFoodExperienceSerializer(serializers.ModelSerializer):
    vendor_business_name = serializers.CharField(source='vendor_profile.business_name', read_only=True)
    category_name = serializers.CharField(source='category.category_name', read_only=True)

    class Meta:
        model = FoodExperience
        fields = [
            'food_experience_id', 'vendor_business_name', 'category_name', 
            'title', 'description', 'price_sgd', 'status'
        ]

class AdminReviewSerializer(serializers.ModelSerializer):
    tourist_name = serializers.CharField(source='user.full_name', read_only=True)
    experience_title = serializers.CharField(source='food_experience.title', read_only=True)

    class Meta:
        model = Review
        fields = ['review_id', 'tourist_name', 'experience_title', 'rating', 'comment', 'created_at']
