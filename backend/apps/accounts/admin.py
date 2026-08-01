from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin management for TasteLocal SG user accounts."""

    list_display = (
        'user_id',
        'username',
        'full_name',
        'email',
        'role',
        'account_status',
        'is_active',
        'is_staff',
        'created_at',
    )
    list_display_links = ('user_id', 'username')
    list_filter = (
        'role',
        'account_status',
        'is_active',
        'is_staff',
        'is_superuser',
    )
    search_fields = ('username', 'full_name', 'email')
    ordering = ('username',)
    readonly_fields = ('last_login', 'date_joined', 'created_at')

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            'TasteLocal SG account',
            {
                'fields': (
                    'full_name',
                    'role',
                    'account_status',
                    'created_at',
                )
            },
        ),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            'TasteLocal SG account',
            {
                'fields': (
                    'full_name',
                    'email',
                    'role',
                    'account_status',
                )
            },
        ),
    )
