from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from apps.accounts.permissions import IsTourist
from apps.itinerary.models import Itinerary, ItineraryItem
from apps.itinerary.serializers import (
    ItinerarySerializer,
    ItineraryItemCreateSerializer,
    ItineraryItemSerializer
)

class ItineraryView(views.APIView):
    """
    Get the authenticated tourist's itinerary. Auto-creates a default one if none exists (Control 11).
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]

    def get(self, request, *args, **kwargs):
        itinerary, _ = Itinerary.objects.get_or_create(
            user=request.user,
            defaults={"itinerary_name": "My Singapore Food Itinerary"}
        )
        serializer = ItinerarySerializer(itinerary)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ItineraryItemCreateView(generics.CreateAPIView):
    """
    Add a food experience to the tourist's itinerary.
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]
    serializer_class = ItineraryItemCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        read_serializer = ItineraryItemSerializer(item)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

class ItineraryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a specific itinerary item. Scoped to items owned by the authenticated tourist (Control 6).
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]
    serializer_class = ItineraryItemSerializer

    def get_queryset(self):
        return ItineraryItem.objects.filter(itinerary__user=self.request.user)
