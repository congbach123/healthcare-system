# healthcare_microservices/pharmacist_service/pharmacist_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Pharmacist
import json
from datetime import datetime
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone # Needed for fulfillment timestamp
import requests # <-- Import requests for inter-service communication
from django.conf import settings # <-- Import settings
from django.db.models import Q

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

# Helper function to call User Service and return user data or error (same pattern)
# (Ensure this helper is present in your file)
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
            return user_data, None # Return data and no error
        elif user_response.status_code == 404:
            return None, f"User user not found for ID {user_id}"
        else:
            return None, f"User Service returned error {user_response.status_code}: {user_response.text}"
    except requests.exceptions.RequestException as e:
        return None, f"Network error calling User Service for user ID {user_id}: {e}"
    except Exception as e:
        return None, f"Unexpected error processing User Service response for user ID {user_id}: {e}"


# Helper function to call other services' PUT/PATCH endpoints (Need this for the fulfillment view)
def call_other_service_update(base_url, endpoint, data):
    """Generic helper to call other PUT/PATCH endpoints."""
    url = f"{base_url}{endpoint}"
    print(f"Pharmacist Service calling {base_url} PUT/PATCH {endpoint} with data: {data}") # Log the S2S call
    headers = {'Content-Type': 'application/json'}
    try:
        # Use PATCH as we are likely only sending partial data
        response = requests.patch(url, data=json.dumps(data), headers=headers)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        print(f"Call to {url} successful. Status: {response.status_code}")
        return response.json(), None # Return data and no error (assuming JSON response on success)
    except requests.exceptions.RequestException as e:
        print(f"Network or HTTP error calling {url}: {e}")
        # Include response text/status if available for better debugging
        error_details = f"Error calling {url}: {e}"
        if hasattr(e, 'response') and e.response is not None:
             error_details += f" - Status: {e.response.status_code}, Body: {getattr(e.response, 'text', 'N/A')}"
             # You could potentially return the status code from the remote service here
             # return None, {'error': error_details, 'status_code': e.response.status_code}
        return None, error_details
    except Exception as e:
        print(f"Unexpected error during call to {url}: {e}")
        return None, f"Unexpected error during call to {url}: {e}"


# --- Pharmacist Profile Views (Keep these as they are) ---
@csrf_exempt
def pharmacist_list_create_view(request):
    # ... (GET and POST logic as provided by user) ...
     if request.method == 'GET':
        pharmacists = Pharmacist.objects.all()
        aggregated_data = []

        for pharmacist in pharmacists:
             pharmacist_data = {
                 'user_id': str(pharmacist.user_id), # Convert UUID to string
                 'pharmacy_name': pharmacist.pharmacy_name,
                 'pharmacy_license_number': pharmacist.pharmacy_license_number,
                 'phone_number': pharmacist.phone_number,
                 'address': pharmacist.address,
                 'created_at': pharmacist.created_at.isoformat() if pharmacist.created_at else None, # Datetime to string
                 'updated_at': pharmacist.updated_at.isoformat() if pharmacist.updated_at else None, # Datetime to string
             }

             # Aggregate user data
             user_data, user_fetch_error = get_user_from_user_service(pharmacist.user_id)

             combined_data_entry = {**pharmacist_data}
             if user_data:
                 combined_data_entry = {**user_data, **combined_data_entry} # Merge user data first, pharmacist data second

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
        if not user_id_str:
             return JsonResponse({'error': 'user_id is required (must be a UUID string from the User Service)'}, status=400)

        try:
             user_id_uuid = UUID(user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid user_id format (must be a valid UUID string)'}, status=400)

        pharmacy_name = data.get('pharmacy_name')
        pharmacy_license_number = data.get('pharmacy_license_number')
        phone_number = data.get('phone_number')
        address = data.get('address')

        if not pharmacy_name or not pharmacy_license_number:
             return JsonResponse({'error': 'pharmacy_name and pharmacy_license_number are required'}, status=400)

        try:
            pharmacist = Pharmacist.objects.create(
                user_id=user_id_uuid,
                pharmacy_name=pharmacy_name,
                pharmacy_license_number=pharmacy_license_number,
                phone_number=phone_number,
                address=address
            )

            response_data = {
                'user_id': str(pharmacist.user_id),
                'pharmacy_name': pharmacist.pharmacy_name,
                'pharmacy_license_number': pharmacist.pharmacy_license_number,
                'phone_number': pharmacist.phone_number,
                'address': pharmacist.address,
                'created_at': pharmacist.created_at.isoformat() if pharmacist.created_at else None,
                'updated_at': pharmacist.updated_at.isoformat() if pharmacist.updated_at else None,
            }

            return JsonResponse(response_data, status=201)

        except IntegrityError:
             return JsonResponse({'error': f'A pharmacist profile already exists for user ID {user_id_str} or license number {pharmacy_license_number} is duplicated.'}, status=409)
        except Exception as e:
            print(f"Error creating pharmacist profile: {e}")
            return JsonResponse({'error': 'Could not create pharmacist profile', 'details': str(e)}, status=500)

     return JsonResponse({'error': 'Method not allowed'}, status=405)


def pharmacist_detail_view(request, user_id: UUID):
    # ... (GET logic as provided by user) ...
     if request.method == 'GET':
        try:
            pharmacist = Pharmacist.objects.get(user_id=user_id)

            pharmacist_data = {
                'user_id': str(pharmacist.user_id), # Convert UUID to string
                'pharmacy_name': pharmacist.pharmacy_name,
                'pharmacy_license_number': pharmacist.pharmacy_license_number,
                'phone_number': pharmacist.phone_number,
                'address': pharmacist.address,
                'created_at': pharmacist.created_at.isoformat() if pharmacist.created_at else None, # Datetime to string
                'updated_at': pharmacist.updated_at.isoformat() if pharmacist.updated_at else None, # Datetime to string
            }

            user_service_url = f"{settings.USER_SERVICE_BASE_URL}/users/{user_id}/"
            print(f"Pharmacist Service calling User Service: {user_service_url}")

            try:
                user_response = requests.get(user_service_url)

                if user_response.status_code == 200:
                    user_data = user_response.json()
                    print("User Service call successful.")
                    if 'id' in user_data:
                         del user_data['id']
                    user_data.pop('date_joined', None)
                    user_data.pop('last_login', None)

                    combined_data = {**user_data, **pharmacist_data}

                    return JsonResponse(combined_data)

                elif user_response.status_code == 404:
                    print(f"User Service returned 404 for user_id {user_id}. User likely deleted from User.")
                    response_data = pharmacist_data.copy()
                    response_data['error'] = 'Corresponding user not found in User Service'
                    return JsonResponse(response_data, status=404)

                else:
                    print(f"User Service returned error {user_response.status_code}: {user_response.text}")
                    return JsonResponse({
                        'error': 'Failed to fetch user data from User Service',
                        'status_code': user_response.status_code,
                        'details': user_response.text
                    }, status=user_response.status_code)

            except requests.exceptions.RequestException as e:
                print(f"Network error calling User Service: {e}")
                return JsonResponse({
                    'error': 'Communication error with User Service',
                    'details': str(e)
                }, status=500)

        except Pharmacist.DoesNotExist:
            return JsonResponse({'error': 'Pharmacist profile not found'}, status=404)
        except Exception as e:
             print(f"Error fetching pharmacist profile or combining data: {e}")
             return JsonResponse({'error': 'Could not fetch pharmacist profile', 'details': str(e)}, status=500)


     return JsonResponse({'error': 'Method not allowed'}, status=405)


# --- Patient Vitals Views (Keep these if they were in this file) ---
# @csrf_exempt
# def patient_vitals_list_create_view(request): ...
# def patient_vitals_detail_view(request, vitals_id: UUID): ...


# --- Pharmacist Specific Actions Views (Add this NEW view) ---
@csrf_exempt # WARNING: Disable CSRF protection for API POST.
def fulfill_prescription_view(request):
    if request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # We need the ID of the prescription to fulfill
        prescription_id_str = data.get('prescription_id')
        # We need the ID of the pharmacist performing the action
        # In a real system, this would come from the authenticated user's token.
        # For this demo, we'll require it in the request body.
        pharmacist_user_id_str = data.get('pharmacist_user_id')


        if not prescription_id_str or not pharmacist_user_id_str:
            return JsonResponse({'error': 'prescription_id and pharmacist_user_id are required'}, status=400)

        try:
            prescription_id_uuid = UUID(prescription_id_str)
            pharmacist_user_id_uuid = UUID(pharmacist_user_id_str)
        except ValueError:
            return JsonResponse({'error': 'Invalid UUID format for prescription_id or pharmacist_user_id'}, status=400)

        # --- Optional Validation ---
        # You could check if the pharmacist_user_id exists and is of type 'pharmacist' in User Service.
        # user_data, err = get_user_from_user_service(pharmacist_user_id_uuid)
        # if err or (user_data and user_data.get('user_type') != 'pharmacist'):
        #     return JsonResponse({'error': f'Invalid pharmacist_user_id or user is not a pharmacist: {err or "Wrong user type"}'}, status=400)
        # Skipping for basic demo.
        # --- End Optional Validation ---


        # 1. Prepare the data to send to the Prescription Service update endpoint
        update_payload = {
            'status': 'filled', # Set the status to filled
            'fulfilled_by_pharmacist_user_id': str(pharmacist_user_id_uuid), # Include the pharmacist's ID
            'fulfilled_date': timezone.now().isoformat(), # Set the fulfillment date to now
        }

        # 2. Call the Prescription Service's update endpoint (PATCH method)
        prescription_update_endpoint = f'/prescriptions/{prescription_id_uuid}/' # Endpoint on the Prescription Service
        # Need the Prescription Service Base URL from settings
        prescription_service_base_url = getattr(settings, 'PRESCRIPTION_SERVICE_BASE_URL', None)

        if not prescription_service_base_url:
             print("ERROR: PRESCRIPTION_SERVICE_BASE_URL not defined in settings!")
             return JsonResponse({'error': 'PRESCRIPTION_SERVICE_BASE_URL not configured on the server.'}, status=500)


        updated_prescription_data, update_error = call_other_service_update(
             prescription_service_base_url, # Use the base URL from settings
             prescription_update_endpoint,
             update_payload
        )

        # 3. Handle the response from the Prescription Service call
        if updated_prescription_data:
            # Success! Return the updated prescription data received from the Prescription Service
            # The Prescription Service's PATCH endpoint is assumed to return the updated object (aggregated)
            return JsonResponse(updated_prescription_data) # Return 200 OK by default with JsonResponse
        elif update_error:
            # Failure during the S2S call. Log and return an error response.
            print(f"Error during S2S call to update prescription: {update_error}")
            # Attempt to relay a specific status code from the remote service if possible
            status_code = 500 # Default to 500 Internal Server Error
            error_message = f'Failed to fulfill prescription in Prescription Service: {update_error}'

            # You could parse the update_error string or object if call_other_service_update returned more structure
            # e.g., if the error included 'status_code' or 'details'
            # For now, just return 500 with a detailed message including the error from the helper

            return JsonResponse({'error': error_message}, status=status_code)


    return JsonResponse({'error': 'Method not allowed'}, status=405)

# --- Add update/delete views (PUT/PATCH/DELETE) here later ---
# @csrf_exempt
# def pharmacist_update_view(request, user_id: UUID): ...
# @csrf_exempt
# def pharmacist_delete_view(request, user_id: UUID): ...