# healthcare_microservices/prescription_service/prescription_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('prescription_app.urls')), # Include prescription app urls under /api/
    # Consider renaming this to 'api/prescriptions/'
]