from rest_framework import serializers
from apps.reviews.models import Review
from apps.bookings.models import Booking

class ReviewReadSerializer(serializers.ModelSerializer):
    tourist_name = serializers.CharField(source='user.full_name', read_only=True)
    experience_title = serializers.CharField(source='food_experience.title', read_only=True)

    class Meta:
        model = Review
        fields = [
            'review_id', 'user', 'tourist_name', 'food_experience', 
            'experience_title', 'booking', 'rating', 'comment', 'created_at'
        ]
        read_only_fields = fields

class ReviewCreateSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=Booking.objects.all(),
        source='booking',
        write_only=True
    )

    class Meta:
        model = Review
        fields = ['booking_id', 'rating', 'comment']

    def validate_rating(self, value):
        # Control 9: Rating must be validated within approved range 1 to 5
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_comment(self, value):
        # Control 10: Comment must not be blank
        if not value or not value.strip():
            raise serializers.ValidationError("Comment cannot be blank.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        booking = attrs.get('booking')

        # Control 3: Only Tourist role can submit reviews
        if user.role != 'Tourist':
            raise serializers.ValidationError({"detail": "Only tourists can submit reviews."})

        # Control 7: A tourist must not submit a review for another tourist's booking
        if booking.user != user:
            raise serializers.ValidationError({"booking_id": "This booking does not belong to you."})

        # Control 6: Pending, Approved, Rejected, Cancelled and incomplete bookings must not be reviewable
        if booking.booking_status != 'Completed':
            raise serializers.ValidationError({
                "booking_id": "You can only submit reviews for Completed bookings."
            })

        # Control 8: A tourist must not submit duplicate reviews for the same booking
        if Review.objects.filter(booking=booking).exists():
            raise serializers.ValidationError({
                "booking_id": "You have already submitted a review for this booking."
            })

        return attrs

    def create(self, validated_data):
        # Auto-associate tourist and food experience from the booking
        booking = validated_data['booking']
        validated_data['user'] = self.context['request'].user
        validated_data['food_experience'] = booking.food_experience
        return super().create(validated_data)
