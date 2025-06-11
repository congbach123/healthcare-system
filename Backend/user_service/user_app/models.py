# healthcare_microservices/user_service/user_app/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    # Override the default integer primary key with UUID
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Define possible user types
    USER_TYPE_CHOICES = (
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('pharmacist', 'Pharmacist'),
        ('nurse', 'Nurse'),
        ('administrator', 'Administrator'),
        ('insurance_provider', 'Insurance Provider'),
        ('lab_technician', 'Laboratory Technician'),
        # Add other types as needed
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='patient')

    # Note: username, password, first_name, last_name, email are inherited from AbstractUser
    # Don't add them again here.

    def __str__(self):
        # Use first/last name if available, otherwise username
        if self.first_name and self.last_name:
             return f"{self.first_name} {self.last_name} ({self.user_type})"
        return f"{self.username} ({self.user_type})"

    class Meta:
         # Add db_table if you want a specific table name, otherwise Django uses appname_modelname (user_app_user)
         # db_table = 'user_users' # Optional

         # Django automatically adds 'auth.user' related_names. If you get errors later related to
         # auth user conflicts when setting up other services, you might need to add
         # related_name arguments to the groups/user_permissions fields if you were
         # inheriting from AbstractBaseUser directly. AbstractUser usually handles this.
         pass # No extra meta options needed for now
    
    