from django.db import models
from django.conf import settings
from apps.experiences.models import FoodExperience, TimeSlot

class Booking(models.Model):
    STATUS_CHOICES = (
        ('Pending Approval', 'Pending Approval'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Cancelled', 'Cancelled'),
        ('Completed', 'Completed'),
    )

    booking_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='bookings'
    )
    food_experience = models.ForeignKey(
        FoodExperience,
        on_delete=models.CASCADE,
        db_column='food_experience_id',
        related_name='bookings'
    )
    timeslot = models.ForeignKey(
        TimeSlot,
        on_delete=models.CASCADE,
        db_column='timeslot_id',
        related_name='bookings'
    )
    booking_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending Approval')
    requested_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'booking'

    def __str__(self):
        return f"Booking {self.booking_id} by {self.user.username} - {self.booking_status}"
