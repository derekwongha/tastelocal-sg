from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from apps.accounts.permissions import IsTourist, IsApprovedVendor
from apps.bookings.models import Booking
from apps.bookings.serializers import BookingReadSerializer, BookingCreateSerializer

class BookingListCreateView(generics.ListCreateAPIView):
    """
    List all bookings for the authenticated tourist user (Control 10),
    or submit a new booking request (Control 3).
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]

    def get_queryset(self):
        # Control 10: Tourist booking history must show only their own bookings
        return Booking.objects.filter(user=self.request.user).select_related(
            'user',
            'food_experience__category',
            'food_experience__location',
            'food_experience__vendor_profile',
            'timeslot',
            'review',
        ).order_by('-requested_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BookingCreateSerializer
        return BookingReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        # Return the read representation of the created booking
        read_serializer = BookingReadSerializer(booking)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

class BookingCancelView(views.APIView):
    """
    Allows a tourist to cancel their own pending or approved booking (Control 11).
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]

    def post(self, request, pk, *args, **kwargs):
        # Scoped queryset: can only fetch tourist's own booking
        booking = get_object_or_404(Booking, booking_id=pk, user=request.user)

        if booking.booking_status not in ['Pending Approval', 'Approved']:
            return Response(
                {"detail": "Only pending or approved bookings can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        orig_status = booking.booking_status
        booking.booking_status = 'Cancelled'
        booking.cancelled_at = timezone.now()
        booking.save()

        # Control 11: Restore slot availability if the booking was already approved
        if orig_status == 'Approved':
            timeslot = booking.timeslot
            timeslot.availability_status = 'Available'
            timeslot.save()

        return Response(
            {"detail": "Booking successfully cancelled.", "status": "Cancelled"},
            status=status.HTTP_200_OK
        )

class VendorBookingListView(generics.ListAPIView):
    """
    Allows approved vendors to view booking requests for their own experiences.
    """
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]
    serializer_class = BookingReadSerializer

    def get_queryset(self):
        # Control 4: Scoped to the authenticated vendor's experiences
        return Booking.objects.filter(
            food_experience__vendor_profile=self.request.user.vendor_profile
        ).select_related(
            'user',
            'food_experience__category',
            'food_experience__location',
            'food_experience__vendor_profile',
            'timeslot',
            'review',
        ).order_by('-requested_at')

class VendorBookingApproveView(views.APIView):
    """
    Allows approved vendors to approve a pending booking request.
    """
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

    def post(self, request, pk, *args, **kwargs):
        # Scoped queryset: check that the booking belongs to this vendor
        booking = get_object_or_404(
            Booking, booking_id=pk, food_experience__vendor_profile=request.user.vendor_profile
        )

        # Control 7: Approval must be allowed only for Pending Approval requests
        if booking.booking_status != 'Pending Approval':
            return Response(
                {"detail": "Only pending booking requests can be approved."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Control 9: Only one approved booking is allowed for each slot
        timeslot = booking.timeslot
        if timeslot.availability_status != 'Available':
            return Response(
                {"detail": "Only one approved booking may exist for this time slot."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update states
        booking.booking_status = 'Approved'
        booking.save()

        timeslot.availability_status = 'Unavailable'
        timeslot.save()

        return Response(BookingReadSerializer(booking).data, status=status.HTTP_200_OK)

class VendorBookingRejectView(views.APIView):
    """
    Allows approved vendors to reject a pending booking request.
    """
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

    def post(self, request, pk, *args, **kwargs):
        # Scoped queryset: check that the booking belongs to this vendor
        booking = get_object_or_404(
            Booking, booking_id=pk, food_experience__vendor_profile=request.user.vendor_profile
        )

        # Control 8: Rejection must be allowed only for Pending Approval requests
        if booking.booking_status != 'Pending Approval':
            return Response(
                {"detail": "Only pending booking requests can be rejected."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Control 10: Rejected requests leave the slot available (no change to availability_status)
        booking.booking_status = 'Rejected'
        booking.save()

        return Response(BookingReadSerializer(booking).data, status=status.HTTP_200_OK)

class VendorBookingCancelView(views.APIView):
    """
    Allows approved vendors to cancel an approved booking when necessary.
    """
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

    def post(self, request, pk, *args, **kwargs):
        # Scoped queryset: check that the booking belongs to this vendor
        booking = get_object_or_404(
            Booking, booking_id=pk, food_experience__vendor_profile=request.user.vendor_profile
        )

        if booking.booking_status != 'Approved':
            return Response(
                {"detail": "Only approved bookings can be cancelled by the vendor."},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.booking_status = 'Cancelled'
        booking.cancelled_at = timezone.now()
        booking.save()

        # Restore slot availability
        timeslot = booking.timeslot
        timeslot.availability_status = 'Available'
        timeslot.save()

        return Response(BookingReadSerializer(booking).data, status=status.HTTP_200_OK)

class VendorBookingCompleteView(views.APIView):
    """
    Allows approved vendors to mark an approved booking as Completed (supporting change for FR-008).
    """
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

    def post(self, request, pk, *args, **kwargs):
        # Scoped queryset: check that the booking belongs to this vendor (Control 15)
        booking = get_object_or_404(
            Booking, booking_id=pk, food_experience__vendor_profile=request.user.vendor_profile
        )

        # Control 15: Only Approved bookings may be marked Completed
        if booking.booking_status != 'Approved':
            return Response(
                {"detail": "Only approved bookings can be marked as Completed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.booking_status = 'Completed'
        booking.completed_at = timezone.now()
        booking.save()

        return Response(BookingReadSerializer(booking).data, status=status.HTTP_200_OK)

