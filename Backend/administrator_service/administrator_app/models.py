# healthcare_microservices/administrator_service/administrator_app/models.py

from django.db import models
import uuid

class Administrator(models.Model):
    # Primary key links to the User in User Service
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Administrator-specific data (keep simple)
    internal_admin_id = models.CharField(max_length=50, unique=True) # Example admin-specific field

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Administrator Profile ({self.internal_admin_id})"

    class Meta:
        verbose_name = "Administrator Profile"
        verbose_name_plural = "Administrator Profiles"