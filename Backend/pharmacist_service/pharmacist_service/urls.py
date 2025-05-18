# healthcare_microservices/pharmacist_service/pharmacist_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('pharmacist_app.urls')), # Include pharmacist app urls under /api/
    # Consider renaming this to 'api/pharmacists/' for clarity
]