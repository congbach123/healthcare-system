# healthcare_microservices/user_service/user_service/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/user/', include('user_app.urls')), # Include user app urls under a prefix
]