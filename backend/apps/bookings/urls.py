from django.urls import path
from apps.bookings.views import (
    BookingListCreateView,
    BookingCancelView,
    VendorBookingListView,
    VendorBookingApproveView,
    VendorBookingRejectView,
    VendorBookingCancelView,
    VendorBookingCompleteView
)

app_name = 'bookings'

urlpatterns = [
    path('', BookingListCreateView.as_view(), name='booking-list-create'),
    path('<int:pk>/cancel/', BookingCancelView.as_view(), name='booking-cancel'),
    
    # Vendor booking endpoints (FR-007)
    path('vendor/', VendorBookingListView.as_view(), name='vendor-booking-list'),
    path('vendor/<int:pk>/approve/', VendorBookingApproveView.as_view(), name='vendor-booking-approve'),
    path('vendor/<int:pk>/reject/', VendorBookingRejectView.as_view(), name='vendor-booking-reject'),
    path('vendor/<int:pk>/cancel/', VendorBookingCancelView.as_view(), name='vendor-booking-cancel'),
    path('vendor/<int:pk>/complete/', VendorBookingCompleteView.as_view(), name='vendor-booking-complete'),
]


