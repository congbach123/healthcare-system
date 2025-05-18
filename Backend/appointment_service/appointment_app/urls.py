# healthcare_microservices/appointment_service/appointment_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # List/Create endpoint
    path('appointments/', views.appointment_list_create_view, name='appointment_list_create'),
    # Detail, Update, Delete endpoint using the UUID converter for appointment_id
    path('appointments/<uuid:appointment_id>/', views.appointment_detail_view, name='appointment_detail'), # Handles GET, PUT/PATCH, DELETE methods
]