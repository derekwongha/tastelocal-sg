from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls', namespace='accounts')),
    path('api/vendors/', include('apps.vendors.urls', namespace='vendors')),
    path('api/experiences/', include('apps.experiences.urls', namespace='experiences')),
    path('api/bookings/', include('apps.bookings.urls', namespace='bookings')),
    path('api/reviews/', include('apps.reviews.urls', namespace='reviews')),
    path('api/itinerary/', include('apps.itinerary.urls', namespace='itinerary')),
    path('api/administration/', include('apps.administration.urls', namespace='administration')),
]
