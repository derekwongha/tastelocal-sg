from django.urls import path
from apps.itinerary.views import ItineraryView, ItineraryItemCreateView, ItineraryItemDetailView

app_name = 'itinerary'

urlpatterns = [
    path('', ItineraryView.as_view(), name='itinerary-detail'),
    path('items/', ItineraryItemCreateView.as_view(), name='itinerary-item-create'),
    path('items/<int:pk>/', ItineraryItemDetailView.as_view(), name='itinerary-item-detail'),
]
