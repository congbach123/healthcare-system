# healthcare_microservices/user_service/user_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import User
import json
from datetime import datetime
from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password

# Helper function to parse JSON body (same)
def parse_json_body(request):
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None

# Helper function to build user data response (same)
def build_user_response_data(user: User):
    """Builds a dictionary of safe user data for API responses."""
    return {
        'id': str(user.id),
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'user_type': user.user_type,
        'is_active': user.is_active,
        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }

# --- Existing register_user_view (same) ---
@csrf_exempt
def register_user_view(request):
    if request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        user_type = data.get('user_type', 'patient')

        if not username or not password:
            return JsonResponse({'error': 'Username and password are required'}, status=400)

        valid_user_types = [choice[0] for choice in User.USER_TYPE_CHOICES]
        if user_type not in valid_user_types:
             return JsonResponse({'error': f'Invalid user type. Allowed types are: {", ".join(valid_user_types)}'}, status=400)

        try:
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
                user_type=user_type
            )

            response_data = build_user_response_data(user)
            return JsonResponse(response_data, status=201)

        except IntegrityError:
             return JsonResponse({'error': 'User with this username already exists.'}, status=409)
        except ValidationError as e:
             return JsonResponse({'error': 'Validation error', 'details': dict(e.message_dict)}, status=400)
        except Exception as e:
            print(f"Error creating user: {e}")
            return JsonResponse({'error': 'Could not create user', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

# --- Existing login_view (same) ---
@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return JsonResponse({'error': 'Username and password are required'}, status=400)

        user = authenticate(request, username=username, password=password)

        if user is not None:
            response_data = build_user_response_data(user)
            return JsonResponse(response_data)

        else:
            return JsonResponse({'error': 'Invalid username or password'}, status=401)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# --- Existing get_user_by_id_view (same) ---
@csrf_exempt
def get_user_by_id_view(request, user_id: UUID):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
         print(f"Error fetching user for detail/update/delete view: {e}")
         return JsonResponse({'error': 'Could not fetch user', 'details': str(e)}, status=500)


    if request.method == 'GET':
        response_data = build_user_response_data(user)
        return JsonResponse(response_data)

    elif request.method in ['PUT', 'PATCH']:
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        updated_fields = {}

        if 'username' in data:
             if User.objects.exclude(id=user.id).filter(username=data['username']).exists():
                  return JsonResponse({'error': 'Username is already taken'}, status=409)
             updated_fields['username'] = data['username']

        if 'email' in data:
             updated_fields['email'] = data['email']

        if 'first_name' in data:
             updated_fields['first_name'] = data['first_name']

        if 'last_name' in data:
             updated_fields['last_name'] = data['last_name']

        if 'user_type' in data:
             valid_user_types = [choice[0] for choice in User.USER_TYPE_CHOICES]
             if data['user_type'] not in valid_user_types:
                 return JsonResponse({'error': f'Invalid user type. Allowed types are: {", ".join(valid_user_types)}'}, status=400)
             updated_fields['user_type'] = data['user_type']

        if 'is_active' in data:
             if not isinstance(data['is_active'], bool):
                  return JsonResponse({'error': 'is_active must be a boolean (true or false)'}, status=400)
             updated_fields['is_active'] = data['is_active']

        if 'password' in data and data['password']:
            user.set_password(data['password'])

        if 'is_staff' in data:
             if not isinstance(data['is_staff'], bool):
                  return JsonResponse({'error': 'is_staff must be a boolean'}, status=400)
             user.is_staff = data['is_staff']
        if 'is_superuser' in data:
             if not isinstance(data['is_superuser'], bool):
                  return JsonResponse({'error': 'is_superuser must be a boolean'}, status=400)
             user.is_superuser = data['is_superuser']


        if not updated_fields and 'password' not in data and 'is_staff' not in data and 'is_superuser' not in data:
             return JsonResponse({'error': 'No updatable fields provided'}, status=400)


        try:
            for field, value in updated_fields.items():
                setattr(user, field, value)

            user.full_clean()
            user.save()

            response_data = build_user_response_data(user)
            return JsonResponse(response_data)

        except ValidationError as e:
             return JsonResponse({'error': 'Validation error', 'details': dict(e.message_dict)}, status=400)
        except IntegrityError:
             return JsonResponse({'error': 'A user with this username already exists'}, status=409)
        except Exception as e:
             print(f"Error updating user: {e}")
             return JsonResponse({'error': 'Could not update user', 'details': str(e)}, status=500)


    elif request.method == 'DELETE':
        try:
            user.delete()
            return JsonResponse({'message': f'User {user_id} deleted successfully'}, status=204)

        except Exception as e:
             print(f"Error deleting user: {e}")
             return JsonResponse({'error': 'Could not delete user', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# --- NEW user_list_view ---
# View to get a list of all users
def user_list_view(request):
    if request.method == 'GET':
        try:
            # Fetch all users
            users = User.objects.all().order_by('username') # Order for consistency

            # Serialize the list of users
            users_list_data = []
            for user in users:
                users_list_data.append(build_user_response_data(user)) # Use the helper function

            # Return the list as a JSON response
            # Use HttpResponse with json.dumps for list serialization
            response_json_string = json.dumps(users_list_data)
            return HttpResponse(response_json_string, content_type='application/json')

        except Exception as e:
            print(f"Error fetching user list: {e}")
            return JsonResponse({'error': 'Could not fetch user list', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)