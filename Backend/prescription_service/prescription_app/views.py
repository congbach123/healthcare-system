# healthcare_microservices/prescription_service/prescription_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Prescription
import json
from datetime import datetime
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
import requests
from django.conf import settings
from django.db.models import Q

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

# Helper function to call User Service and return user data or error (same pattern)
def get_user_from_user_service(user_id):
    """Fetches user data from the User Service."""
    user_service_url = f"{settings.USER_SERVICE_BASE_URL}/users/{user_id}/"
    try:
        user_response = requests.get(user_service_url)
        if user_response.status_code == 200:
            user_data = user_response.json()
            # Remove redundant/potentially sensitive fields for aggregation context
            user_data.pop('id', None)
            user_data.pop('password', None)
            user_data.pop('is_staff', None)
            user_data.pop('is_superuser', None)
            user_data.pop('date_joined', None)
            user_data.pop('last_login', None)
            # user_data.pop('is_active', None) # Decide if you want is_active
            return user_data, None # Return data and no error
        elif user_response.status_code == 404:
            return None, f"User user not found for ID {user_id}"
        else:
            return None, f"User Service returned error {user_response.status_code}: {user_response.text}"
    except requests.exceptions.RequestException as e:
        return None, f"Network error calling User Service for user ID {user_id}: {e}"
    except Exception as e:
        return None, f"Unexpected error processing User Service response for user ID {user_id}: {e}"


# --- Prescription Views ---
@csrf_exempt # WARNING: Disable CSRF protection for API POST.
def prescription_list_create_view(request):
    if request.method == 'GET':
        # Build filters for Prescriptions
        filters = Q()
        patient_user_id_str = request.GET.get('patient_user_id')
        doctor_user_id_str = request.GET.get('doctor_user_id')
        pharmacist_user_id_str = request.GET.get('fulfilled_by_pharmacist_user_id')
        status = request.GET.get('status')
        prescription_date_after_str = request.GET.get('prescription_date_after') # ISO 8601
        prescription_date_before_str = request.GET.get('prescription_date_before') # ISO 8601
        # search_query = request.GET.get('search') # Basic text search on medication name/notes?

        if patient_user_id_str:
            try: filters &= Q(patient_user_id=UUID(patient_user_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid patient_user_id format'}, status=400)
        if doctor_user_id_str:
            try: filters &= Q(doctor_user_id=UUID(doctor_user_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid doctor_user_id format'}, status=400)
        if pharmacist_user_id_str:
             try: filters &= Q(fulfilled_by_pharmacist_user_id=UUID(pharmacist_user_id_str))
             except ValueError: return JsonResponse({'error': 'Invalid fulfilled_by_pharmacist_user_id format'}, status=400)

        if status and status in [choice[0] for choice in Prescription.STATUS_CHOICES]:
            filters &= Q(status=status)
        elif status:
            return JsonResponse({'error': f'Invalid status. Allowed: {", ".join([choice[0] for choice in Prescription.STATUS_CHOICES])}'}, status=400)

        if prescription_date_after_str:
             try:
                 date_after = timezone.datetime.fromisoformat(prescription_date_after_str)
                 if timezone.is_naive(date_after): date_after = timezone.make_aware(date_after, timezone.get_current_timezone())
                 filters &= Q(prescription_date__gte=date_after)
             except ValueError: return JsonResponse({'error': 'Invalid prescription_date_after format. Use ISO 8601.'}, status=400)
        if prescription_date_before_str:
             try:
                 date_before = timezone.datetime.fromisoformat(prescription_date_before_str)
                 if timezone.is_naive(date_before): date_before = timezone.make_aware(date_before, timezone.get_current_timezone())
                 filters &= Q(prescription_date__lte=date_before)
             except ValueError: return JsonResponse({'error': 'Invalid prescription_date_before format. Use ISO 8601.'}, status=400)
        # if search_query:
        #     filters &= (Q(medication_name__icontains=search_query) | Q(notes__icontains=search_query))


        prescriptions = Prescription.objects.filter(filters).order_by('-prescription_date')
        aggregated_data = []

        # Collect all unique user_ids needed for aggregation efficiently
        patient_ids = set()
        doctor_ids = set()
        pharmacist_ids = set()

        for prescription in prescriptions:
             patient_ids.add(prescription.patient_user_id)
             doctor_ids.add(prescription.doctor_user_id)
             if prescription.fulfilled_by_pharmacist_user_id:
                 pharmacist_ids.add(prescription.fulfilled_by_pharmacist_user_id)

        # --- Aggregate User User Data ---
        # Fetch all needed User users in potentially optimized calls (if User had bulk GET)
        # For now, we'll use the helper function which calls one by one, still demonstrating the call.
        # Sticking to the simple helper for demo consistency.
        # In a real system, you'd fetch all unique IDs (patient_ids | doctor_ids | pharmacist_ids)
        # and map the results to avoid redundant calls for the same user.

        for prescription in prescriptions:
            presc_data = {
                'id': str(prescription.id),
                'patient_user_id': str(prescription.patient_user_id),
                'doctor_user_id': str(prescription.doctor_user_id),
                'prescription_date': prescription.prescription_date.isoformat() if prescription.prescription_date else None,
                'medication_name': prescription.medication_name,
                'dosage': prescription.dosage,
                'frequency': prescription.frequency,
                'duration': prescription.duration,
                'notes': prescription.notes,
                'status': prescription.status,
                'fulfilled_by_pharmacist_user_id': str(prescription.fulfilled_by_pharmacist_user_id) if prescription.fulfilled_by_pharmacist_user_id else None,
                'fulfilled_date': prescription.fulfilled_date.isoformat() if prescription.fulfilled_date else None,
                'created_at': prescription.created_at.isoformat() if prescription.created_at else None,
                'updated_at': prescription.updated_at.isoformat() if prescription.updated_at else None,
            }

            combined_entry = {**presc_data} # Start with prescription data

            # Aggregate patient, doctor, and pharmacist user data
            patient_user_data, patient_error = get_user_from_user_service(prescription.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(prescription.doctor_user_id)

            if patient_user_data: combined_entry['patient'] = patient_user_data
            elif patient_error: combined_entry['_patient_user_error'] = patient_error
            if doctor_user_data: combined_entry['doctor'] = doctor_user_data
            elif doctor_error: combined_entry['_doctor_user_error'] = doctor_error

            if prescription.fulfilled_by_pharmacist_user_id:
                 pharmacist_user_data, pharmacist_error = get_user_from_user_service(prescription.fulfilled_by_pharmacist_user_id)
                 if pharmacist_user_data: combined_entry['fulfilled_by_pharmacist'] = pharmacist_user_data
                 elif pharmacist_error: combined_entry['_pharmacist_user_error'] = pharmacist_error


            aggregated_data.append(combined_entry)

        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')


    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Required fields for creating a prescription
        patient_user_id_str = data.get('patient_user_id')
        doctor_user_id_str = data.get('doctor_user_id')
        medication_name = data.get('medication_name')
        dosage = data.get('dosage')
        frequency = data.get('frequency')
        duration = data.get('duration')
        prescription_date_str = data.get('prescription_date') # Optional, defaults to now
        notes = data.get('notes')
        status = data.get('status', 'active') # Defaults to active

        if not patient_user_id_str or not doctor_user_id_str or not medication_name or not dosage or not frequency or not duration:
             return JsonResponse({'error': 'patient_user_id, doctor_user_id, medication_name, dosage, frequency, and duration are required'}, status=400)

        try:
             patient_user_id_uuid = UUID(patient_user_id_str)
             doctor_user_id_uuid = UUID(doctor_user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid UUID format for patient_user_id or doctor_user_id'}, status=400)

        prescription_date = None
        if prescription_date_str:
            try:
                prescription_date = timezone.datetime.fromisoformat(prescription_date_str)
                if timezone.is_naive(prescription_date): prescription_date = timezone.make_aware(prescription_date, timezone.get_current_timezone())
            except ValueError: return JsonResponse({'error': 'Invalid prescription_date format. Use ISO 8601.'}, status=400)

        if status not in [choice[0] for choice in Prescription.STATUS_CHOICES]:
             return JsonResponse({'error': f'Invalid status "{status}". Allowed: {", ".join([choice[0] for choice in Prescription.STATUS_CHOICES])}'}, status=400)

        # --- Optional S2S Validation during Creation ---
        # You could call User/Patient/Doctor services here to verify user_ids exist and are of correct type.
        # Skipping for basic demo.
        # --- End Optional S2S Validation ---


        try:
            # Create the Prescription
            prescription = Prescription.objects.create(
                patient_user_id=patient_user_id_uuid,
                doctor_user_id=doctor_user_id_uuid,
                prescription_date=prescription_date if prescription_date is not None else timezone.now(),
                medication_name=medication_name,
                dosage=dosage,
                frequency=frequency,
                duration=duration,
                notes=notes,
                status=status,
                # fulfilled_by_pharmacist_user_id and fulfilled_date are set via update later
            )

            # Manually prepare response data for the created prescription
            response_data = {
                'id': str(prescription.id),
                'patient_user_id': str(prescription.patient_user_id),
                'doctor_user_id': str(prescription.doctor_user_id),
                'prescription_date': prescription.prescription_date.isoformat() if prescription.prescription_date else None,
                'medication_name': prescription.medication_name,
                'dosage': prescription.dosage,
                'frequency': prescription.frequency,
                'duration': prescription.duration,
                'notes': prescription.notes,
                'status': prescription.status,
                'fulfilled_by_pharmacist_user_id': None,
                'fulfilled_date': None,
                'created_at': prescription.created_at.isoformat() if prescription.created_at else None,
                'updated_at': prescription.updated_at.isoformat() if prescription.updated_at else None,
            }

            return JsonResponse(response_data, status=201)

        except Exception as e:
            print(f"Error creating prescription: {e}")
            return JsonResponse({'error': 'Could not create prescription', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# Detail, Update, Delete view for a single Prescription by ID
@csrf_exempt
def prescription_detail_view(request, prescription_id: UUID): # prescription_id is UUID object from URL converter
    try:
        # Fetch the prescription from the Prescription Service database
        prescription = Prescription.objects.get(id=prescription_id)
    except Prescription.DoesNotExist:
        return JsonResponse({'error': 'Prescription not found'}, status=404)
    except Exception as e:
         print(f"Error fetching prescription for detail view: {e}")
         return JsonResponse({'error': 'Could not fetch prescription', 'details': str(e)}, status=500) # Catch potential UUID validation errors if URL converter wasn't used correctly


    if request.method == 'GET':
        # 1. Get prescription data
        presc_data = {
            'id': str(prescription.id),
            'patient_user_id': str(prescription.patient_user_id),
            'doctor_user_id': str(prescription.doctor_user_id),
            'prescription_date': prescription.prescription_date.isoformat() if prescription.prescription_date else None,
            'medication_name': prescription.medication_name,
            'dosage': prescription.dosage,
            'frequency': prescription.frequency,
            'duration': prescription.duration,
            'notes': prescription.notes,
            'status': prescription.status,
            'fulfilled_by_pharmacist_user_id': str(prescription.fulfilled_by_pharmacist_user_id) if prescription.fulfilled_by_pharmacist_user_id else None,
            'fulfilled_date': prescription.fulfilled_date.isoformat() if prescription.fulfilled_date else None,
            'created_at': prescription.created_at.isoformat() if prescription.created_at else None,
            'updated_at': prescription.updated_at.isoformat() if prescription.updated_at else None,
        }

        combined_data = {**presc_data} # Start with prescription data

        # 2. Call User Service for patient, doctor, and pharmacist data for aggregation
        patient_user_data, patient_error = get_user_from_user_service(prescription.patient_user_id)
        doctor_user_data, doctor_error = get_user_from_user_service(prescription.doctor_user_id)

        if patient_user_data: combined_data['patient'] = patient_user_data
        elif patient_error: combined_data['_patient_user_error'] = patient_error
        if doctor_user_data: combined_data['doctor'] = doctor_user_data
        elif doctor_error: combined_data['_doctor_user_error'] = doctor_error

        if prescription.fulfilled_by_pharmacist_user_id:
             pharmacist_user_data, pharmacist_error = get_user_from_user_service(prescription.fulfilled_by_pharmacist_user_id)
             if pharmacist_user_data: combined_data['fulfilled_by_pharmacist'] = pharmacist_user_data
             elif pharmacist_error: combined_data['_pharmacist_user_error'] = pharmacist_error

        return JsonResponse(combined_data)

    # --- Implement PUT/PATCH for updates ---
    elif request.method in ['PUT', 'PATCH']:
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Allow updating specific fields
        updated_fields = {}

        if 'status' in data:
            if data['status'] not in [choice[0] for choice in Prescription.STATUS_CHOICES]:
                 return JsonResponse({'error': f'Invalid status "{data["status"]}". Allowed: {", ".join([choice[0] for choice in Prescription.STATUS_CHOICES])}'}, status=400)
            updated_fields['status'] = data['status']

        # Allow setting/updating fulfillment info
        if 'fulfilled_by_pharmacist_user_id' in data:
             pharmacist_id_str = data['fulfilled_by_pharmacist_user_id']
             if pharmacist_id_str is None: # Allow clearing fulfillment
                  updated_fields['fulfilled_by_pharmacist_user_id'] = None
             else:
                  try:
                       updated_fields['fulfilled_by_pharmacist_user_id'] = UUID(pharmacist_id_str)
                  except ValueError:
                       return JsonResponse({'error': 'Invalid UUID format for fulfilled_by_pharmacist_user_id'}, status=400)

        if 'fulfilled_date' in data:
             date_str = data['fulfilled_date']
             if date_str is None: # Allow clearing fulfilled date
                  updated_fields['fulfilled_date'] = None
             else:
                  try:
                      date = timezone.datetime.fromisoformat(date_str)
                      if timezone.is_naive(date): date = timezone.make_aware(date, timezone.get_current_timezone())
                      updated_fields['fulfilled_date'] = date
                  except ValueError:
                      return JsonResponse({'error': 'Invalid fulfilled_date format. Use ISO 8601.'}, status=400)

        # Allow updating other fields like notes? Medication/dosage/frequency/duration usually fixed once prescribed.
        if 'notes' in data:
             updated_fields['notes'] = data['notes']

        # Don't allow changing patient_user_id, doctor_user_id, prescription_date, created_at via update
        # These fields define the core record and its origin.

        if not updated_fields:
             return JsonResponse({'error': 'No updatable fields provided'}, status=400)

        try:
            # Update the prescription instance with the provided fields
            for field, value in updated_fields.items():
                setattr(prescription, field, value)

            prescription.full_clean() # Run model validation
            prescription.save() # Save changes, updated_at is auto-updated

            # Return the updated object data (aggregating user data)
            # Re-fetch to ensure updated_at is correct and aggregation is fresh
            updated_prescription = Prescription.objects.get(id=prescription_id) # Re-query


            presc_data = {
                'id': str(updated_prescription.id),
                'patient_user_id': str(updated_prescription.patient_user_id),
                'doctor_user_id': str(updated_prescription.doctor_user_id),
                'prescription_date': updated_prescription.prescription_date.isoformat() if updated_prescription.prescription_date else None,
                'medication_name': updated_prescription.medication_name,
                'dosage': updated_prescription.dosage,
                'frequency': updated_prescription.frequency,
                'duration': updated_prescription.duration,
                'notes': updated_prescription.notes,
                'status': updated_prescription.status,
                'fulfilled_by_pharmacist_user_id': str(updated_prescription.fulfilled_by_pharmacist_user_id) if updated_prescription.fulfilled_by_pharmacist_user_id else None,
                'fulfilled_date': updated_prescription.fulfilled_date.isoformat() if updated_prescription.fulfilled_date else None,
                'created_at': updated_prescription.created_at.isoformat() if updated_prescription.created_at else None,
                'updated_at': updated_prescription.updated_at.isoformat() if updated_prescription.updated_at else None,
            }

            combined_data = {**presc_data} # Start with prescription data

            # Aggregate patient, doctor, and pharmacist user data
            patient_user_data, patient_error = get_user_from_user_service(updated_prescription.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(updated_prescription.doctor_user_id)

            if patient_user_data: combined_data['patient'] = patient_user_data
            elif patient_error: combined_data['_patient_user_error'] = patient_error
            if doctor_user_data: combined_data['doctor'] = doctor_user_data
            elif doctor_error: combined_data['_doctor_user_error'] = doctor_error

            if updated_prescription.fulfilled_by_pharmacist_user_id:
                 pharmacist_user_data, pharmacist_error = get_user_from_user_service(updated_prescription.fulfilled_by_pharmacist_user_id)
                 if pharmacist_user_data: combined_data['fulfilled_by_pharmacist'] = pharmacist_user_data
                 elif pharmacist_error: combined_data['_pharmacist_user_error'] = pharmacist_error

            # Return the updated and aggregated data
            return JsonResponse(combined_data)


        except ValidationError as e:
             # Handle model validation errors (e.g., if you added max_length constraints)
             return JsonResponse({'error': 'Validation error', 'details': dict(e.message_dict)}, status=400)
        except Exception as e:
             print(f"Error updating prescription: {e}")
             return JsonResponse({'error': 'Could not update prescription', 'details': str(e)}, status=500)


    # Skipping DELETE for now
    elif request.method == 'DELETE':
        # ... (DELETE logic from previous code block) ...
        try:
            prescription.delete()
            return JsonResponse({'message': 'Prescription deleted successfully'}, status=204)

        except Exception as e:
             print(f"Error deleting prescription: {e}")
             return JsonResponse({'error': 'Could not delete prescription', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)