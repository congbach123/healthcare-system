# healthcare_microservices/prescription_service/prescription_app/urls.py

from django.urls import path
from . import views
from uuid import UUID # Import UUID


urlpatterns = [
    # Prescription URLs
    path('prescriptions/', views.prescription_list_create_view, name='prescription_list_create'),
    path('prescriptions/<uuid:prescription_id>/', views.prescription_detail_view, name='prescription_detail'),

    # Skipping update/delete URLs for now
    # path('prescriptions/<uuid:prescription_id>/', views.prescription_update_view, name='prescription_update'),
    # path('prescriptions/<uuid:prescription_id>/', views.prescription_delete_view, name='prescription_delete'),
]