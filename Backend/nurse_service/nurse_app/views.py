# healthcare_microservices/nurse_service/nurse_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Nurse, PatientVitals # Ensure both models are imported
import json
from datetime import datetime
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone # For timezone-aware datetimes
import requests
from django.conf import settings
from django.db.models import Q # For complex queries like filtering
from decimal import Decimal # To correctly handle Decimal fields

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

# Helper function to call User Service and return user data or error (same)
def get_user_from_user_service(user_id):
    """Fetches user data from the User Service."""
    user_service_url = f"{settings.USER_SERVICE_BASE_URL}/users/{user_id}/"
    try:
        user_response = requests.get(user_service_url)
        if user_response.status_code == 200:
            user_data = user_response.json()
            # Remove redundant/potentially sensitive fields
            user_data.pop('id', None)
            user_data.pop('password', None)
            user_data.pop('is_staff', None)
            user_data.pop('is_superuser', None)
            user_data.pop('date_joined', None)
            user_data.pop('last_login', None)
            # user_data.pop('is_active', None) # Decide if you want is_active
            return user_data, None
        elif user_response.status_code == 404:
            return None, f"User user not found for ID {user_id}"
        else:
            return None, f"User Service returned error {user_response.status_code}: {user_response.text}"
    except requests.exceptions.RequestException as e:
        return None, f"Network error calling User Service for user ID {user_id}: {e}"
    except Exception as e:
        return None, f"Unexpected error processing User Service response for user ID {user_id}: {e}"

# --- Nurse Profile Views (Keep these as they are - Checkpoint 26 passed) ---
@csrf_exempt
def nurse_profile_list_create_view(request):
    if request.method == 'GET':
        nurses = Nurse.objects.all()
        aggregated_data = []
        for nurse in nurses:
            nurse_data = {
                'user_id': str(nurse.user_id),
                'employee_id': nurse.employee_id,
                'created_at': nurse.created_at.isoformat() if nurse.created_at else None,
                'updated_at': nurse.updated_at.isoformat() if nurse.updated_at else None,
            }
            user_data, user_fetch_error = get_user_from_user_service(nurse.user_id)
            combined_data_entry = {**nurse_data}
            if user_data:
                combined_data_entry = {**user_data, **combined_data_entry}
            if user_fetch_error:
                 combined_data_entry['_user_error'] = user_fetch_error
            aggregated_data.append(combined_data_entry)
        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')

    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        user_id_str = data.get('user_id')
        employee_id = data.get('employee_id')
        if not user_id_str or not employee_id:
             return JsonResponse({'error': 'user_id and employee_id are required'}, status=400)
        try:
             user_id_uuid = UUID(user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid user_id format (must be a valid UUID string)'}, status=400)
        try:
            nurse = Nurse.objects.create(
                user_id=user_id_uuid,
                employee_id=employee_id
            )
            response_data = {
                'user_id': str(nurse.user_id),
                'employee_id': nurse.employee_id,
                'created_at': nurse.created_at.isoformat() if nurse.created_at else None,
                'updated_at': nurse.updated_at.isoformat() if nurse.updated_at else None,
            }
            return JsonResponse(response_data, status=201)
        except IntegrityError:
             return JsonResponse({'error': f'A nurse profile already exists for user ID {user_id_str} or employee ID {employee_id} is duplicated.'}, status=409)
        except Exception as e:
            print(f"Error creating nurse profile: {e}")
            return JsonResponse({'error': 'Could not create nurse profile', 'details': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# Keep nurse_profile_detail_view as is for now, we'll add update/delete later
def nurse_profile_detail_view(request, user_id: UUID):
    if request.method == 'GET':
        try:
            nurse = Nurse.objects.get(user_id=user_id)
            nurse_data = {
                'user_id': str(nurse.user_id),
                'employee_id': nurse.employee_id,
                'created_at': nurse.created_at.isoformat() if nurse.created_at else None,
                'updated_at': nurse.updated_at.isoformat() if nurse.updated_at else None,
            }
            user_data, user_fetch_error = get_user_from_user_service(nurse.user_id)
            combined_data = {**nurse_data}
            if user_data:
                combined_data = {**user_data, **combined_data}
            if user_fetch_error:
                 combined_data['_user_error'] = user_fetch_error
            return JsonResponse(combined_data)
        except Nurse.DoesNotExist:
            return JsonResponse({'error': 'Nurse profile not found'}, status=404)
        except Exception as e:
             print(f"Error fetching nurse profile: {e}")
             return JsonResponse({'error': 'Could not fetch nurse profile', 'details': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# --- Patient Vitals Views ---
@csrf_exempt # WARNING: Disable CSRF protection for API POST.
def patient_vitals_list_create_view(request):
    if request.method == 'GET':
        # Build query filters from request query parameters
        filters = Q()

        patient_user_id_str = request.GET.get('patient_user_id')
        nurse_user_id_str = request.GET.get('nurse_user_id')
        start_time_after_str = request.GET.get('start_time_after')
        end_time_before_str = request.GET.get('end_time_before')

        if patient_user_id_str:
            try:
                 patient_uuid = UUID(patient_user_id_str)
                 filters &= Q(patient_user_id=patient_uuid)
            except ValueError:
                 return JsonResponse({'error': 'Invalid patient_user_id format'}, status=400)

        if nurse_user_id_str:
            try:
                 nurse_uuid = UUID(nurse_user_id_str)
                 filters &= Q(nurse_user_id=nurse_uuid)
            except ValueError:
                 return JsonResponse({'error': 'Invalid nurse_user_id format'}, status=400)

        if start_time_after_str:
             try:
                 start_time_after = timezone.datetime.fromisoformat(start_time_after_str)
                 if timezone.is_naive(start_time_after):
                     start_time_after = timezone.make_aware(start_time_after, timezone.get_current_timezone())
                 filters &= Q(timestamp__gte=start_time_after)
             except ValueError:
                  return JsonResponse({'error': 'Invalid start_time_after format. Use ISO 8601.'}, status=400)

        if end_time_before_str:
             try:
                 end_time_before = timezone.datetime.fromisoformat(end_time_before_str)
                 if timezone.is_naive(end_time_before):
                      end_time_before = timezone.make_aware(end_time_before, timezone.get_current_timezone())
                 filters &= Q(timestamp__lte=end_time_before)
             except ValueError:
                  return JsonResponse({'error': 'Invalid end_time_before format. Use ISO 8601.'}, status=400)


        vitals_records = PatientVitals.objects.filter(filters).order_by('-timestamp')

        aggregated_data = []

        # Collect all patient and nurse user IDs needed for this list
        patient_ids = set()
        nurse_ids = set()
        for vital in vitals_records:
             patient_ids.add(vital.patient_user_id)
             nurse_ids.add(vital.nurse_user_id)

        # --- Optimization Note ---
        # For large lists, calling get_user_from_user_service inside the loop (N*2 calls) is inefficient.
        # A better approach (if User Service supported it) would be to make *batch* requests:
        # e.g., POST /api/user/users/bulk/ with a list of IDs.
        # Since we don't have a bulk endpoint, we'll stick to calling one by one for the demo,
        # but this is a performance bottleneck in real microservices.
        # --- End Optimization Note ---

        # Fetch user data for all required IDs before the main loop (still one-by-one)
        patient_users = {}
        nurse_users = {}
        patient_errors = {}
        nurse_errors = {}

        for p_id in patient_ids:
            user_data, err = get_user_from_user_service(p_id)
            if user_data:
                patient_users[p_id] = user_data
            else:
                patient_errors[p_id] = err

        for n_id in nurse_ids:
            user_data, err = get_user_from_user_service(n_id)
            if user_data:
                nurse_users[n_id] = user_data
            else:
                nurse_errors[n_id] = err

        # Now iterate through vitals and combine with fetched user data
        for vital in vitals_records:
            vital_data = {
                'id': str(vital.id),
                'patient_user_id': str(vital.patient_user_id),
                'nurse_user_id': str(vital.nurse_user_id),
                'timestamp': vital.timestamp.isoformat() if vital.timestamp else None,
                'temperature_celsius': float(vital.temperature_celsius) if vital.temperature_celsius is not None else None,
                'blood_pressure_systolic': vital.blood_pressure_systolic,
                'blood_pressure_diastolic': vital.blood_pressure_diastolic,
                'heart_rate_bpm': vital.heart_rate_bpm,
                'respiratory_rate_bpm': vital.respiratory_rate_bpm,
                'oxygen_saturation_percentage': float(vital.oxygen_saturation_percentage) if vital.oxygen_saturation_percentage is not None else None,
                'notes': vital.notes,
                'created_at': vital.created_at.isoformat() if vital.created_at else None,
                'updated_at': vital.updated_at.isoformat() if vital.updated_at else None,
            }

            combined_entry = {**vital_data}

            # Get pre-fetched user data or error
            patient_user_data = patient_users.get(vital.patient_user_id)
            patient_error = patient_errors.get(vital.patient_user_id)
            nurse_user_data = nurse_users.get(vital.nurse_user_id)
            nurse_error = nurse_errors.get(vital.nurse_user_id)

            if patient_user_data:
                combined_entry['patient'] = patient_user_data
            elif patient_error:
                combined_entry['_patient_user_error'] = patient_error

            if nurse_user_data:
                combined_entry['nurse'] = nurse_user_data
            elif nurse_error:
                combined_entry['_nurse_user_error'] = nurse_error

            aggregated_data.append(combined_entry)

        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')


    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        patient_user_id_str = data.get('patient_user_id')
        nurse_user_id_str = data.get('nurse_user_id')
        timestamp_str = data.get('timestamp')

        if not patient_user_id_str or not nurse_user_id_str:
             return JsonResponse({'error': 'patient_user_id and nurse_user_id are required'}, status=400)

        try:
             patient_user_id_uuid = UUID(patient_user_id_str)
             nurse_user_id_uuid = UUID(nurse_user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid UUID format for patient_user_id or nurse_user_id'}, status=400)

        timestamp = None
        if timestamp_str:
            try:
                 timestamp = timezone.datetime.fromisoformat(timestamp_str)
                 if timezone.is_naive(timestamp):
                     timestamp = timezone.make_aware(timestamp, timezone.get_current_timezone())
            except ValueError:
                 return JsonResponse({'error': 'Invalid timestamp format. Use ISO 8601.'}, status=400)

        # Extract vital fields, handling Decimal conversions
        vital_fields = {}
        try:
            if 'temperature_celsius' in data and data['temperature_celsius'] is not None:
                vital_fields['temperature_celsius'] = Decimal(str(data['temperature_celsius'])) # Convert to string then Decimal
            if 'blood_pressure_systolic' in data and data['blood_pressure_systolic'] is not None:
                vital_fields['blood_pressure_systolic'] = int(data['blood_pressure_systolic']) # Ensure integer
            if 'blood_pressure_diastolic' in data and data['blood_pressure_diastolic'] is not None:
                vital_fields['blood_pressure_diastolic'] = int(data['blood_pressure_diastolic'])
            if 'heart_rate_bpm' in data and data['heart_rate_bpm'] is not None:
                vital_fields['heart_rate_bpm'] = int(data['heart_rate_bpm'])
            if 'respiratory_rate_bpm' in data and data['respiratory_rate_bpm'] is not None:
                vital_fields['respiratory_rate_bpm'] = int(data['respiratory_rate_bpm'])
            if 'oxygen_saturation_percentage' in data and data['oxygen_saturation_percentage'] is not None:
                 vital_fields['oxygen_saturation_percentage'] = Decimal(str(data['oxygen_saturation_percentage'])) # Convert to string then Decimal
            if 'notes' in data:
                 vital_fields['notes'] = data['notes']

        except (ValueError, TypeError) as e:
             return JsonResponse({'error': 'Invalid data type for vital fields', 'details': str(e)}, status=400)


        try:
            vitals = PatientVitals.objects.create(
                patient_user_id=patient_user_id_uuid,
                nurse_user_id=nurse_user_id_uuid,
                timestamp=timestamp if timestamp is not None else timezone.now(),
                **vital_fields # Unpack the valid vital fields
            )

            response_data = {
                'id': str(vitals.id),
                'patient_user_id': str(vitals.patient_user_id),
                'nurse_user_id': str(vitals.nurse_user_id),
                'timestamp': vitals.timestamp.isoformat() if vitals.timestamp else None,
                'temperature_celsius': float(vitals.temperature_celsius) if vitals.temperature_celsius is not None else None,
                'blood_pressure_systolic': vitals.blood_pressure_systolic,
                'blood_pressure_diastolic': vitals.blood_pressure_diastolic,
                'heart_rate_bpm': vitals.heart_rate_bpm,
                'respiratory_rate_bpm': vitals.respiratory_rate_bpm,
                'oxygen_saturation_percentage': float(vitals.oxygen_saturation_percentage) if vitals.oxygen_saturation_percentage is not None else None,
                'notes': vitals.notes,
                'created_at': vitals.created_at.isoformat() if vitals.created_at else None,
                'updated_at': vitals.updated_at.isoformat() if vitals.updated_at else None,
            }

            return JsonResponse(response_data, status=201)

        except Exception as e:
            print(f"Error creating vital record: {e}")
            return JsonResponse({'error': 'Could not create vital record', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# Detail, Update, Delete view for a single Patient Vitals record by ID
def patient_vitals_detail_view(request, vitals_id: UUID): # vitals_id is UUID object from URL converter
    try:
        vital = PatientVitals.objects.get(id=vitals_id)
    except PatientVitals.DoesNotExist:
        return JsonResponse({'error': 'Patient Vitals record not found'}, status=404)
    except Exception as e:
         print(f"Error fetching vital record for detail view: {e}")
         return JsonResponse({'error': 'Could not fetch vital record', 'details': str(e)}, status=500)


    if request.method == 'GET':
        vital_data = {
            'id': str(vital.id),
            'patient_user_id': str(vital.patient_user_id),
            'nurse_user_id': str(vital.nurse_user_id),
            'timestamp': vital.timestamp.isoformat() if vital.timestamp else None,
            'temperature_celsius': float(vital.temperature_celsius) if vital.temperature_celsius is not None else None,
            'blood_pressure_systolic': vital.blood_pressure_systolic,
            'blood_pressure_diastolic': vital.blood_pressure_diastolic,
            'heart_rate_bpm': vital.heart_rate_bpm,
            'respiratory_rate_bpm': vital.respiratory_rate_bpm,
            'oxygen_saturation_percentage': float(vital.oxygen_saturation_percentage) if vital.oxygen_saturation_percentage is not None else None,
            'notes': vital.notes,
            'created_at': vital.created_at.isoformat() if vital.created_at else None,
            'updated_at': vital.updated_at.isoformat() if vital.updated_at else None,
        }

        # Call User Service for patient and nurse data for aggregation
        patient_user_data, patient_error = get_user_from_user_service(vital.patient_user_id)
        nurse_user_data, nurse_error = get_user_from_user_service(vital.nurse_user_id)

        combined_data = {**vital_data}

        if patient_user_data:
            combined_data['patient'] = patient_user_data
        elif patient_error:
            combined_data['_patient_user_error'] = patient_error

        if nurse_user_data:
            combined_data['nurse'] = nurse_user_data
        elif nurse_error:
            combined_data['_nurse_user_error'] = nurse_error

        return JsonResponse(combined_data)

    elif request.method in ['PUT', 'PATCH']:
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Update fields if provided
        try:
            if 'temperature_celsius' in data and data['temperature_celsius'] is not None:
                vital.temperature_celsius = Decimal(str(data['temperature_celsius']))
            if 'blood_pressure_systolic' in data and data['blood_pressure_systolic'] is not None:
                vital.blood_pressure_systolic = int(data['blood_pressure_systolic'])
            if 'blood_pressure_diastolic' in data and data['blood_pressure_diastolic'] is not None:
                vital.blood_pressure_diastolic = int(data['blood_pressure_diastolic'])
            if 'heart_rate_bpm' in data and data['heart_rate_bpm'] is not None:
                vital.heart_rate_bpm = int(data['heart_rate_bpm'])
            if 'respiratory_rate_bpm' in data and data['respiratory_rate_bpm'] is not None:
                vital.respiratory_rate_bpm = int(data['respiratory_rate_bpm'])
            if 'oxygen_saturation_percentage' in data and data['oxygen_saturation_percentage'] is not None:
                 vital.oxygen_saturation_percentage = Decimal(str(data['oxygen_saturation_percentage']))
            if 'notes' in data:
                 vital.notes = data['notes']

            if 'timestamp' in data and data['timestamp'] is not None:
                 try:
                     timestamp = timezone.datetime.fromisoformat(data['timestamp'])
                     if timezone.is_naive(timestamp):
                         timestamp = timezone.make_aware(timestamp, timezone.get_current_timezone())
                     vital.timestamp = timestamp
                 except ValueError:
                     return JsonResponse({'error': 'Invalid timestamp format for update. Use ISO 8601.'}, status=400)

            vital.full_clean() # Run model validation
            vital.save() # Save changes

            # Re-fetch and aggregate for the response
            updated_vital = PatientVitals.objects.get(id=vitals_id) # Use the fetched object to save, then re-query to ensure updated_at is fresh

            patient_user_data, patient_error = get_user_from_user_service(updated_vital.patient_user_id)
            nurse_user_data, nurse_error = get_user_from_user_service(updated_vital.nurse_user_id)

            combined_data = {
                'id': str(updated_vital.id),
                'patient_user_id': str(updated_vital.patient_user_id),
                'nurse_user_id': str(updated_vital.nurse_user_id),
                'timestamp': updated_vital.timestamp.isoformat() if updated_vital.timestamp else None,
                'temperature_celsius': float(updated_vital.temperature_celsius) if updated_vital.temperature_celsius is not None else None,
                'blood_pressure_systolic': updated_vital.blood_pressure_systolic,
                'blood_pressure_diastolic': updated_vital.blood_pressure_diastolic,
                'heart_rate_bpm': updated_vital.heart_rate_bpm,
                'respiratory_rate_bpm': updated_vital.respiratory_rate_bpm,
                'oxygen_saturation_percentage': float(updated_vital.oxygen_saturation_percentage) if updated_vital.oxygen_saturation_percentage is not None else None,
                'notes': updated_vital.notes,
                'created_at': updated_vital.created_at.isoformat() if updated_vital.created_at else None,
                'updated_at': updated_vital.updated_at.isoformat() if updated_vital.updated_at else None,
            }

            if patient_user_data: combined_data['patient'] = patient_user_data
            elif patient_error: combined_data['_patient_user_error'] = patient_error
            if nurse_user_data: combined_data['nurse'] = nurse_user_data
            elif nurse_error: combined_data['_nurse_user_error'] = nurse_error

            return JsonResponse(combined_data)

        except (ValueError, TypeError, ValidationError) as e:
             return JsonResponse({'error': 'Invalid data type or validation error for vital fields', 'details': str(e)}, status=400)
        except Exception as e:
             print(f"Error updating vital record: {e}")
             return JsonResponse({'error': 'Could not update vital record', 'details': str(e)}, status=500)


    elif request.method == 'DELETE':
        try:
            vital.delete()
            return JsonResponse({'message': 'Patient Vitals record deleted successfully'}, status=204) # 204 No Content

        except Exception as e:
             print(f"Error deleting vital record: {e}")
             return JsonResponse({'error': 'Could not delete vital record', 'details': str(e)}, status=500)


    return JsonResponse({'error': 'Method not allowed'}, status=405)