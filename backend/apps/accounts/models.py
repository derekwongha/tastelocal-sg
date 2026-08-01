from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('Tourist', 'Tourist'),
        ('Vendor', 'Vendor'),
        ('Administrator', 'Administrator'),
    )
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )
    
    user_id = models.AutoField(primary_key=True)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='Tourist')
    account_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Active')
    full_name = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Make email unique and required
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ['full_name', 'email']

    class Meta:
        db_table = 'user'

    def __str__(self):
        return f"{self.username} ({self.role})"
