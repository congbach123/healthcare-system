# healthcare_microservices/administrator_service/administrator_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('administrator_app.urls')), # Include admin app urls under /api/
    # Consider renaming this to 'api/admin/'
]