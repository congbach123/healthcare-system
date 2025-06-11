# healthcare_microservices/appointment_service/appointment_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Appointment
import json
from datetime import datetime
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone # Recommended for timezone-aware datetimes
import requests
from django.conf import settings
from django.db.models import Q # For complex queries

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

# Helper function to call User Service and return user data or error
def get_user_from_user_service(user_id):
    """Fetches user data from the User Service."""
    user_service_url = f"{settings.USER_SERVICE_BASE_URL}/users/{user_id}/"
    try:
        user_response = requests.get(user_service_url)
        if user_response.status_code == 200:
            user_data = user_response.json()
            # Remove redundant fields from User data for merging
            user_data.pop('id', None)
            user_data.pop('date_joined', None)
            user_data.pop('last_login', None)
            # Remove sensitive/unnecessary fields for appointment context if any
            user_data.pop('password', None) # Ensure password is never exposed
            user_data.pop('is_staff', None)
            user_data.pop('is_superuser', None)
            user_data.pop('is_active', None) # Maybe keep is_active? Decision point.

            return user_data, None # Return data and no error
        elif user_response.status_code == 404:
            return None, f"User user not found for ID {user_id}"
        else:
            return None, f"User Service returned error {user_response.status_code}: {user_response.text}"
    except requests.exceptions.RequestException as e:
        return None, f"Network error calling User Service for user ID {user_id}: {e}"
    except Exception as e:
        return None, f"Unexpected error processing User Service response for user ID {user_id}: {e}"


@csrf_exempt # WARNING: Disable CSRF protection for API POST.
def appointment_list_create_view(request):
    if request.method == 'GET':
        # Build query filters from request query parameters
        filters = {}
        patient_user_id_str = request.GET.get('patient_user_id')
        doctor_user_id_str = request.GET.get('doctor_user_id')
        status = request.GET.get('status')
        start_time_after_str = request.GET.get('start_time_after') # e.g., 2025-01-01T00:00:00Z
        end_time_before_str = request.GET.get('end_time_before') # e.g., 2025-12-31T23:59:59Z


        if patient_user_id_str:
            try:
                 filters['patient_user_id'] = UUID(patient_user_id_str)
            except ValueError:
                 return JsonResponse({'error': 'Invalid patient_user_id format'}, status=400)

        if doctor_user_id_str:
            try:
                 filters['doctor_user_id'] = UUID(doctor_user_id_str)
            except ValueError:
                 return JsonResponse({'error': 'Invalid doctor_user_id format'}, status=400)

        if status and status in [choice[0] for choice in Appointment.STATUS_CHOICES]:
            filters['status'] = status
        elif status:
             return JsonResponse({'error': f'Invalid status. Allowed: {", ".join([choice[0] for choice in Appointment.STATUS_CHOICES])}'}, status=400)

        if start_time_after_str:
             try:
                 filters['start_time__gte'] = timezone.datetime.fromisoformat(start_time_after_str) # ISO 8601
             except ValueError:
                  return JsonResponse({'error': 'Invalid start_time_after format. Use ISO 8601 (e.g., 2025-01-01T00:00:00Z)'}, status=400)

        if end_time_before_str:
             try:
                 filters['end_time__lte'] = timezone.datetime.fromisoformat(end_time_before_str) # ISO 8601
             except ValueError:
                  return JsonResponse({'error': 'Invalid end_time_before format. Use ISO 8601'}, status=400)


        # Query appointments based on the applied filters
        appointments = Appointment.objects.filter(**filters).order_by('start_time') # Order chronologically

        aggregated_data = [] # List to hold combined data for the response

        for appointment in appointments:
            # 1. Get appointment data
            appointment_data = {
                'id': str(appointment.id),
                'patient_user_id': str(appointment.patient_user_id),
                'doctor_user_id': str(appointment.doctor_user_id),
                'start_time': appointment.start_time.isoformat() if appointment.start_time else None,
                'end_time': appointment.end_time.isoformat() if appointment.end_time else None,
                'status': appointment.status,
                'notes': appointment.notes,
                'created_at': appointment.created_at.isoformat() if appointment.created_at else None,
                'updated_at': appointment.updated_at.isoformat() if appointment.updated_at else None,
            }

            # 2. Call User Service for patient and doctor data
            patient_user_data, patient_error = get_user_from_user_service(appointment.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(appointment.doctor_user_id)

            # 3. Combine data
            combined_entry = {**appointment_data} # Start with appointment data

            if patient_user_data:
                combined_entry['patient'] = patient_user_data
            elif patient_error:
                combined_entry['_patient_user_error'] = patient_error

            if doctor_user_data:
                combined_entry['doctor'] = doctor_user_data
            elif doctor_error:
                combined_entry['_doctor_user_error'] = doctor_error

            aggregated_data.append(combined_entry)

        # 4. Return the aggregated list
        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')


    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Required fields for creating an appointment
        patient_user_id_str = data.get('patient_user_id')
        doctor_user_id_str = data.get('doctor_user_id')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time') # For simplicity, client sends both start and end
        status = data.get('status', 'booked') # Default status

        if not patient_user_id_str or not doctor_user_id_str or not start_time_str or not end_time_str:
             return JsonResponse({'error': 'patient_user_id, doctor_user_id, start_time, and end_time are required'}, status=400)

        try:
             patient_user_id_uuid = UUID(patient_user_id_str)
             doctor_user_id_uuid = UUID(doctor_user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid UUID format for patient_user_id or doctor_user_id'}, status=400)

        try:
             # Parse datetime strings (expecting ISO 8601 format)
             start_time = timezone.datetime.fromisoformat(start_time_str)
             end_time = timezone.datetime.fromisoformat(end_time_str)
             # Ensure times are timezone-aware if TIME_ZONE is not UTC
             if timezone.is_naive(start_time):
                  start_time = timezone.make_aware(start_time, timezone.get_current_timezone()) # Or your project's TIME_ZONE
             if timezone.is_naive(end_time):
                  end_time = timezone.make_aware(end_time, timezone.get_current_timezone())

             if start_time >= end_time:
                  return JsonResponse({'error': 'start_time must be before end_time'}, status=400)

        except ValueError:
             return JsonResponse({'error': 'Invalid datetime format for start_time or end_time. Use ISO 8601 (e.g., 2025-01-01T09:00:00+00:00 or 2025-01-01T09:00:00Z)'}, status=400)

        # Validate status if provided
        if status not in [choice[0] for choice in Appointment.STATUS_CHOICES]:
             return JsonResponse({'error': f'Invalid status "{status}". Allowed: {", ".join([choice[0] for choice in Appointment.STATUS_CHOICES])}'}, status=400)

        # --- Optional S2S Validation during Creation ---
        # You could call User/Patient/Doctor services here to verify the user_ids exist and are of the correct type.
        # For example:
        # user_data, err = get_user_from_user_service(patient_user_id_uuid)
        # if err or (user_data and user_data.get('user_type') != 'patient'):
        #    return JsonResponse({'error': f'Invalid or non-patient user_id provided for patient_user_id: {err or "Wrong user type"}'}, status=400)
        # user_data, err = get_user_from_user_service(doctor_user_id_uuid)
        # if err or (user_data and user_data.get('user_type') != 'doctor'):
        #    return JsonResponse({'error': f'Invalid or non-doctor user_id provided for doctor_user_id: {err or "Wrong user type"}'}, status=400)
        # This adds latency but increases data integrity. For a basic demo, we can skip this validation here
        # and assume the user_ids are valid if they exist in User at retrieval time.
        # --- End Optional S2S Validation ---


        # --- Check for scheduling conflicts for the doctor ---
        # Find existing appointments for this doctor that overlap with the requested time range
        # Overlap check: (start1 <= end2 and end1 >= start2)
        overlapping_appointments = Appointment.objects.filter(
            doctor_user_id=doctor_user_id_uuid,
            # Consider only 'booked' appointments for conflict check? Or include 'completed'?
            # Let's check against 'booked' for simplicity.
            status='booked',
            start_time__lt=end_time, # appointment starts before new one ends
            end_time__gt=start_time  # appointment ends after new one starts
        )
        if overlapping_appointments.exists():
             return JsonResponse({'error': 'Doctor is not available during this time slot.'}, status=409) # Conflict

        # --- End Scheduling Conflict Check ---


        try:
            # Create the Appointment
            appointment = Appointment.objects.create(
                patient_user_id=patient_user_id_uuid,
                doctor_user_id=doctor_user_id_uuid,
                start_time=start_time,
                end_time=end_time,
                status=status,
                notes=data.get('notes')
            )

            # Manually prepare response data
            response_data = {
                'id': str(appointment.id),
                'patient_user_id': str(appointment.patient_user_id),
                'doctor_user_id': str(appointment.doctor_user_id),
                'start_time': appointment.start_time.isoformat() if appointment.start_time else None,
                'end_time': appointment.end_time.isoformat() if appointment.end_time else None,
                'status': appointment.status,
                'notes': appointment.notes,
                'created_at': appointment.created_at.isoformat() if appointment.created_at else None,
                'updated_at': appointment.updated_at.isoformat() if appointment.updated_at else None,
            }

            return JsonResponse(response_data, status=201)

        except Exception as e:
            print(f"Error creating appointment: {e}")
            return JsonResponse({'error': 'Could not create appointment', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# Detail view for getting a single appointment by ID, aggregating data
def appointment_detail_view(request, appointment_id: UUID): # appointment_id is UUID object
    if request.method == 'GET':
        try:
            # 1. Fetch the appointment from the Appointment Service database
            appointment = Appointment.objects.get(id=appointment_id)

            # 2. Call User Service for patient and doctor data
            patient_user_data, patient_error = get_user_from_user_service(appointment.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(appointment.doctor_user_id)

            # 3. Aggregate data
            combined_data = {
                'id': str(appointment.id),
                'patient_user_id': str(appointment.patient_user_id),
                'doctor_user_id': str(appointment.doctor_user_id),
                'start_time': appointment.start_time.isoformat() if appointment.start_time else None,
                'end_time': appointment.end_time.isoformat() if appointment.end_time else None,
                'status': appointment.status,
                'notes': appointment.notes,
                'created_at': appointment.created_at.isoformat() if appointment.created_at else None,
                'updated_at': appointment.updated_at.isoformat() if appointment.updated_at else None,
            }

            if patient_user_data:
                combined_data['patient'] = patient_user_data
            elif patient_error:
                 combined_data['_patient_user_error'] = patient_error

            if doctor_user_data:
                combined_data['doctor'] = doctor_user_data
            elif doctor_error:
                 combined_data['_doctor_user_error'] = doctor_error

            return JsonResponse(combined_data)

        except Appointment.DoesNotExist:
            return JsonResponse({'error': 'Appointment not found'}, status=404)
        except Exception as e:
             print(f"Error fetching appointment: {e}")
             return JsonResponse({'error': 'Could not fetch appointment', 'details': str(e)}, status=500)


    # Add PUT/PATCH (Update) and DELETE views here
    # Example: Update status or notes
    elif request.method in ['PUT', 'PATCH']:
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        try:
             appointment = Appointment.objects.get(id=appointment_id)

             # Update fields from data if provided
             if 'status' in data:
                 if data['status'] not in [choice[0] for choice in Appointment.STATUS_CHOICES]:
                      return JsonResponse({'error': f'Invalid status "{data["status"]}". Allowed: {", ".join([choice[0] for choice in Appointment.STATUS_CHOICES])}'}, status=400)
                 appointment.status = data['status']

             if 'notes' in data:
                 appointment.notes = data['notes']

             # You could allow updating times, but this complicates conflict checking significantly
             # if 'start_time' in data: ...
             # if 'end_time' in data: ...

             appointment.save() # Save changes

             # Return updated object (can re-fetch to get updated_at or manually construct)
             # Re-fetching ensures updated_at is correct and we aggregate user data again
             updated_appointment = Appointment.objects.get(id=appointment_id)
             patient_user_data, patient_error = get_user_from_user_service(updated_appointment.patient_user_id)
             doctor_user_data, doctor_error = get_user_from_user_service(updated_appointment.doctor_user_id)

             combined_data = {
                 'id': str(updated_appointment.id),
                 'patient_user_id': str(updated_appointment.patient_user_id),
                 'doctor_user_id': str(updated_appointment.doctor_user_id),
                 'start_time': updated_appointment.start_time.isoformat() if updated_appointment.start_time else None,
                 'end_time': updated_appointment.end_time.isoformat() if updated_appointment.end_time else None,
                 'status': updated_appointment.status,
                 'notes': updated_appointment.notes,
                 'created_at': updated_appointment.created_at.isoformat() if updated_appointment.created_at else None,
                 'updated_at': updated_appointment.updated_at.isoformat() if updated_appointment.updated_at else None,
             }
             if patient_user_data: combined_data['patient'] = patient_user_data
             elif patient_error: combined_data['_patient_user_error'] = patient_error
             if doctor_user_data: combined_data['doctor'] = doctor_user_data
             elif doctor_error: combined_data['_doctor_user_error'] = doctor_error

             return JsonResponse(combined_data)

        except Appointment.DoesNotExist:
            return JsonResponse({'error': 'Appointment not found'}, status=404)
        except Exception as e:
             print(f"Error updating appointment: {e}")
             return JsonResponse({'error': 'Could not update appointment', 'details': str(e)}, status=500)

    elif request.method == 'DELETE':
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            appointment.delete()
            return JsonResponse({'message': 'Appointment deleted successfully'}, status=204) # 204 No Content is standard for successful DELETE

        except Appointment.DoesNotExist:
            return JsonResponse({'error': 'Appointment not found'}, status=404)
        except Exception as e:
             print(f"Error deleting appointment: {e}")
             return JsonResponse({'error': 'Could not delete appointment', 'details': str(e)}, status=500)


    return JsonResponse({'error': 'Method not allowed'}, status=405)