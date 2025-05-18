# healthcare_microservices/medical_records_service/medical_records_app/urls.py

from django.urls import path
from . import views
from uuid import UUID # Import UUID to use in path converters


urlpatterns = [
    # Doctor Report URLs (Owned by this service)
    path('reports/', views.doctor_report_list_create_view, name='doctor_report_list_create'),
    path('reports/<uuid:report_id>/', views.doctor_report_detail_view, name='doctor_report_detail'),

    # Patient Medical History Aggregation URL (Calls multiple services)
    # Note: Putting patient_user_id in the path indicates this is history *for* a specific patient
    path('patients/<uuid:patient_user_id>/medical_history/', views.patient_medical_history_view, name='patient_medical_history'),

    # Skipping update/delete URLs for now
    # path('reports/<uuid:report_id>/', views.doctor_report_update_view, name='doctor_report_update'),
    # path('reports/<uuid:report_id>/', views.doctor_report_delete_view, name='doctor_report_delete'),
]