# healthcare_microservices/lab_service/lab_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import LabTechnician, LabOrder, LabResult # Import all three models
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

# --- Lab Technician Profile Views ---
@csrf_exempt
def lab_technician_profile_list_create_view(request):
    if request.method == 'GET':
        techs = LabTechnician.objects.all()
        aggregated_data = []

        for tech in techs:
            tech_data = {
                'user_id': str(tech.user_id),
                'employee_id': tech.employee_id,
                'created_at': tech.created_at.isoformat() if tech.created_at else None,
                'updated_at': tech.updated_at.isoformat() if tech.updated_at else None,
            }

            user_data, user_fetch_error = get_user_from_user_service(tech.user_id)

            combined_data_entry = {**tech_data}
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
            tech = LabTechnician.objects.create(
                user_id=user_id_uuid,
                employee_id=employee_id
            )

            response_data = {
                'user_id': str(tech.user_id),
                'employee_id': tech.employee_id,
                'created_at': tech.created_at.isoformat() if tech.created_at else None,
                'updated_at': tech.updated_at.isoformat() if tech.updated_at else None,
            }

            return JsonResponse(response_data, status=201)

        except IntegrityError:
             return JsonResponse({'error': f'A lab technician profile already exists for user ID {user_id_str} or employee ID {employee_id} is duplicated.'}, status=409)
        except Exception as e:
            print(f"Error creating lab technician profile: {e}")
            return JsonResponse({'error': 'Could not create lab technician profile', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

def lab_technician_profile_detail_view(request, user_id: UUID):
    if request.method == 'GET':
        try:
            tech = LabTechnician.objects.get(user_id=user_id)
            tech_data = {
                'user_id': str(tech.user_id),
                'employee_id': tech.employee_id,
                'created_at': tech.created_at.isoformat() if tech.created_at else None,
                'updated_at': tech.updated_at.isoformat() if tech.updated_at else None,
            }

            user_data, user_fetch_error = get_user_from_user_service(tech.user_id)

            combined_data = {**tech_data}
            if user_data:
                combined_data = {**user_data, **combined_data}

            if user_fetch_error:
                 combined_data['_user_error'] = user_fetch_error

            return JsonResponse(combined_data)

        except LabTechnician.DoesNotExist:
            return JsonResponse({'error': 'Lab Technician profile not found'}, status=404)
        except Exception as e:
             print(f"Error fetching lab technician profile: {e}")
             return JsonResponse({'error': 'Could not fetch lab technician profile', 'details': str(e)}, status=500)

    # Skipping PUT/PATCH/DELETE for now
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# --- Lab Order Views ---
@csrf_exempt
def lab_order_list_create_view(request):
    if request.method == 'GET':
        # Build filters
        filters = Q()
        patient_user_id_str = request.GET.get('patient_user_id')
        doctor_user_id_str = request.GET.get('doctor_user_id')
        status = request.GET.get('status')
        order_date_after_str = request.GET.get('order_date_after') # ISO 8601
        order_date_before_str = request.GET.get('order_date_before') # ISO 8601

        if patient_user_id_str:
            try: filters &= Q(patient_user_id=UUID(patient_user_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid patient_user_id format'}, status=400)
        if doctor_user_id_str:
            try: filters &= Q(doctor_user_id=UUID(doctor_user_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid doctor_user_id format'}, status=400)
        if status and status in [choice[0] for choice in LabOrder.ORDER_STATUS_CHOICES]:
            filters &= Q(status=status)
        elif status:
            return JsonResponse({'error': f'Invalid status. Allowed: {", ".join([choice[0] for choice in LabOrder.ORDER_STATUS_CHOICES])}'}, status=400)
        if order_date_after_str:
             try:
                 date_after = timezone.datetime.fromisoformat(order_date_after_str)
                 if timezone.is_naive(date_after): date_after = timezone.make_aware(date_after, timezone.get_current_timezone())
                 filters &= Q(order_date__gte=date_after)
             except ValueError: return JsonResponse({'error': 'Invalid order_date_after format. Use ISO 8601.'}, status=400)
        if order_date_before_str:
             try:
                 date_before = timezone.datetime.fromisoformat(order_date_before_str)
                 if timezone.is_naive(date_before): date_before = timezone.make_aware(date_before, timezone.get_current_timezone())
                 filters &= Q(order_date__lte=date_before)
             except ValueError: return JsonResponse({'error': 'Invalid order_date_before format. Use ISO 8601.'}, status=400)

        orders = LabOrder.objects.filter(filters).order_by('-order_date')
        aggregated_data = []

        for order in orders:
            order_data = {
                'id': str(order.id),
                'patient_user_id': str(order.patient_user_id),
                'doctor_user_id': str(order.doctor_user_id),
                'order_date': order.order_date.isoformat() if order.order_date else None,
                'test_type': order.test_type,
                'status': order.status,
                'notes': order.notes,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'updated_at': order.updated_at.isoformat() if order.updated_at else None,
            }

            # Aggregate patient and doctor user data
            patient_user_data, patient_error = get_user_from_user_service(order.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(order.doctor_user_id)

            combined_entry = {**order_data}
            if patient_user_data: combined_entry['patient'] = patient_user_data
            elif patient_error: combined_entry['_patient_user_error'] = patient_error
            if doctor_user_data: combined_entry['doctor'] = doctor_user_data
            elif doctor_error: combined_entry['_doctor_user_error'] = doctor_error

            aggregated_data.append(combined_entry)

        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')

    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        patient_user_id_str = data.get('patient_user_id')
        doctor_user_id_str = data.get('doctor_user_id')
        order_date_str = data.get('order_date') # Optional, defaults to now
        test_type = data.get('test_type')
        status = data.get('status', 'ordered') # Defaults to ordered
        notes = data.get('notes')

        if not patient_user_id_str or not doctor_user_id_str or not test_type:
             return JsonResponse({'error': 'patient_user_id, doctor_user_id, and test_type are required'}, status=400)

        try:
             patient_user_id_uuid = UUID(patient_user_id_str)
             doctor_user_id_uuid = UUID(doctor_user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid UUID format for patient_user_id or doctor_user_id'}, status=400)

        order_date = None
        if order_date_str:
            try:
                order_date = timezone.datetime.fromisoformat(order_date_str)
                if timezone.is_naive(order_date): order_date = timezone.make_aware(order_date, timezone.get_current_timezone())
            except ValueError: return JsonResponse({'error': 'Invalid order_date format. Use ISO 8601.'}, status=400)

        if status not in [choice[0] for choice in LabOrder.ORDER_STATUS_CHOICES]:
             return JsonResponse({'error': f'Invalid status "{status}". Allowed: {", ".join([choice[0] for choice in LabOrder.ORDER_STATUS_CHOICES])}'}, status=400)

        try:
            order = LabOrder.objects.create(
                patient_user_id=patient_user_id_uuid,
                doctor_user_id=doctor_user_id_uuid,
                order_date=order_date if order_date is not None else timezone.now(),
                test_type=test_type,
                status=status,
                notes=notes
            )

            response_data = {
                'id': str(order.id),
                'patient_user_id': str(order.patient_user_id),
                'doctor_user_id': str(order.doctor_user_id),
                'order_date': order.order_date.isoformat() if order.order_date else None,
                'test_type': order.test_type,
                'status': order.status,
                'notes': order.notes,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'updated_at': order.updated_at.isoformat() if order.updated_at else None,
            }
            return JsonResponse(response_data, status=201)

        except Exception as e:
            print(f"Error creating lab order: {e}")
            return JsonResponse({'error': 'Could not create lab order', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


def lab_order_detail_view(request, order_id: UUID):
    if request.method == 'GET':
        try:
            order = LabOrder.objects.get(id=order_id)
            order_data = {
                'id': str(order.id),
                'patient_user_id': str(order.patient_user_id),
                'doctor_user_id': str(order.doctor_user_id),
                'order_date': order.order_date.isoformat() if order.order_date else None,
                'test_type': order.test_type,
                'status': order.status,
                'notes': order.notes,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'updated_at': order.updated_at.isoformat() if order.updated_at else None,
            }

            patient_user_data, patient_error = get_user_from_user_service(order.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(order.doctor_user_id)

            combined_data = {**order_data}
            if patient_user_data: combined_data['patient'] = patient_user_data
            elif patient_error: combined_data['_patient_user_error'] = patient_error
            if doctor_user_data: combined_data['doctor'] = doctor_user_data
            elif doctor_error: combined_data['_doctor_user_error'] = doctor_error

            return JsonResponse(combined_data)

        except LabOrder.DoesNotExist:
            return JsonResponse({'error': 'Lab Order not found'}, status=404)
        except Exception as e:
             print(f"Error fetching lab order: {e}")
             return JsonResponse({'error': 'Could not fetch lab order', 'details': str(e)}, status=500)

    # Skipping PUT/PATCH/DELETE for now
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# --- Lab Result Views (Most complex aggregation) ---
@csrf_exempt
def lab_result_list_create_view(request):
    if request.method == 'GET':
        # Build filters for LabResult
        filters = Q()
        lab_order_id_str = request.GET.get('lab_order_id')
        lab_technician_user_id_str = request.GET.get('lab_technician_user_id')
        status = request.GET.get('status')
        result_date_after_str = request.GET.get('result_date_after') # ISO 8601
        result_date_before_str = request.GET.get('result_date_before') # ISO 8601

        # Filters directly on LabResult model
        if lab_order_id_str:
            try: filters &= Q(lab_order_id=UUID(lab_order_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid lab_order_id format'}, status=400)
        if lab_technician_user_id_str:
            try: filters &= Q(lab_technician_user_id=UUID(lab_technician_user_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid lab_technician_user_id format'}, status=400)
        if status and status in [choice[0] for choice in LabResult.RESULT_STATUS_CHOICES]:
            filters &= Q(status=status)
        elif status:
            return JsonResponse({'error': f'Invalid status. Allowed: {", ".join([choice[0] for choice in LabResult.RESULT_STATUS_CHOICES])}'}, status=400)
        if result_date_after_str:
             try:
                 date_after = timezone.datetime.fromisoformat(result_date_after_str)
                 if timezone.is_naive(date_after): date_after = timezone.make_aware(date_after, timezone.get_current_timezone())
                 filters &= Q(result_date__gte=date_after)
             except ValueError: return JsonResponse({'error': 'Invalid result_date_after format. Use ISO 8601.'}, status=400)
        if result_date_before_str:
             try:
                 date_before = timezone.datetime.fromisoformat(result_date_before_str)
                 if timezone.is_naive(date_before): date_before = timezone.make_aware(date_before, timezone.get_current_timezone())
                 filters &= Q(result_date__lte=date_before)
             except ValueError: return JsonResponse({'error': 'Invalid result_date_before format. Use ISO 8601.'}, status=400)

        # --- Optional: Filter results by patient_user_id or doctor_user_id from the *associated order* ---
        # This requires a join or pre-fetching orders. More complex SQL or ORM queries needed.
        # For simplicity in this demo, we filter directly on Result fields or lab_order_id.
        # If you need to filter results by patient/doctor, the client would first query orders, get order IDs,
        # and then query results using lab_order_id__in=[...list of order ids].
        # Or we could implement a more advanced query here that joins LabResult with LabOrder.
        # Skipping for now to keep the view code manageable.

        results = LabResult.objects.filter(filters).order_by('-result_date')
        aggregated_data = []

        # Collect all unique user_ids and order_ids needed for aggregation efficiently
        patient_ids = set()
        doctor_ids = set()
        tech_ids = set()
        order_ids = set()

        for result in results:
             order_ids.add(result.lab_order_id)
             tech_ids.add(result.lab_technician_user_id)

        # Fetch all needed LabOrders in one query
        orders_dict = {str(order.id): order for order in LabOrder.objects.filter(id__in=list(order_ids))}

        # Collect patient and doctor IDs from the fetched orders
        for order_id_str, order in orders_dict.items():
             patient_ids.add(order.patient_user_id)
             doctor_ids.add(order.doctor_user_id)

        # Fetch all needed User users in potentially optimized calls (if User had bulk GET)
        # For now, we'll use the helper function which calls one by one, still demonstrating the call.
        # A real optimization would be: user_users = get_users_bulk_from_user(list(patient_ids | doctor_ids | tech_ids))
        # Then iterate through results and match user data from the fetched dictionary.
        # Sticking to the simple helper for demo consistency.

        for result in results:
            result_data = {
                'id': str(result.id),
                'lab_order_id': str(result.lab_order_id),
                'lab_technician_user_id': str(result.lab_technician_user_id),
                'result_date': result.result_date.isoformat() if result.result_date else None,
                'result_data': result.result_data, # JSONField is handled by Django/jsonfield
                'status': result.status,
                'notes': result.notes,
                'created_at': result.created_at.isoformat() if result.created_at else None,
                'updated_at': result.updated_at.isoformat() if result.updated_at else None,
            }

            combined_entry = {**result_data} # Start with result data

            # Aggregate Order data (from the dictionary fetched earlier)
            order = orders_dict.get(result_data['lab_order_id'])
            if order:
                 combined_entry['order'] = {
                     'id': str(order.id),
                     'patient_user_id': str(order.patient_user_id),
                     'doctor_user_id': str(order.doctor_user_id),
                     'order_date': order.order_date.isoformat() if order.order_date else None,
                     'test_type': order.test_type,
                     'status': order.status,
                     'notes': order.notes,
                     # Exclude timestamps from nested order to avoid confusion with result timestamps
                 }
                 # Now aggregate Patient and Doctor user data based on the Order's user_ids
                 patient_user_data, patient_error = get_user_from_user_service(order.patient_user_id)
                 doctor_user_data, doctor_error = get_user_from_user_service(order.doctor_user_id)

                 if patient_user_data: combined_entry['order']['patient'] = patient_user_data
                 elif patient_error: combined_entry['order']['_patient_user_error'] = patient_error
                 if doctor_user_data: combined_entry['order']['doctor'] = doctor_user_data
                 elif doctor_error: combined_entry['order']['_doctor_user_error'] = doctor_error

            else:
                 combined_entry['_order_error'] = f"Corresponding Lab Order not found for ID {result_data['lab_order_id']}"
                 print(f"WARNING: {combined_entry['_order_error']}")

            # Aggregate Lab Technician user data
            tech_user_data, tech_error = get_user_from_user_service(result.lab_technician_user_id)
            if tech_user_data: combined_entry['lab_technician'] = tech_user_data
            elif tech_error: combined_entry['_lab_technician_user_error'] = tech_error

            aggregated_data.append(combined_entry)

        response_json_string = json.dumps(aggregated_data)
        return HttpResponse(response_json_string, content_type='application/json')


    elif request.method == 'POST':
        data = parse_json_body(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Required fields for creating a lab result
        lab_order_id_str = data.get('lab_order_id')
        lab_technician_user_id_str = data.get('lab_technician_user_id')
        result_date_str = data.get('result_date') # Optional, defaults to now
        result_data = data.get('result_data')
        status = data.get('status', 'final') # Defaults to final
        notes = data.get('notes')

        if not lab_order_id_str or not lab_technician_user_id_str or result_data is None:
             return JsonResponse({'error': 'lab_order_id, lab_technician_user_id, and result_data are required'}, status=400)
        if not isinstance(result_data, (dict, list, type(None))):
             return JsonResponse({'error': 'result_data must be valid JSON (object, array, or null)'}, status=400)

        try:
             lab_order_id_uuid = UUID(lab_order_id_str)
             lab_technician_user_id_uuid = UUID(lab_technician_user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid UUID format for lab_order_id or lab_technician_user_id'}, status=400)

        result_date = None
        if result_date_str:
            try:
                result_date = timezone.datetime.fromisoformat(result_date_str)
                if timezone.is_naive(result_date): result_date = timezone.make_aware(result_date, timezone.get_current_timezone())
            except ValueError: return JsonResponse({'error': 'Invalid result_date format. Use ISO 8601.'}, status=400)

        if status not in [choice[0] for choice in LabResult.RESULT_STATUS_CHOICES]:
             return JsonResponse({'error': f'Invalid status "{status}". Allowed: {", ".join([choice[0] for choice in LabResult.RESULT_STATUS_CHOICES])}'}, status=400)

        # --- Optional Validation ---
        # You could check if the lab_order_id exists in the database here.
        # You could check if the lab_technician_user_id exists and is type 'lab_technician' in User.
        # Skipping for basic demo.
        # --- End Optional Validation ---


        try:
            result = LabResult.objects.create(
                lab_order_id=lab_order_id_uuid,
                lab_technician_user_id=lab_technician_user_id_uuid,
                result_date=result_date if result_date is not None else timezone.now(),
                result_data=result_data,
                status=status,
                notes=notes
            )

            response_data = {
                'id': str(result.id),
                'lab_order_id': str(result.lab_order_id),
                'lab_technician_user_id': str(result.lab_technician_user_id),
                'result_date': result.result_date.isoformat() if result.result_date else None,
                'result_data': result.result_data,
                'status': result.status,
                'notes': result.notes,
                'created_at': result.created_at.isoformat() if result.created_at else None,
                'updated_at': result.updated_at.isoformat() if result.updated_at else None,
            }
            return JsonResponse(response_data, status=201)

        except Exception as e:
            print(f"Error creating lab result: {e}")
            # More specific error handling for JSONField validation if needed
            # e.g. except JSONDecodeError: ...
            return JsonResponse({'error': 'Could not create lab result', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


def lab_result_detail_view(request, result_id: UUID):
    if request.method == 'GET':
        try:
            result = LabResult.objects.get(id=result_id)
            result_data = {
                'id': str(result.id),
                'lab_order_id': str(result.lab_order_id),
                'lab_technician_user_id': str(result.lab_technician_user_id),
                'result_date': result.result_date.isoformat() if result.result_date else None,
                'result_data': result.result_data,
                'status': result.status,
                'notes': result.notes,
                'created_at': result.created_at.isoformat() if result.created_at else None,
                'updated_at': result.updated_at.isoformat() if result.updated_at else None,
            }

            combined_data = {**result_data} # Start with result data

            # Aggregate Order data
            order = None
            try:
                 order = LabOrder.objects.get(id=result.lab_order_id)
                 combined_data['order'] = {
                     'id': str(order.id),
                     'patient_user_id': str(order.patient_user_id),
                     'doctor_user_id': str(order.doctor_user_id),
                     'order_date': order.order_date.isoformat() if order.order_date else None,
                     'test_type': order.test_type,
                     'status': order.status,
                     'notes': order.notes,
                 }
                 # Aggregate Patient and Doctor user data from the Order
                 patient_user_data, patient_error = get_user_from_user_service(order.patient_user_id)
                 doctor_user_data, doctor_error = get_user_from_user_service(order.doctor_user_id)

                 if patient_user_data: combined_data['order']['patient'] = patient_user_data
                 elif patient_error: combined_data['order']['_patient_user_error'] = patient_error
                 if doctor_user_data: combined_data['order']['doctor'] = doctor_user_data
                 elif doctor_error: combined_data['order']['_doctor_user_error'] = doctor_error

            except LabOrder.DoesNotExist:
                 combined_data['_order_error'] = f"Corresponding Lab Order not found for ID {result.lab_order_id}"
                 print(f"WARNING: {combined_data['_order_error']}")
            except Exception as e:
                 combined_data['_order_error'] = f"Error fetching corresponding Lab Order for ID {result.lab_order_id}: {e}"
                 print(f"ERROR: {combined_data['_order_error']}")


            # Aggregate Lab Technician user data
            tech_user_data, tech_error = get_user_from_user_service(result.lab_technician_user_id)
            if tech_user_data: combined_data['lab_technician'] = tech_user_data
            elif tech_error: combined_data['_lab_technician_user_error'] = tech_error


            return JsonResponse(combined_data)

        except LabResult.DoesNotExist:
            return JsonResponse({'error': 'Lab Result not found'}, status=404)
        except Exception as e:
             print(f"Error fetching lab result: {e}")
             return JsonResponse({'error': 'Could not fetch lab result', 'details': str(e)}, status=500)

    # Skipping PUT/PATCH/DELETE for now
    return JsonResponse({'error': 'Method not allowed'}, status=405)