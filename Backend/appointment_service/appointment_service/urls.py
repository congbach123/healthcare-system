# healthcare_microservices/appointment_service/appointment_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('appointment_app.urls')), # Include appointment app urls under /api/
    # Consider renaming this to 'api/appointments/' for clarity
]