from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import (
    TouristRegisterView, 
    VendorRegisterView, 
    LoginView, 
    LogoutView, 
    ProfileView
)

app_name = 'accounts'

urlpatterns = [
    path('register/tourist/', TouristRegisterView.as_view(), name='register_tourist'),
    path('register/vendor/', VendorRegisterView.as_view(), name='register_vendor'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
