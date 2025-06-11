# healthcare_microservices/patient_service/patient_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Patient
import json
from datetime import datetime
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import requests # <-- Import the requests library
from django.conf import settings # <-- Import settings to access the URL

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

@csrf_exempt # WARNING: Disable CSRF protection for API POST.
def patient_list_create_view(request):
    if request.method == 'GET':
        patients = Patient.objects.all()
        # Manually serialize list of patient profiles
        data = []
        for patient in patients:
             data.append({
                 'user_id': str(patient.user_id), # Convert UUID to string
                 'date_of_birth': patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else None, # Date to string
                 'address': patient.address,
                 'phone_number': patient.phone_number,
                 'created_at': patient.created_at.isoformat() if patient.created_at else None, # Datetime to string
                 'updated_at': patient.updated_at.isoformat() if patient.updated_at else None, # Datetime to string
             })

        # Use HttpResponse with json.dumps for list serialization
        response_json_string = json.dumps(data)
        return HttpResponse(response_json_string, content_type='application/json')

    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # User ID is mandatory and MUST come from the User Service
        user_id_str = data.get('user_id')
        if not user_id_str:
             return JsonResponse({'error': 'user_id is required (must be a UUID string from the User Service)'}, status=400)

        try:
             # Validate that the provided user_id string is a valid UUID format
             user_id_uuid = UUID(user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid user_id format (must be a valid UUID string)'}, status=400)

        # Validate and parse date_of_birth
        date_of_birth_str = data.get('date_of_birth')
        date_of_birth = None
        if date_of_birth_str:
             try:
                 date_of_birth = datetime.strptime(date_of_birth_str, '%Y-%m-%d').date()
             except ValueError:
                  return JsonResponse({'error': 'Invalid date format for date_of_birth. Use YYYY-MM-DD.'}, status=400)

        try:
            # Create the Patient profile. The user_id becomes the primary key.
            # If a Patient with this user_id already exists, IntegrityError will be raised.
            patient = Patient.objects.create(
                user_id=user_id_uuid, # Use the validated UUID as the primary key
                date_of_birth=date_of_birth,
                address=data.get('address'),
                phone_number=data.get('phone_number')
            )

            # Manually prepare response data for the created patient profile
            response_data = {
                'user_id': str(patient.user_id), # Convert UUID to string
                'date_of_birth': patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else None, # Date to string
                'address': patient.address,
                'phone_number': patient.phone_number,
                'created_at': patient.created_at.isoformat() if patient.created_at else None, # Datetime to string
                'updated_at': patient.updated_at.isoformat() if patient.updated_at else None, # Datetime to string
            }

            # Use JsonResponse for a single object response
            return JsonResponse(response_data, status=201)

        except IntegrityError:
             # Catch if a patient profile with this user_id already exists (PK violation)
             return JsonResponse({'error': f'A patient profile already exists for user ID {user_id_str}'}, status=409)
        except Exception as e:
            print(f"Error creating patient profile: {e}")
            return JsonResponse({'error': 'Could not create patient profile', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# Detail view for getting a single patient profile by their user_id
def patient_detail_view(request, user_id: UUID): # Accepts user_id, Django's UUID converter handles string->UUID
    if request.method == 'GET':
        try:
            # 1. Fetch patient-specific data from the Patient Service database
            patient = Patient.objects.get(user_id=user_id)

            # Manually prepare patient-specific data dictionary
            patient_data = {
                'user_id': str(patient.user_id), # Convert UUID to string
                'date_of_birth': patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else None, # Date to string
                'address': patient.address,
                'phone_number': patient.phone_number,
                'created_at': patient.created_at.isoformat() if patient.created_at else None, # Datetime to string
                'updated_at': patient.updated_at.isoformat() if patient.updated_at else None, # Datetime to string
            }

            # 2. Call the User Service to get common user data
            user_service_url = f"{settings.USER_SERVICE_BASE_URL}/users/{user_id}/"
            print(f"Patient Service calling User Service: {user_service_url}") # For debugging/demonstration

            try:
                # Make the HTTP GET request to the User Service
                user_response = requests.get(user_service_url)

                # Check if the request was successful
                if user_response.status_code == 200:
                    user_data = user_response.json()
                    print("User Service call successful.") # For debugging/demonstration
                    # Remove redundant user_id from user data before merging
                    if 'id' in user_data:
                         del user_data['id'] # We already have user_id in patient_data

                    # 3. Combine the data from both services
                    # User data overwrites if keys are the same (e.g., created_at/updated_at, though we selected specific fields)
                    # A more careful merge might be needed in complex cases.
                    combined_data = {**user_data, **patient_data} # Merge user_data into patient_data. patient_data keys take precedence if duplicated

                    return JsonResponse(combined_data)

                elif user_response.status_code == 404:
                    # This case should ideally not happen if the user_id in Patient table is valid
                    # But handling it is good practice.
                    print(f"User Service returned 404 for user_id {user_id}. User likely deleted from User.")
                    # Decide how to handle: return Patient data only? Return error?
                    # For this demo, let's return the patient data with a warning or indication.
                    # Or, maybe better for demonstration, return a specific error.
                    return JsonResponse({'error': 'Corresponding user not found in User Service', 'user_id': str(user_id)}, status=404) # Indicate the missing user

                else:
                    # Handle other potential errors from User Service
                    print(f"User Service returned error {user_response.status_code}: {user_response.text}")
                    return JsonResponse({
                        'error': 'Failed to fetch user data from User Service',
                        'status_code': user_response.status_code,
                        'details': user_response.text
                    }, status=user_response.status_code) # Return the error status from User

            except requests.exceptions.RequestException as e:
                # Handle network errors (e.g., User Service is down)
                print(f"Network error calling User Service: {e}")
                return JsonResponse({
                    'error': 'Communication error with User Service',
                    'details': str(e)
                }, status=500) # Indicate a server-side communication failure

        except Patient.DoesNotExist:
            # Handle case where a patient profile with the given user_id is not found in Patient DB
            return JsonResponse({'error': 'Patient profile not found'}, status=404)
        except Exception as e:
             # Catch any other unexpected errors during fetching patient data or processing
             print(f"Error fetching patient profile or combining data: {e}")
             # Log the full traceback for unexpected errors in development
             # import traceback
             # traceback.print_exc()
             return JsonResponse({'error': 'Could not fetch patient profile', 'details': str(e)}, status=500)


    # Handle methods other than GET
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# --- You would add update/delete views (PUT/PATCH/DELETE) here later ---
# @csrf_exempt
# def patient_update_view(request, user_id: UUID): ...
# @csrf_exempt
# def patient_delete_view(request, user_id: UUID): ...