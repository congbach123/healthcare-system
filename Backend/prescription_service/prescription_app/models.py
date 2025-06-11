# healthcare_microservices/prescription_service/prescription_app/models.py

from django.db import models
import uuid
from django.utils import timezone

class Prescription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # UUIDs referencing the Patient and the Doctor who wrote the prescription
    patient_user_id = models.UUIDField(db_index=True)
    doctor_user_id = models.UUIDField(db_index=True)

    prescription_date = models.DateTimeField(default=timezone.now, db_index=True)

    # Medication details (simple fields for now)
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100) # e.g., "500mg"
    frequency = models.CharField(max_length=100) # e.g., "Once daily", "Every 4-6 hours"
    duration = models.CharField(max_length=100) # e.g., "10 days", "Until finished"
    notes = models.TextField(blank=True, null=True) # Doctor's notes

    STATUS_CHOICES = (
        ('active', 'Active'),
        ('filled', 'Filled'),
        ('cancelled', 'Cancelled'), 
        ('expired', 'Expired'), # Could be set automatically based on duration or date
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)

    # Link to the Pharmacist who fulfilled it (Optional, Nullable)
    fulfilled_by_pharmacist_user_id = models.UUIDField(null=True, blank=True, db_index=True)
    fulfilled_date = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        try:
             presc_date_str = self.prescription_date.strftime('%Y-%m-%d')
             return f"Prescription {self.id} for {self.medication_name} on {presc_date_str}"
        except AttributeError:
            return f"Prescription {self.id}"

    class Meta:
        verbose_name = "Prescription"
        verbose_name_plural = "Prescriptions"
        ordering = ['-prescription_date'] # Newest first
        indexes = [
            models.Index(fields=['patient_user_id', '-prescription_date']), # Prescriptions for a patient
            models.Index(fields=['doctor_user_id', '-prescription_date']), # Prescriptions by a doctor
            models.Index(fields=['status']), # Filter by status
            models.Index(fields=['fulfilled_by_pharmacist_user_id']), # Prescriptions filled by a pharmacist
        ]