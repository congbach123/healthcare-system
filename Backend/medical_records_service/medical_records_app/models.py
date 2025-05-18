# healthcare_microservices/medical_records_service/medical_records_app/models.py

from django.db import models
import uuid
from django.utils import timezone

class DoctorReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # UUIDs referencing the Patient and the Doctor who wrote the report
    patient_user_id = models.UUIDField(db_index=True)
    doctor_user_id = models.UUIDField(db_index=True)

    report_date = models.DateTimeField(default=timezone.now, db_index=True)
    title = models.CharField(max_length=255)
    content = models.TextField() # The narrative of the report

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        try:
             report_date_str = self.report_date.strftime('%Y-%m-%d')
             return f"Doctor Report '{self.title}' for Patient {self.patient_user_id} on {report_date_str}"
        except AttributeError:
            return f"Doctor Report {self.id}"

    class Meta:
        verbose_name = "Doctor Report"
        verbose_name_plural = "Doctor Reports"
        ordering = ['-report_date'] # Newest reports first
        indexes = [
            models.Index(fields=['patient_user_id', '-report_date']), # Reports for a specific patient
            models.Index(fields=['doctor_user_id', '-report_date']), # Reports written by a doctor
        ]