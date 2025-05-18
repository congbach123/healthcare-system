# healthcare_microservices/patient_service/patient_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('patient_app.urls')), # Include patient app urls under /api/
    # You might eventually rename this to something more specific like 'api/patients/'
    # but /api/ is fine for now if this service *only* handles patients.
]