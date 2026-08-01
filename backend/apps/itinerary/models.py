from django.db import models
from django.conf import settings
from apps.experiences.models import FoodExperience

class Itinerary(models.Model):
    itinerary_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='itineraries'
    )
    itinerary_name = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'itinerary'

    def __str__(self):
        return f"{self.itinerary_name} by {self.user.username}"

class ItineraryItem(models.Model):
    itinerary_item_id = models.AutoField(primary_key=True)
    itinerary = models.ForeignKey(
        Itinerary,
        on_delete=models.CASCADE,
        db_column='itinerary_id',
        related_name='items'
    )
    food_experience = models.ForeignKey(
        FoodExperience,
        on_delete=models.CASCADE,
        db_column='food_experience_id',
        related_name='itinerary_items'
    )
    sequence_order = models.IntegerField(null=True, blank=True)
    planned_date = models.DateField(null=True, blank=True)
    planned_time = models.TimeField(null=True, blank=True)

    class Meta:
        db_table = 'itinerary_item'

    def __str__(self):
        return f"Item {self.itinerary_item_id} in Itinerary {self.itinerary.itinerary_name}"
