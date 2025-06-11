# healthcare_microservices/appointment_service/appointment_app/models.py

from django.db import models
import uuid

class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # UUIDs referencing users in the User Service
    # Consider adding db_index=True if you will frequently query by these IDs
    patient_user_id = models.UUIDField(db_index=True)
    doctor_user_id = models.UUIDField(db_index=True)

    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    STATUS_CHOICES = (
        ('booked', 'Booked'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('noshow', 'No Show'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='booked')

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        # Show basic info without external calls
        try:
             # Format the time if available, otherwise just use ID
             start_time_str = self.start_time.strftime('%Y-%m-%d %H:%M')
             return f"Appointment {self.id} ({self.status}) at {start_time_str}"
        except AttributeError:
             # Handle case where start_time might not be set (e.g., during creation before save)
             return f"Appointment {self.id} ({self.status})"


    class Meta:
        verbose_name = "Appointment"
        verbose_name_plural = "Appointments"
        # Index for efficient lookup by doctor and time range
        indexes = [
            models.Index(fields=['doctor_user_id', 'start_time', 'end_time']),
            models.Index(fields=['patient_user_id', 'start_time', 'end_time']),
            models.Index(fields=['status']), # Index if you frequently filter by status
        ]
        # Optional: Add a constraint for unique appointments per doctor/time?
        # constraints = [
        #     models.UniqueConstraint(fields=['doctor_user_id', 'start_time', 'end_time'], name='unique_doctor_appointment_time')
        # ]