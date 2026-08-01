from rest_framework import serializers
from apps.experiences.models import FoodExperience, Category, Location, TimeSlot
from apps.vendors.models import VendorProfile
from apps.reviews.models import Review

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('category_id', 'category_name', 'description')

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ('location_id', 'address', 'latitude', 'longitude')

class VendorSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = ('vendor_profile_id', 'business_name', 'description')

class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = ('timeslot_id', 'slot_date', 'start_time', 'end_time', 'availability_status')

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Review
        fields = ('review_id', 'username', 'full_name', 'rating', 'comment', 'created_at')

class PublicFoodExperienceSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    location = LocationSerializer(read_only=True)
    vendor_profile = VendorSummarySerializer(read_only=True)

    class Meta:
        model = FoodExperience
        fields = (
            'food_experience_id',
            'title',
            'description',
            'price_sgd',
            'status',
            'image_url',
            'category',
            'location',
            'vendor_profile'
        )

class PublicFoodExperienceDetailSerializer(PublicFoodExperienceSerializer):
    timeslots = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta(PublicFoodExperienceSerializer.Meta):
        fields = PublicFoodExperienceSerializer.Meta.fields + (
            'timeslots',
            'reviews'
        )

    def get_timeslots(self, obj):
        # Return only Available time slots, sorted chronologically
        available_slots = obj.timeslots.filter(availability_status='Available').order_by('slot_date', 'start_time')
        return TimeSlotSerializer(available_slots, many=True).data

    def get_reviews(self, obj):
        # Return reviews sorted newest first
        related_reviews = obj.reviews.all().order_by('-created_at')
        return ReviewSerializer(related_reviews, many=True).data

class VendorFoodExperienceSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True),
        source='category',
        write_only=True
    )
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        source='location',
        write_only=True
    )
    category = CategorySerializer(read_only=True)
    location = LocationSerializer(read_only=True)
    vendor_profile = VendorSummarySerializer(read_only=True)
    timeslots = TimeSlotSerializer(many=True, read_only=True)

    class Meta:
        model = FoodExperience
        fields = (
            'food_experience_id',
            'title',
            'description',
            'price_sgd',
            'status',
            'image_url',
            'category_id',
            'location_id',
            'category',
            'location',
            'vendor_profile',
            'timeslots'
        )

    def validate_price_sgd(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be a positive SGD amount.")
        return value

    def validate(self, attrs):
        # Determine status. If editing, use instance status if not provided. Default is Draft.
        status_val = attrs.get('status', self.instance.status if self.instance else 'Draft')
        if status_val == 'Published':
            if self.instance:
                # Check if this experience has at least one active available time slot
                if not self.instance.timeslots.filter(availability_status='Available').exists():
                    raise serializers.ValidationError({"status": "A listing cannot be published without at least one available time slot."})
            else:
                # Disallow creating new experience as Published directly
                raise serializers.ValidationError({"status": "New listings must be created in 'Draft' status first, and can only be 'Published' after adding at least one available time slot."})
        return attrs

class VendorTimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = ('timeslot_id', 'food_experience', 'slot_date', 'start_time', 'end_time', 'availability_status')
        read_only_fields = ('timeslot_id', 'availability_status')

    def validate_food_experience(self, value):
        user = self.context['request'].user
        # Allow checking vendor profile
        try:
            vendor_profile = user.vendor_profile
        except Exception:
            raise serializers.ValidationError("Authenticated user must be an approved vendor.")
        
        if value.vendor_profile != vendor_profile:
            raise serializers.ValidationError("You do not own this food experience.")
        return value

    def validate(self, attrs):
        from datetime import date
        slot_date = attrs.get('slot_date')
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')

        if slot_date < date.today():
            raise serializers.ValidationError({"slot_date": "Date cannot be in the past."})
        
        if start_time >= end_time:
            raise serializers.ValidationError({"start_time": "Start time must be before end time."})

        return attrs

