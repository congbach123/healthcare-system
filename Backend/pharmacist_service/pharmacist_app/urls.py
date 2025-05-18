# healthcare_microservices/pharmacist_service/pharmacist_app/urls.py

from django.urls import path
from . import views
from uuid import UUID


urlpatterns = [
    # Pharmacist Profile URLs (Keep these)
    path('pharmacists/', views.pharmacist_list_create_view, name='pharmacist_list_create'), # Corrected endpoint name here too
    path('pharmacists/<uuid:user_id>/', views.pharmacist_detail_view, name='pharmacist_detail'),

    # Pharmacist Specific Actions URLs (ADD this NEW URL pattern)
    # Endpoint for fulfilling a prescription
    path('pharmacists/fulfill/', views.fulfill_prescription_view, name='fulfill_prescription'),

    # Skipping update/delete URLs for now
    # path('pharmacists/<uuid:user_id>/', views.pharmacist_profile_update_view, name='pharmacist_profile_update'),
    # path('pharmacists/<uuid:user_id>/', views.pharmacist_profile_delete_view, name='pharmacist_profile_delete'),
]