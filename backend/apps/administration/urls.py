from django.urls import path
from .views import (
    AdminVendorProfileListView,
    AdminVendorProfileApproveView,
    AdminVendorProfileRejectView,
    AdminCategoryListCreateView,
    AdminCategoryDetailView,
    AdminFoodExperienceListView,
    AdminFoodExperienceDeactivateView,
    AdminReviewListView,
    AdminReviewDetailView,
    AdminUserListView
)

app_name = 'administration'

urlpatterns = [
    path('vendors/', AdminVendorProfileListView.as_view(), name='vendor-list'),
    path('vendors/<int:pk>/approve/', AdminVendorProfileApproveView.as_view(), name='vendor-approve'),
    path('vendors/<int:pk>/reject/', AdminVendorProfileRejectView.as_view(), name='vendor-reject'),
    
    path('categories/', AdminCategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', AdminCategoryDetailView.as_view(), name='category-detail'),
    
    path('experiences/', AdminFoodExperienceListView.as_view(), name='experience-list'),
    path('experiences/<int:pk>/deactivate/', AdminFoodExperienceDeactivateView.as_view(), name='experience-deactivate'),
    
    path('reviews/', AdminReviewListView.as_view(), name='review-list'),
    path('reviews/<int:pk>/', AdminReviewDetailView.as_view(), name='review-detail'),
    
    path('users/', AdminUserListView.as_view(), name='user-list'),
]
