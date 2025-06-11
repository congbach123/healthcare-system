# healthcare_microservices/nurse_service/nurse_app/models.py

from django.db import models
import uuid
from django.utils import timezone # For timestamp defaults

class Nurse(models.Model):
    # Primary key links to the User in User Service
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Nurse-specific data
    employee_id = models.CharField(max_length=50, unique=True) # Example nurse-specific field

    # Consider adding other fields like:
    # certifications = models.TextField(blank=True, null=True)
    # department = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Nurse Profile ({self.employee_id})"

    class Meta:
        verbose_name = "Nurse Profile"
        verbose_name_plural = "Nurse Profiles"


class PatientVitals(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # UUIDs referencing the Patient and Nurse users in the User Service
    patient_user_id = models.UUIDField(db_index=True)
    nurse_user_id = models.UUIDField(db_index=True)

    timestamp = models.DateTimeField(default=timezone.now, db_index=True) # When vitals were recorded

    # Fields for specific vital signs (examples)
    temperature_celsius = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True) # e.g., 36.50
    blood_pressure_systolic = models.IntegerField(null=True, blank=True) # e.g., 120
    blood_pressure_diastolic = models.IntegerField(null=True, blank=True) # e.g., 80
    heart_rate_bpm = models.IntegerField(null=True, blank=True) # e.g., 75
    respiratory_rate_bpm = models.IntegerField(null=True, blank=True) # e.g., 16
    oxygen_saturation_percentage = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True) # e.g., 98.50

    notes = models.TextField(blank=True, null=True) # Notes about the vitals or patient condition

    created_at = models.DateTimeField(auto_now_add=True) # When the record was created in the DB
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        try:
            timestamp_str = self.timestamp.strftime('%Y-%m-%d %H:%M')
            return f"Vitals for {self.patient_user_id} by {self.nurse_user_id} at {timestamp_str}"
        except AttributeError:
            return f"Vitals {self.id}"


    class Meta:
        verbose_name = "Patient Vitals"
        verbose_name_plural = "Patient Vitals"
        # Ordering by timestamp is usually useful for vitals
        ordering = ['-timestamp'] # Newest first
        # Index for looking up vitals for a specific patient
        indexes = [
            models.Index(fields=['patient_user_id', '-timestamp']), # Patient vitals, newest first
            models.Index(fields=['nurse_user_id', '-timestamp']), # Vitals recorded by a nurse, newest first
        ]