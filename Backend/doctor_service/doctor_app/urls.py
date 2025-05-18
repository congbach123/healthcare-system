# healthcare_microservices/doctor_service/doctor_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # List/Create endpoint
    path('doctors/', views.doctor_list_create_view, name='doctor_list_create'),
    # Detail endpoint using the UUID converter for user_id
    path('doctors/<uuid:user_id>/', views.doctor_detail_view, name='doctor_detail'),

    # Add update/delete paths later if you implement those views:
    # path('doctors/<uuid:user_id>/', views.doctor_update_view, name='doctor_update'), # Typically PUT/PATCH method
    # path('doctors/<uuid:user_id>/', views.doctor_delete_view, name='doctor_delete'), # Typically DELETE method
]