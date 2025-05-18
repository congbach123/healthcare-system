# healthcare_microservices/doctor_service/doctor_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('doctor_app.urls')), # Include doctor app urls under /api/
    # Consider renaming this to 'api/doctors/' for clarity
]