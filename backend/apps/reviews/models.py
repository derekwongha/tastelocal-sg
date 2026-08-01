from django.db import models
from django.conf import settings
from apps.experiences.models import FoodExperience
from apps.bookings.models import Booking

class Review(models.Model):
    review_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='reviews'
    )
    food_experience = models.ForeignKey(
        FoodExperience,
        on_delete=models.CASCADE,
        db_column='food_experience_id',
        related_name='reviews'
    )
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        db_column='booking_id',
        related_name='review'
    )
    rating = models.IntegerField()
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review'

    def __str__(self):
        return f"Review {self.review_id} on {self.food_experience.title} by {self.user.username}"
