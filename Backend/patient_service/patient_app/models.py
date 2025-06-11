# healthcare_microservices/patient_service/patient_app/models.py

from django.db import models
import uuid

class Patient(models.Model):
    # This UUID field is the primary key for the Patient model.
    # It is designed to match the 'id' (UUID) of the corresponding User
    # in the User Service. This establishes the link.
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Patient-specific data - ONLY include data NOT in the User Service User model
    date_of_birth = models.DateField(null=True, blank=True) # null=True allows creating a profile without DoB initially
    address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    # We might also add other patient-specific fields later, like:
    # blood_type = models.CharField(max_length=5, blank=True, null=True)
    # allergies = models.TextField(blank=True, null=True)
    # primary_care_physician_user_id = models.UUIDField(null=True, blank=True) # Linking to a doctor user_id

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        # Without calling the User Service, we can only show the user_id or a generic string
        # In a real scenario, you might add a cached name field updated via service communication.
        return f"Patient Profile ({self.user_id})"

    class Meta:
        verbose_name = "Patient Profile"
        verbose_name_plural = "Patient Profiles"
        # UUID primary key doesn't usually need ordering unless specific to your query needs
        # ordering = ['user_id']