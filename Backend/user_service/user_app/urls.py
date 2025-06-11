# healthcare_microservices/user_service/user_app/urls.py

from django.urls import path
from . import views
from uuid import UUID # Import UUID

urlpatterns = [
    path('register/', views.register_user_view, name='register_user'),
    # Add the list view URL pattern *before* the detail view pattern
    path('users/', views.user_list_view, name='user_list'), # <-- Add this line
    path('users/<uuid:user_id>/', views.get_user_by_id_view, name='get_user_by_id'),
    path('login/', views.login_view, name='login'),
    # path('logout/', views.logout_view, name='logout'),
]