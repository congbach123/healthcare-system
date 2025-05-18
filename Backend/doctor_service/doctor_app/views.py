# healthcare_microservices/doctor_service/doctor_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Doctor
import json
from datetime import datetime # Import datetime for potential checks or parsing
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import requests # <-- Import requests for inter-service communication
from django.conf import settings # <-- Import settings

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

@csrf_exempt # WARNING: Disable CSRF protection for API POST.
def doctor_list_create_view(request):
    if request.method == 'GET':
        doctors = Doctor.objects.all()

        aggregated_data = [] # List to hold combined data for the response

        for doctor in doctors:
            # 1. Get doctor-specific data
            doctor_data = {
                'user_id': str(doctor.user_id), # Convert UUID to string
                'specialization': doctor.specialization,
                'license_number': doctor.license_number,
                'phone_number': doctor.phone_number,
                'created_at': doctor.created_at.isoformat() if doctor.created_at else None,
                'updated_at': doctor.updated_at.isoformat() if doctor.updated_at else None,
            }

            # 2. Call the Identity Service to get common user data for this doctor's user_id
            identity_service_url = f"{settings.IDENTITY_SERVICE_BASE_URL}/users/{doctor.user_id}/"
            # print(f"Doctor Service listing calling Identity Service for user_id {doctor.user_id}: {identity_service_url}") # Uncomment for verbose logging

            user_data = {} # Dictionary to hold common user data
            identity_fetch_error = None # Flag to indicate if fetching identity data failed

            try:
                identity_response = requests.get(identity_service_url)

                if identity_response.status_code == 200:
                    user_data = identity_response.json()
                    # print(f"Identity Service call successful for user_id {doctor.user_id}.") # Uncomment for verbose logging
                    # Remove fields from Identity data that might be redundant or confusing when merged
                    user_data.pop('id', None) # user_id is already in doctor_data
                    user_data.pop('date_joined', None) # Timestamps are usually more relevant from the profile creation
                    user_data.pop('last_login', None)

                elif identity_response.status_code == 404:
                    identity_fetch_error = f"Identity user not found for ID {doctor.user_id}"
                    print(f"WARNING: {identity_fetch_error}") # Log the warning on the server
                    # Continue processing, but user_data will be empty

                else:
                    identity_fetch_error = f"Identity Service returned error {identity_response.status_code} for user_id {doctor.user_id}"
                    print(f"ERROR: {identity_fetch_error}: {identity_response.text}") # Log the error
                    # Continue processing, but user_data will be empty

            except requests.exceptions.RequestException as e:
                identity_fetch_error = f"Network error calling Identity Service for user_id {doctor.user_id}: {e}"
                print(f"ERROR: {identity_fetch_error}") # Log the network error
                # Continue processing, but user_data will be empty

            # 3. Combine the data from the Doctor profile and the fetched user data
            # Merge user_data into doctor_data. doctor_data keys take precedence if duplicated.
            combined_data_entry = {**user_data, **doctor_data}

            # 4. Optionally add an error indicator if identity data couldn't be fetched
            if identity_fetch_error:
                 combined_data_entry['_identity_error'] = identity_fetch_error

            # Add the combined entry to the list
            aggregated_data.append(combined_data_entry)

        # 5. Return the aggregated list
        # Use HttpResponse with json.dumps for list serialization
        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')


    elif request.method == 'POST':
        # ... (POST logic for creating a doctor remains the same) ...
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        user_id_str = data.get('user_id')
        if not user_id_str:
             return JsonResponse({'error': 'user_id is required (must be a UUID string from the Identity Service)'}, status=400)

        try:
             user_id_uuid = UUID(user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid user_id format (must be a valid UUID string)'}, status=400)

        specialization = data.get('specialization')
        license_number = data.get('license_number')
        phone_number = data.get('phone_number')

        if not specialization or not license_number:
             return JsonResponse({'error': 'Specialization and license_number are required'}, status=400)

        try:
            doctor = Doctor.objects.create(
                user_id=user_id_uuid,
                specialization=specialization,
                license_number=license_number,
                phone_number=phone_number
            )

            response_data = {
                'user_id': str(doctor.user_id),
                'specialization': doctor.specialization,
                'license_number': doctor.license_number,
                'phone_number': doctor.phone_number,
                'created_at': doctor.created_at.isoformat() if doctor.created_at else None,
                'updated_at': doctor.updated_at.isoformat() if doctor.updated_at else None,
            }

            return JsonResponse(response_data, status=201)

        except IntegrityError:
             return JsonResponse({'error': f'A doctor profile already exists for user ID {user_id_str} or license number {license_number} is duplicated.'}, status=409)
        except Exception as e:
            print(f"Error creating doctor profile: {e}")
            return JsonResponse({'error': 'Could not create doctor profile', 'details': str(e)}, status=500)


    return JsonResponse({'error': 'Method not allowed'}, status=405)


# Detail view for getting a single doctor profile by their user_id, aggregating from Identity Service
def doctor_detail_view(request, user_id: UUID): # user_id is a UUID object from URL converter
    if request.method == 'GET':
        try:
            # 1. Fetch doctor-specific data from the Doctor Service database
            doctor = Doctor.objects.get(user_id=user_id)

            # Manually prepare doctor-specific data dictionary
            doctor_data = {
                'user_id': str(doctor.user_id), # Convert UUID to string
                'specialization': doctor.specialization,
                'license_number': doctor.license_number,
                'phone_number': doctor.phone_number,
                'created_at': doctor.created_at.isoformat() if doctor.created_at else None,
                'updated_at': doctor.updated_at.isoformat() if doctor.updated_at else None,
            }

            # 2. Call the Identity Service to get common user data
            identity_service_url = f"{settings.IDENTITY_SERVICE_BASE_URL}/users/{user_id}/"
            print(f"Doctor Service calling Identity Service: {identity_service_url}") # Log for demo

            try:
                identity_response = requests.get(identity_service_url)

                if identity_response.status_code == 200:
                    user_data = identity_response.json()
                    print("Identity Service call successful.") # Log for demo
                    # Remove the 'id' from user_data as we use doctor_data['user_id']
                    if 'id' in user_data:
                         del user_data['id']
                    # Remove timestamps from user_data to prefer timestamps from doctor_data
                    user_data.pop('date_joined', None)
                    user_data.pop('last_login', None)
                    user_data.pop('created_at', None) # Although AbstractUser doesn't have created_at/updated_at by default

                    # 3. Combine the data from both services
                    # Merge user_data into doctor_data. doctor_data keys take precedence.
                    combined_data = {**user_data, **doctor_data}

                    return JsonResponse(combined_data)

                elif identity_response.status_code == 404:
                    print(f"Identity Service returned 404 for user_id {user_id}. User likely deleted from Identity.")
                    # Return the doctor data found, indicating the identity data is missing
                    # Or return an error, depending on desired strictness. Returning the found data is often more robust.
                    # Let's return the doctor data along with an error message about missing identity.
                    response = JsonResponse({'error': 'Corresponding user not found in Identity Service'}, status=404)
                    # You might attach the partial data, but returning 404 is clearer about the overall state.
                    # Alternatively, return 200 with partial data + warning flag:
                    # doctor_data['identity_missing'] = True
                    # return JsonResponse(doctor_data)
                    return response


                else:
                    print(f"Identity Service returned error {identity_response.status_code}: {identity_response.text}")
                    return JsonResponse({
                        'error': 'Failed to fetch user data from Identity Service',
                        'status_code': identity_response.status_code,
                        'details': identity_response.text
                    }, status=identity_response.status_code)

            except requests.exceptions.RequestException as e:
                print(f"Network error calling Identity Service: {e}")
                return JsonResponse({
                    'error': 'Communication error with Identity Service',
                    'details': str(e)
                }, status=500)

        except Doctor.DoesNotExist:
            # Handle case where a doctor profile with the given user_id is not found in Doctor DB
            return JsonResponse({'error': 'Doctor profile not found'}, status=404)

        except Exception as e:
             print(f"Error fetching doctor profile or combining data: {e}")
             return JsonResponse({'error': 'Could not fetch doctor profile', 'details': str(e)}, status=500)


    # Handle methods other than GET
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# --- Add update/delete views (PUT/PATCH/DELETE) here later ---
# @csrf_exempt
# def doctor_update_view(request, user_id: UUID): ...
# @csrf_exempt
# def doctor_delete_view(request, user_id: UUID): ...