# healthcare_microservices/patient_service/patient_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # List/Create endpoint
    path('patients/', views.patient_list_create_view, name='patient_list_create'),
    # Detail endpoint using the UUID converter for user_id
    path('patients/<uuid:user_id>/', views.patient_detail_view, name='patient_detail'),

    # Add update/delete paths later if you implement those views:
    # path('patients/<uuid:user_id>/', views.patient_update_view, name='patient_update'), # Typically PUT/PATCH method
    # path('patients/<uuid:user_id>/', views.patient_delete_view, name='patient_delete'), # Typically DELETE method
]