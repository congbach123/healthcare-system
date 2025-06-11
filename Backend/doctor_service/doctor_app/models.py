# healthcare_microservices/doctor_service/doctor_app/models.py

from django.db import models
import uuid

class Doctor(models.Model):
    # This UUID field is the primary key for the Doctor model.
    # It links directly to the 'id' (UUID) of the corresponding User
    # in the User Service.
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Doctor-specific data - ONLY include data NOT in the User Service User model
    specialization = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True) # License numbers are typically unique
    phone_number = models.CharField(max_length=20, blank=True, null=True) # Assuming phone/address are specific

    # We might also add other doctor-specific fields later, like:
    # office_location_address = models.TextField(blank=True, null=True)
    # availability_json = models.JSONField(null=True, blank=True) # Complex scheduling data

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        # Without calling the User Service, we can only show the user_id or license
        return f"Doctor Profile ({self.license_number})"

    class Meta:
        verbose_name = "Doctor Profile"
        verbose_name_plural = "Doctor Profiles"
        # ordering = ['user_id'] # Optional