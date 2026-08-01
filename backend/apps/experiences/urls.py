from django.urls import path
from apps.experiences.views import (
    PublicExperiencesListView, 
    PublicExperienceDetailView,
    CategoryListView,
    LocationListView,
    VendorExperienceListView,
    VendorExperienceDetailView,
    VendorTimeSlotCreateView,
    VendorTimeSlotDestroyView,
    AIRecommendationsView
)

app_name = 'experiences'

urlpatterns = [
    path('public/', PublicExperiencesListView.as_view(), name='public_list'),
    path('public/<int:pk>/', PublicExperienceDetailView.as_view(), name='public_detail'),
    path('categories/', CategoryListView.as_view(), name='category_list'),
    path('locations/', LocationListView.as_view(), name='location_list'),
    path('vendor/', VendorExperienceListView.as_view(), name='vendor_list_create'),
    path('vendor/<int:pk>/', VendorExperienceDetailView.as_view(), name='vendor_detail_update_delete'),
    path('vendor/timeslots/', VendorTimeSlotCreateView.as_view(), name='vendor_timeslot_create'),
    path('vendor/timeslots/<int:pk>/', VendorTimeSlotDestroyView.as_view(), name='vendor_timeslot_delete'),
    path('recommendations/', AIRecommendationsView.as_view(), name='ai_recommendations'),
]

