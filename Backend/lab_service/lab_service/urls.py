# healthcare_microservices/lab_service/lab_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('lab_app.urls')), # Include lab app urls under /api/
    # Consider renaming this to 'api/lab/' or similar
]