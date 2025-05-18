# healthcare_microservices/identity_service/identity_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/identity/', include('identity_app.urls')), # Include identity app urls under a prefix
]