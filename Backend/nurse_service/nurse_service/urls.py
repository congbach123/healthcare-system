# healthcare_microservices/nurse_service/nurse_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('nurse_app.urls')), # Include nurse app urls under /api/
    # Consider renaming this to 'api/nurse/' or 'api/nurses/'
]