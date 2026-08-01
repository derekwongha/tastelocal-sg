from django.urls import path
from apps.reviews.views import ReviewCreateView

app_name = 'reviews'

urlpatterns = [
    path('', ReviewCreateView.as_view(), name='review-create'),
]
