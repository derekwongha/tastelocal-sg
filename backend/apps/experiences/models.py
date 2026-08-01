from django.db import models
from apps.vendors.models import VendorProfile

class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'category'

    def __str__(self):
        return self.category_name

class Location(models.Model):
    location_id = models.AutoField(primary_key=True)
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    class Meta:
        db_table = 'location'

    def __str__(self):
        return self.address

class FoodExperience(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Inactive', 'Inactive'),
    )

    food_experience_id = models.AutoField(primary_key=True)
    vendor_profile = models.ForeignKey(
        VendorProfile,
        on_delete=models.CASCADE,
        db_column='vendor_profile_id',
        related_name='food_experiences'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        db_column='category_id',
        related_name='food_experiences'
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        db_column='location_id',
        related_name='food_experiences'
    )
    title = models.CharField(max_length=150)
    description = models.TextField()
    price_sgd = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Draft')
    image_url = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'food_experience'

    def __str__(self):
        return self.title

class TimeSlot(models.Model):
    STATUS_CHOICES = (
        ('Available', 'Available'),
        ('Unavailable', 'Unavailable'),
    )

    timeslot_id = models.AutoField(primary_key=True)
    food_experience = models.ForeignKey(
        FoodExperience,
        on_delete=models.CASCADE,
        db_column='food_experience_id',
        related_name='timeslots'
    )
    slot_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    availability_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Available')

    class Meta:
        db_table = 'timeslot'

    def __str__(self):
        return f"{self.food_experience.title} on {self.slot_date} ({self.start_time} - {self.end_time})"
