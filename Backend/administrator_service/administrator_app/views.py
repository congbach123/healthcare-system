# healthcare_microservices/administrator_service/administrator_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Administrator
import json
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import requests
from django.conf import settings

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

# Helper function to call Identity Service GET (same pattern)
def get_user_from_identity_service(user_id):
    """Fetches user data from the Identity Service."""
    identity_service_url = f"{settings.IDENTITY_SERVICE_BASE_URL}/users/{user_id}/"
    try:
        identity_response = requests.get(identity_service_url)
        if identity_response.status_code == 200:
            return identity_response.json(), None # Return data and no error
        elif identity_response.status_code == 404:
            return None, f"Identity user not found for ID {user_id}"
        else:
            return None, f"Identity Service returned error {identity_response.status_code}: {identity_response.text}"
    except requests.exceptions.RequestException as e:
        return None, f"Network error calling Identity Service for user ID {user_id}: {e}"
    except Exception as e:
        return None, f"Unexpected error processing Identity Service response for user ID {user_id}: {e}"

# Helper function to call Identity Service List (GET all users)
def get_all_users_from_identity_service():
    """Fetches all users from the Identity Service list endpoint."""
    identity_service_url = f"{settings.IDENTITY_SERVICE_BASE_URL}/users/" # Assuming GET /api/identity/users/ exists (though we didn't implement it)
    # NOTE: The Identity Service list view (register_user_view GET) currently returns a 405.
    # To make this work, you would need to add GET method handling to register_user_view
    # that lists users. For this demo, we'll assume that endpoint *will* list users.
    try:
        print(f"Admin Service calling Identity Service for user list: {identity_service_url}")
        identity_response = requests.get(identity_service_url)
        identity_response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        print("Identity Service user list call successful.")
        return identity_response.json(), None # Assuming it returns a list of user data
    except requests.exceptions.RequestException as e:
        print(f"Network or HTTP error calling Identity Service list: {e}")
        return None, f"Error calling Identity Service list: {e}"
    except Exception as e:
        print(f"Unexpected error during call to Identity Service list: {e}")
        return None, f"Unexpected error during call to Identity Service list: {e}"


# Helper function to call Identity Service POST (Register)
def create_user_in_identity_service(user_data):
    """Calls Identity Service to create a new user."""
    identity_service_url = f"{settings.IDENTITY_SERVICE_BASE_URL}/register/" # Assuming POST /api/identity/register/
    print(f"Admin Service calling Identity Service to create user: {identity_service_url}")
    headers = {'Content-Type': 'application/json'}
    try:
        response = requests.post(url=identity_service_url, data=json.dumps(user_data), headers=headers)
        response.raise_for_status() # Raise HTTPError for bad responses
        print("Identity Service create user call successful.")
        return response.json(), None
    except requests.exceptions.RequestException as e:
        print(f"Network or HTTP error calling Identity Service create: {e}")
        return None, f"Error calling Identity Service create: {e} - {getattr(e.response, 'text', '')}" # Include response text if available
    except Exception as e:
        print(f"Unexpected error during call to Identity Service create: {e}")
        return None, f"Unexpected error during call to Identity Service create: {e}"

# Helper function to call Identity Service PUT/PATCH (Update User)
def update_user_in_identity_service(user_id, update_data):
    """Calls Identity Service to update an existing user."""
    identity_service_url = f"{settings.IDENTITY_SERVICE_BASE_URL}/users/{user_id}/" # Assuming PUT/PATCH /api/identity/users/<uuid>/
    print(f"Admin Service calling Identity Service to update user: {identity_service_url} with data {update_data}")
    headers = {'Content-Type': 'application/json'}
    try:
        # Use PATCH as we are sending partial data
        response = requests.patch(url=identity_service_url, data=json.dumps(update_data), headers=headers)
        response.raise_for_status() # Raise HTTPError for bad responses
        print("Identity Service update user call successful.")
        return response.json(), None
    except requests.exceptions.RequestException as e:
        print(f"Network or HTTP error calling Identity Service update: {e}")
        return None, f"Error calling Identity Service update: {e} - {getattr(e.response, 'text', '')}"
    except Exception as e:
        print(f"Unexpected error during call to Identity Service update: {e}")
        return None, f"Unexpected error during call to Identity Service update: {e}"

# Helper function to call Identity Service DELETE (Delete User)
def delete_user_in_identity_service(user_id):
    """Calls Identity Service to delete a user."""
    identity_service_url = f"{settings.IDENTITY_SERVICE_BASE_URL}/users/{user_id}/" # Assuming DELETE /api/identity/users/<uuid>/
    print(f"Admin Service calling Identity Service to delete user: {identity_service_url}")
    try:
        response = requests.delete(url=identity_service_url)
        response.raise_for_status() # Raise HTTPError for bad responses (expecting 204)
        print("Identity Service delete user call successful.")
        return None, None # Deletion usually returns no body or just a success message
    except requests.exceptions.RequestException as e:
        print(f"Network or HTTP error calling Identity Service delete: {e}")
        return None, f"Error calling Identity Service delete: {e} - {getattr(e.response, 'text', '')}"
    except Exception as e:
        print(f"Unexpected error during call to Identity Service delete: {e}")
        return None, f"Unexpected error during call to Identity Service delete: {e}"


# --- Administrator Profile Views ---
# Admin profile list/create
@csrf_exempt
def administrator_profile_list_create_view(request):
    if request.method == 'GET':
        admins = Administrator.objects.all()
        aggregated_data = []

        for admin in admins:
            admin_data = {
                'user_id': str(admin.user_id),
                'internal_admin_id': admin.internal_admin_id,
                'created_at': admin.created_at.isoformat() if admin.created_at else None,
                'updated_at': admin.updated_at.isoformat() if admin.updated_at else None,
            }

            # Aggregate identity data for the admin profile
            user_data, identity_fetch_error = get_user_from_identity_service(admin.user_id)

            combined_data_entry = {**admin_data}
            if user_data:
                combined_data_entry = {**user_data, **combined_data_entry} # Merge user data first

            if identity_fetch_error:
                 combined_data_entry['_identity_error'] = identity_fetch_error

            aggregated_data.append(combined_data_entry)

        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')

    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        user_id_str = data.get('user_id')
        internal_admin_id = data.get('internal_admin_id')

        if not user_id_str or not internal_admin_id:
             return JsonResponse({'error': 'user_id and internal_admin_id are required'}, status=400)

        try:
             user_id_uuid = UUID(user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid user_id format (must be a valid UUID string)'}, status=400)

        # Optional: Validate user_type from Identity Service during creation?
        # user_data, err = get_user_from_identity_service(user_id_uuid)
        # if err or (user_data and user_data.get('user_type') != 'administrator'):
        #     return JsonResponse({'error': f'Invalid user_id or user is not an administrator: {err or "Wrong user type"}'}, status=400)

        try:
            admin = Administrator.objects.create(
                user_id=user_id_uuid,
                internal_admin_id=internal_admin_id
            )

            response_data = {
                'user_id': str(admin.user_id),
                'internal_admin_id': admin.internal_admin_id,
                'created_at': admin.created_at.isoformat() if admin.created_at else None,
                'updated_at': admin.updated_at.isoformat() if admin.updated_at else None,
            }

            return JsonResponse(response_data, status=201)

        except IntegrityError:
             return JsonResponse({'error': f'An administrator profile already exists for user ID {user_id_str} or internal admin ID {internal_admin_id} is duplicated.'}, status=409)
        except Exception as e:
            print(f"Error creating administrator profile: {e}")
            return JsonResponse({'error': 'Could not create administrator profile', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

# Admin profile detail (GET only for now)
def administrator_profile_detail_view(request, user_id: UUID):
    if request.method == 'GET':
        try:
            admin = Administrator.objects.get(user_id=user_id)
            admin_data = {
                'user_id': str(admin.user_id),
                'internal_admin_id': admin.internal_admin_id,
                'created_at': admin.created_at.isoformat() if admin.created_at else None,
                'updated_at': admin.updated_at.isoformat() if admin.updated_at else None,
            }

            user_data, identity_fetch_error = get_user_from_identity_service(admin.user_id)

            combined_data = {**admin_data}
            if user_data:
                combined_data = {**user_data, **combined_data}

            if identity_fetch_error:
                 combined_data['_identity_error'] = identity_fetch_error

            return JsonResponse(combined_data)

        except Administrator.DoesNotExist:
            return JsonResponse({'error': 'Administrator profile not found'}, status=404)
        except Exception as e:
             print(f"Error fetching administrator profile: {e}")
             return JsonResponse({'error': 'Could not fetch administrator profile', 'details': str(e)}, status=500)

    # Skipping PUT/PATCH/DELETE for now
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# --- User Management Views (Orchestrating Identity Service Calls) ---

# List all users (calls Identity Service)
def user_list_management_view(request):
    if request.method == 'GET':
        # Call the Identity Service GET /api/identity/users/ endpoint
        users_data, error = get_all_users_from_identity_service()

        if users_data is not None:
            # Identity Service GET list is assumed to return a list of user objects
            # already including common fields. No further aggregation needed here.
            return JsonResponse(users_data, safe=False) # safe=False for list response
        elif error:
            print(f"Error fetching user list from Identity Service: {error}")
            # Attempt to parse error response from Identity if available and return it
            error_details = {'error': 'Failed to fetch user list from Identity Service', 'details': error}
            try:
                # If the error was an HTTPError from requests, response.text might be JSON
                if hasattr(error, 'response') and error.response is not None:
                     error_details['identity_response_status'] = error.response.status_code
                     error_details['identity_response_body'] = json.loads(error.response.text)
            except: # Catch any error during parsing Identity's error response
                 pass
            return JsonResponse(error_details, status=500) # Return 500 as it's a server-side failure to call Identity

    return JsonResponse({'error': 'Method not allowed'}, status=405)

# Create a user (calls Identity Service register)
@csrf_exempt
def user_create_management_view(request):
    if request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Forward the registration request payload to the Identity Service
        # The Identity Service handles validation and creation.
        # We expect the same payload structure as Identity's /api/identity/register/
        required_fields = ['username', 'password']
        if not all(field in data for field in required_fields):
             return JsonResponse({'error': f'{", ".join(required_fields)} are required in payload'}, status=400)

        # Optional fields to forward
        forward_data = {
            'username': data.get('username'),
            'password': data.get('password'),
            'email': data.get('email'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'user_type': data.get('user_type', 'patient'), # Default user type if not provided
        }
        # Include is_staff, is_superuser if provided in payload, though Identity register might not support them directly
        # Let's stick to fields Identity's register supports based on our Step 1 implementation
        # Identity's register accepts username, password, email, first_name, last_name, user_type

        # Call the Identity Service POST /api/identity/register/ endpoint
        created_user_data, error = create_user_in_identity_service(forward_data)

        if created_user_data is not None:
            # Return the response received from the Identity Service (should be 201)
            # We don't add anything extra here, just relay the success.
            return JsonResponse(created_user_data, status=201)
        elif error:
            print(f"Error creating user in Identity Service: {error}")
            # Attempt to parse error response from Identity if available and return it
            error_details = {'error': 'Failed to create user in Identity Service', 'details': error}
            try:
                # If the error was an HTTPError from requests, response.text might be JSON
                if hasattr(error, 'response') and error.response is not None:
                     error_details['identity_response_status'] = error.response.status_code
                     error_details['identity_response_body'] = json.loads(error.response.text)
                     # If Identity returned 400 or 409, relay that status code to the client
                     if error.response.status_code in [400, 409]:
                          return JsonResponse(error_details, status=error.response.status_code)
            except: pass
            return JsonResponse(error_details, status=500) # Default to 500 for other errors

    return JsonResponse({'error': 'Method not allowed'}, status=405)

# Get, Update, Delete a specific user by ID (calls Identity Service)
@csrf_exempt # Needed for PUT/PATCH/DELETE
def user_detail_management_view(request, user_id: UUID):
    # No try-except for UUID validation here, the URL converter handles it.

    if request.method == 'GET':
        # Call the Identity Service GET /api/identity/users/<user_id>/ endpoint
        user_data, error = get_user_from_identity_service(user_id)

        if user_data is not None:
            # Return the response received from the Identity Service (should be 200)
            return JsonResponse(user_data)
        elif error:
            print(f"Error fetching user from Identity Service: {error}")
            # Attempt to parse error response from Identity if available and return it
            error_details = {'error': f'Failed to fetch user {user_id} from Identity Service', 'details': error}
            try:
                if hasattr(error, 'response') and error.response is not None:
                     error_details['identity_response_status'] = error.response.status_code
                     error_details['identity_response_body'] = json.loads(error.response.text)
                     # If Identity returned 404, relay that status code
                     if error.response.status_code == 404:
                          return JsonResponse(error_details, status=404)
            except: pass
            return JsonResponse(error_details, status=500)


    elif request.method in ['PUT', 'PATCH']:
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Forward the update request payload to the Identity Service
        # The Identity Service handles validation and applying updates.
        # Send only the fields present in the request body.
        update_payload = {}
        allowed_update_fields = ['username', 'email', 'first_name', 'last_name', 'user_type', 'is_active', 'password', 'is_staff', 'is_superuser'] # Based on Identity PUT/PATCH logic

        for field in allowed_update_fields:
             if field in data:
                  update_payload[field] = data[field]

        if not update_payload:
             return JsonResponse({'error': 'No updatable fields provided'}, status=400)

        # Call the Identity Service PUT/PATCH /api/identity/users/<user_id>/ endpoint
        updated_user_data, error = update_user_in_identity_service(user_id, update_payload)

        if updated_user_data is not None:
            # Return the response received from the Identity Service (should be 200)
            return JsonResponse(updated_user_data)
        elif error:
            print(f"Error updating user {user_id} in Identity Service: {error}")
            # Attempt to parse error response from Identity if available and return it
            error_details = {'error': f'Failed to update user {user_id} in Identity Service', 'details': error}
            try:
                if hasattr(error, 'response') and error.response is not None:
                     error_details['identity_response_status'] = error.response.status_code
                     error_details['identity_response_body'] = json.loads(error.response.text)
                     # Relay relevant status codes from Identity (400, 404, 409)
                     if error.response.status_code in [400, 404, 409]:
                          return JsonResponse(error_details, status=error.response.status_code)
            except: pass
            return JsonResponse(error_details, status=500)


    elif request.method == 'DELETE':
        # Call the Identity Service DELETE /api/identity/users/<user_id>/ endpoint
        # Note: This performs a hard delete in Identity and likely causes issues in other services.
        # This is for demonstration based on the current simple setup.

        delete_result, error = delete_user_in_identity_service(user_id) # delete_user_in_identity_service returns (None, None) on 204 success

        if error is None: # Error is None means the S2S call succeeded (expected 204)
            # Return success status code from the Admin Service
            return JsonResponse({'message': f'User {user_id} deleted successfully via Identity Service'}, status=200) # Return 200 with message, 204 is no content
            # Or just return a 204 No Content Response: return HttpResponse(status=204)
        else:
            print(f"Error deleting user {user_id} in Identity Service: {error}")
            # Attempt to parse error response from Identity if available and return it
            error_details = {'error': f'Failed to delete user {user_id} in Identity Service', 'details': error}
            try:
                if hasattr(error, 'response') and error.response is not None:
                     error_details['identity_response_status'] = error.response.status_code
                     error_details['identity_response_body'] = json.loads(error.response.text)
                     # Relay relevant status codes from Identity (404)
                     if error.response.status_code == 404:
                          return JsonResponse(error_details, status=404)
            except: pass
            return JsonResponse(error_details, status=500)


    return JsonResponse({'error': 'Method not allowed'}, status=405)