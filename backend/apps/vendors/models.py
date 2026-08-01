from django.db import models
from django.conf import settings

class VendorProfile(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )
    
    vendor_profile_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='vendor_profile'
    )
    business_name = models.CharField(max_length=150)
    description = models.TextField()
    contact_number = models.CharField(max_length=30)
    approval_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending')
    business_address = models.CharField(max_length=255)

    class Meta:
        db_table = 'vendor_profile'

    def __str__(self):
        return self.business_name
