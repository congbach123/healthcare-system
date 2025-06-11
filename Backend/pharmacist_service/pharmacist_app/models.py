# healthcare_microservices/pharmacist_service/pharmacist_app/models.py

from django.db import models
import uuid

class Pharmacist(models.Model):
    # This UUID field is the primary key for the Pharmacist model.
    # It links directly to the 'id' (UUID) of the corresponding User
    # in the User Service.
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Pharmacist-specific data
    pharmacy_name = models.CharField(max_length=200)
    pharmacy_license_number = models.CharField(max_length=50, unique=True) # Unique license number
    phone_number = models.CharField(max_length=20, blank=True, null=True) # Pharmacy phone? Personal phone? Clarify scope. Let's assume personal.
    address = models.TextField(blank=True, null=True) # Personal address? Pharmacy address? Let's assume personal for now.

    # We might also add other pharmacist-specific fields later, like:
    # pharmacy_location_address = models.TextField(blank=True, null=True)
    # pharmacist_license_expiry_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        # Without calling User, show license or user_id
        return f"Pharmacist Profile ({self.pharmacy_license_number})"

    class Meta:
        verbose_name = "Pharmacist Profile"
        verbose_name_plural = "Pharmacist Profiles"
        # ordering = ['user_id'] # Optional