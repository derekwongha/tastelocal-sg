from rest_framework import serializers
from apps.itinerary.models import Itinerary, ItineraryItem
from apps.experiences.models import FoodExperience
from apps.experiences.serializers import PublicFoodExperienceSerializer

class ItineraryItemSerializer(serializers.ModelSerializer):
    food_experience = PublicFoodExperienceSerializer(read_only=True)
    itinerary_id = serializers.IntegerField(source='itinerary.itinerary_id', read_only=True)

    class Meta:
        model = ItineraryItem
        fields = [
            'itinerary_item_id', 'itinerary_id', 'food_experience', 
            'sequence_order', 'planned_date', 'planned_time'
        ]
        read_only_fields = ['itinerary_item_id', 'itinerary_id', 'food_experience']

class ItineraryItemCreateSerializer(serializers.ModelSerializer):
    food_experience_id = serializers.PrimaryKeyRelatedField(
        queryset=FoodExperience.objects.all(),
        source='food_experience',
        write_only=True
    )

    class Meta:
        model = ItineraryItem
        fields = ['food_experience_id', 'planned_date', 'planned_time']

    def validate_food_experience_id(self, value):
        # Control 7: FoodExperience status must be Published, and the owning VendorProfile approval_status must be Approved
        if value.status != 'Published':
            raise serializers.ValidationError("Only published food experiences can be added to itineraries.")
        if value.vendor_profile.approval_status != 'Approved':
            raise serializers.ValidationError("Food experience's vendor must be approved.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        food_experience = attrs.get('food_experience')

        # Find the tourist's itinerary
        itinerary, _ = Itinerary.objects.get_or_create(
            user=user,
            defaults={"itinerary_name": "My Singapore Food Itinerary"}
        )

        # Control 10: Prevent duplicate active itinerary items for the same tourist and same food experience
        if ItineraryItem.objects.filter(itinerary=itinerary, food_experience=food_experience).exists():
            raise serializers.ValidationError({
                "detail": "This food experience is already in your itinerary."
            })

        attrs['itinerary'] = itinerary
        return attrs

    def create(self, validated_data):
        itinerary = validated_data['itinerary']
        # Calculate sequence order manually
        existing_items = ItineraryItem.objects.filter(itinerary=itinerary)
        max_order = 0
        for item in existing_items:
            if item.sequence_order and item.sequence_order > max_order:
                max_order = item.sequence_order
        
        validated_data['sequence_order'] = max_order + 1
        return super().create(validated_data)

class ItinerarySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    tourist_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Itinerary
        fields = ['itinerary_id', 'itinerary_name', 'tourist_name', 'items', 'created_at']
        read_only_fields = fields

    def get_items(self, obj):
        # Order items by sequence_order ascending
        ordered_items = obj.items.all().order_by('sequence_order')
        return ItineraryItemSerializer(ordered_items, many=True).data
