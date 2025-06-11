# healthcare_microservices/lab_service/lab_app/models.py

from django.db import models
import uuid
from django.utils import timezone

# Choose one based on your Django version:
from django.db.models import JSONField # Django 3.1+


class LabTechnician(models.Model):
    # Primary key links to the User in User Service
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Lab Technician-specific data
    employee_id = models.CharField(max_length=50, unique=True) # Example lab tech-specific field

    # Consider adding other fields like:
    # certifications = models.TextField(blank=True, null=True)
    # specialization = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LabTechnician Profile ({self.employee_id})"

    class Meta:
        verbose_name = "Lab Technician Profile"
        verbose_name_plural = "Lab Technician Profiles"


class LabOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # UUIDs referencing the Patient and Ordering Doctor users in the User Service
    patient_user_id = models.UUIDField(db_index=True)
    doctor_user_id = models.UUIDField(db_index=True) # The doctor who ordered the test

    order_date = models.DateTimeField(default=timezone.now, db_index=True)

    # Simple text field for test type for now. Could be a foreign key to a TestCatalog model.
    test_type = models.CharField(max_length=100)

    ORDER_STATUS_CHOICES = (
        ('ordered', 'Ordered'),
        ('sample_collected', 'Sample Collected'),
        ('testing_in_progress', 'Testing In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='ordered', db_index=True)

    notes = models.TextField(blank=True, null=True) # Doctor's notes/instructions for the lab

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        try:
             order_date_str = self.order_date.strftime('%Y-%m-%d %H:%M')
             return f"Lab Order {self.id} ({self.test_type}) for Patient {self.patient_user_id} on {order_date_str}"
        except AttributeError:
             return f"Lab Order {self.id} ({self.test_type})"


    class Meta:
        verbose_name = "Lab Order"
        verbose_name_plural = "Lab Orders"
        ordering = ['-order_date'] # Newest orders first
        indexes = [
            models.Index(fields=['patient_user_id', '-order_date']), # Orders for a specific patient
            models.Index(fields=['doctor_user_id', '-order_date']), # Orders placed by a doctor
            models.Index(fields=['status']), # Filter by status
        ]


class LabResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to the LabOrder this result belongs to
    # Storing the UUID directly maintains loose coupling internally if needed later,
    # but a ForeignKey is often simpler within a single app/service.
    # Let's use UUIDField to be consistent with linking by ID across services.
    lab_order_id = models.UUIDField(db_index=True)

    # UUID referencing the Lab Technician user who recorded the result
    lab_technician_user_id = models.UUIDField(db_index=True)

    result_date = models.DateTimeField(default=timezone.now, db_index=True) # When the result was finalized/entered

    # Store the actual test results as JSON
    result_data = JSONField() # Requires django.db.models.JSONField (Django 3.1+) or jsonfield.JSONField

    RESULT_STATUS_CHOICES = (
        ('preliminary', 'Preliminary'),
        ('final', 'Final'),
        ('corrected', 'Corrected'),
    )
    status = models.CharField(max_length=20, choices=RESULT_STATUS_CHOICES, default='final', db_index=True)

    notes = models.TextField(blank=True, null=True) # Lab Technician's notes

    created_at = models.DateTimeField(auto_now_add=True) # When the record was created in the DB
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        try:
             result_date_str = self.result_date.strftime('%Y-%m-%d')
             return f"Lab Result {self.id} for Order {self.lab_order_id} on {result_date_str}"
        except AttributeError:
            return f"Lab Result {self.id}"


    class Meta:
        verbose_name = "Lab Result"
        verbose_name_plural = "Lab Results"
        ordering = ['-result_date'] # Newest results first
        indexes = [
            models.Index(fields=['lab_order_id']), # Results for a specific order
            models.Index(fields=['lab_technician_user_id', '-result_date']), # Results recorded by a lab tech
            models.Index(fields=['status']), # Filter by status
        ]