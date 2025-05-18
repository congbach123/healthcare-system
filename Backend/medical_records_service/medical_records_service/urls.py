# healthcare_microservices/medical_records_service/medical_records_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('medical_records_app.urls')), # Include medical records app urls under /api/
    # Consider renaming this to 'api/medicalrecords/' or similar
]