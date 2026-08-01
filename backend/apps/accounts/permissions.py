from rest_framework import permissions

class IsTourist(permissions.BasePermission):
    """
    Allows access only to authenticated users with role 'Tourist'.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'Tourist'
        )

class IsApprovedVendor(permissions.BasePermission):
    """
    Allows access only to authenticated vendors whose profile has been Approved.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == 'Vendor'):
            return False
        
        # Check approval status of VendorProfile
        try:
            return request.user.vendor_profile.approval_status == 'Approved'
        except Exception:
            return False

class IsAdministrator(permissions.BasePermission):
    """
    Allows access only to administrators.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'Administrator' or request.user.is_superuser)
        )
