# healthcare_microservices/nurse_service/nurse_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Nurse Profile URLs (Keep these)
    path('nurses/', views.nurse_profile_list_create_view, name='nurse_profile_list_create'),
    path('nurses/<uuid:user_id>/', views.nurse_profile_detail_view, name='nurse_profile_detail'),

    # Patient Vitals URLs (NEW)
    path('vitals/', views.patient_vitals_list_create_view, name='patient_vitals_list_create'),
    path('vitals/<uuid:vitals_id>/', views.patient_vitals_detail_view, name='patient_vitals_detail'),

    # You can add PUT/PATCH/DELETE URLs for nurse profiles here if you implement those methods
    # path('nurses/<uuid:user_id>/', views.nurse_profile_detail_view, name='nurse_profile_update'), # PUT/PATCH handled by detail view
    # path('nurses/<uuid:user_id>/', views.nurse_profile_detail_view, name='nurse_profile_delete'), # DELETE handled by detail view

    # Update/Delete for vitals are handled by methods on the detail view
    # path('vitals/<uuid:vitals_id>/', views.patient_vitals_detail_view, name='patient_vitals_update'), # PUT/PATCH handled by detail view
    # path('vitals/<uuid:vitals_id>/', views.patient_vitals_detail_view, name='patient_vitals_delete'), # DELETE handled by detail view
]