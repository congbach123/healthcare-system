# healthcare_microservices/administrator_service/administrator_app/urls.py

from django.urls import path
from . import views
from uuid import UUID # Import UUID


urlpatterns = [
    # Administrator Profile URLs (Owned by this service)
    path('admins/', views.administrator_profile_list_create_view, name='administrator_profile_list_create'),
    path('admins/<uuid:user_id>/', views.administrator_profile_detail_view, name='administrator_profile_detail'),

    # User Management URLs (Orchestrating User Service Calls)
    # These endpoints are exposed by the Admin Service but act on User Service data
    path('users/', views.user_list_management_view, name='user_list_management'),
    path('users/create/', views.user_create_management_view, name='user_create_management'), # Separate create endpoint
    path('users/<uuid:user_id>/', views.user_detail_management_view, name='user_detail_management'), # Handles GET, PUT/PATCH, DELETE

    # Skipping update/delete URLs for profiles for now
    # path('admins/<uuid:user_id>/', views.administrator_profile_update_view, name='administrator_profile_update'),
    # path('admins/<uuid:user_id>/', views.administrator_profile_delete_view, name='administrator_profile_delete'),
]