from rest_framework import serializers
from apps.bookings.models import Booking
from apps.experiences.models import FoodExperience, TimeSlot
from apps.experiences.serializers import PublicFoodExperienceSerializer, TimeSlotSerializer
from apps.reviews.models import Review


class BookingReviewSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ('review_id', 'rating', 'comment', 'created_at')
        read_only_fields = fields

class BookingReadSerializer(serializers.ModelSerializer):
    food_experience = PublicFoodExperienceSerializer(read_only=True)
    timeslot = TimeSlotSerializer(read_only=True)
    tourist_name = serializers.CharField(source='user.full_name', read_only=True)
    vendor_business_name = serializers.CharField(source='food_experience.vendor.business_name', read_only=True)
    has_review = serializers.SerializerMethodField()
    review = BookingReviewSummarySerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'booking_id', 'user', 'tourist_name', 'food_experience', 'timeslot',
            'booking_status', 'requested_at', 'cancelled_at', 'completed_at',
            'vendor_business_name', 'has_review', 'review'
        ]
        read_only_fields = fields

    def get_has_review(self, obj):
        return hasattr(obj, 'review')

class BookingCreateSerializer(serializers.ModelSerializer):
    food_experience_id = serializers.PrimaryKeyRelatedField(
        queryset=FoodExperience.objects.filter(status='Published'),
        source='food_experience',
        write_only=True
    )
    timeslot_id = serializers.PrimaryKeyRelatedField(
        queryset=TimeSlot.objects.filter(availability_status='Available'),
        source='timeslot',
        write_only=True
    )

    class Meta:
        model = Booking
        fields = ['booking_id', 'food_experience_id', 'timeslot_id']

    def validate(self, attrs):
        user = self.context['request'].user
        food_experience = attrs.get('food_experience')
        timeslot = attrs.get('timeslot')

        # Control 3/5: Only Tourist users can submit
        if user.role != 'Tourist':
            raise serializers.ValidationError({"detail": "Only tourists can submit booking requests."})

        # Control 6: Selected timeslot must belong to selected experience
        if timeslot.food_experience != food_experience:
            raise serializers.ValidationError({
                "timeslot_id": "The selected time slot does not belong to the chosen food experience."
            })

        # Control 9: Prevent duplicate active booking requests by the same tourist for the same timeslot
        existing_active = Booking.objects.filter(
            user=user,
            timeslot=timeslot,
            booking_status__in=['Pending Approval', 'Approved']
        ).exists()
        if existing_active:
            raise serializers.ValidationError({
                "timeslot_id": "You already have an active booking request for this time slot."
            })

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        # Start booking request with default 'Pending Approval' status (Control 7)
        # Control 8: Do not change timeslot availability status upon submission
        booking = Booking.objects.create(
            user=user,
            food_experience=validated_data['food_experience'],
            timeslot=validated_data['timeslot'],
            booking_status='Pending Approval'
        )
        return booking
