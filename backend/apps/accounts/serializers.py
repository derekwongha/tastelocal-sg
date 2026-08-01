from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.vendors.models import VendorProfile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('user_id', 'username', 'email', 'role', 'account_status', 'full_name', 'created_at')
        read_only_fields = ('user_id', 'role', 'account_status', 'created_at')

class VendorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = ('vendor_profile_id', 'business_name', 'description', 'contact_number', 'approval_status', 'business_address')
        read_only_fields = ('vendor_profile_id', 'approval_status')


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=False)

class TouristRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            role='Tourist',
            account_status='Active'
        )
        user.set_password(password)
        user.save()
        return user

class VendorRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    
    # Vendor Profile Fields
    business_name = serializers.CharField(max_length=150)
    description = serializers.CharField()
    contact_number = serializers.CharField(max_length=30)
    business_address = serializers.CharField(max_length=255)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('password_confirm')
        
        # Extract vendor profile details
        business_name = validated_data.pop('business_name')
        description = validated_data.pop('description')
        contact_number = validated_data.pop('contact_number')
        business_address = validated_data.pop('business_address')
        
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            role='Vendor',
            account_status='Active'
        )
        user.set_password(password)
        user.save()
        
        # Create corresponding VendorProfile in Pending state
        VendorProfile.objects.create(
            user=user,
            business_name=business_name,
            description=description,
            contact_number=contact_number,
            business_address=business_address,
            approval_status='Pending'
        )
        return user
