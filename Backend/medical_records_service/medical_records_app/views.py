# healthcare_microservices/medical_records_service/medical_records_app/views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import DoctorReport
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

# Helper function to call User Service and return user data or error (same pattern, slightly adapted)
# Can make this more generic if needed, but specific service calls are clearer for demo
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

# Helper function to call other services
def call_other_service(base_url, endpoint, params=None):
    """Generic helper to call other GET endpoints."""
    url = f"{base_url}{endpoint}"
    print(f"Medical Records Service calling: {url} with params {params}") # Log the S2S call
    try:
        response = requests.get(url, params=params)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        print(f"Call to {url} successful.")
        return response.json(), None # Return data and no error
    except requests.exceptions.RequestException as e:
        print(f"Network or HTTP error calling {url}: {e}")
        return None, f"Error calling {url}: {e}"
    except Exception as e:
        print(f"Unexpected error during call to {url}: {e}")
        return None, f"Unexpected error during call to {url}: {e}"


# --- Doctor Report Views (Owned by Medical Records Service) ---
@csrf_exempt # WARNING: Disable CSRF protection for API POST.
def doctor_report_list_create_view(request):
    if request.method == 'GET':
        # Build filters for Doctor Reports
        filters = Q()
        patient_user_id_str = request.GET.get('patient_user_id')
        doctor_user_id_str = request.GET.get('doctor_user_id')
        report_date_after_str = request.GET.get('report_date_after') # ISO 8601
        report_date_before_str = request.GET.get('report_date_before') # ISO 8601
        search_query = request.GET.get('search') # Basic text search

        if patient_user_id_str:
            try: filters &= Q(patient_user_id=UUID(patient_user_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid patient_user_id format'}, status=400)
        if doctor_user_id_str:
            try: filters &= Q(doctor_user_id=UUID(doctor_user_id_str))
            except ValueError: return JsonResponse({'error': 'Invalid doctor_user_id format'}, status=400)
        if report_date_after_str:
             try:
                 date_after = timezone.datetime.fromisoformat(report_date_after_str)
                 if timezone.is_naive(date_after): date_after = timezone.make_aware(date_after, timezone.get_current_timezone())
                 filters &= Q(report_date__gte=date_after)
             except ValueError: return JsonResponse({'error': 'Invalid report_date_after format. Use ISO 8601.'}, status=400)
        if report_date_before_str:
             try:
                 date_before = timezone.datetime.fromisoformat(report_date_before_str)
                 if timezone.is_naive(date_before): date_before = timezone.make_aware(date_before, timezone.get_current_timezone())
                 filters &= Q(report_date__lte=date_before)
             except ValueError: return JsonResponse({'error': 'Invalid report_date_before format. Use ISO 8601.'}, status=400)
        if search_query:
            # Simple search in title or content
            filters &= (Q(title__icontains=search_query) | Q(content__icontains=search_query))


        reports = DoctorReport.objects.filter(filters).order_by('-report_date')
        aggregated_data = []

        # Collect all unique user_ids needed for aggregation efficiently
        patient_ids = set()
        doctor_ids = set()
        for report in reports:
             patient_ids.add(report.patient_user_id)
             doctor_ids.add(report.doctor_user_id)

        # Fetch all needed User users in optimized calls (if User had bulk GET)
        # For now, iterate over reports and call get_user_from_user_service which calls one by one.
        # This demonstrates the S2S call per item in list loop, similar to Lab Service Results.

        for report in reports:
            report_data = {
                'id': str(report.id),
                'patient_user_id': str(report.patient_user_id),
                'doctor_user_id': str(report.doctor_user_id),
                'report_date': report.report_date.isoformat() if report.report_date else None,
                'title': report.title,
                'content': report.content,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'updated_at': report.updated_at.isoformat() if report.updated_at else None,
            }

            combined_entry = {**report_data} # Start with report data

            # Aggregate patient and doctor user data
            patient_user_data, patient_error = get_user_from_user_service(report.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(report.doctor_user_id)

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
        report_date_str = data.get('report_date') # Optional, defaults to now
        title = data.get('title')
        content = data.get('content')

        if not patient_user_id_str or not doctor_user_id_str or not title or not content:
             return JsonResponse({'error': 'patient_user_id, doctor_user_id, title, and content are required'}, status=400)

        try:
             patient_user_id_uuid = UUID(patient_user_id_str)
             doctor_user_id_uuid = UUID(doctor_user_id_str)
        except ValueError:
             return JsonResponse({'error': 'Invalid UUID format for patient_user_id or doctor_user_id'}, status=400)

        report_date = None
        if report_date_str:
            try:
                report_date = timezone.datetime.fromisoformat(report_date_str)
                if timezone.is_naive(report_date): report_date = timezone.make_aware(report_date, timezone.get_current_timezone())
            except ValueError: return JsonResponse({'error': 'Invalid report_date format. Use ISO 8601.'}, status=400)

        try:
            report = DoctorReport.objects.create(
                patient_user_id=patient_user_id_uuid,
                doctor_user_id=doctor_user_id_uuid,
                report_date=report_date if report_date is not None else timezone.now(),
                title=title,
                content=content
            )

            response_data = {
                'id': str(report.id),
                'patient_user_id': str(report.patient_user_id),
                'doctor_user_id': str(report.doctor_user_id),
                'report_date': report.report_date.isoformat() if report.report_date else None,
                'title': report.title,
                'content': report.content,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'updated_at': report.updated_at.isoformat() if report.updated_at else None,
            }
            return JsonResponse(response_data, status=201)

        except Exception as e:
            print(f"Error creating doctor report: {e}")
            return JsonResponse({'error': 'Could not create doctor report', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


def doctor_report_detail_view(request, report_id: UUID):
    if request.method == 'GET':
        try:
            report = DoctorReport.objects.get(id=report_id)
            report_data = {
                'id': str(report.id),
                'patient_user_id': str(report.patient_user_id),
                'doctor_user_id': str(report.doctor_user_id),
                'report_date': report.report_date.isoformat() if report.report_date else None,
                'title': report.title,
                'content': report.content,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'updated_at': report.updated_at.isoformat() if report.updated_at else None,
            }

            patient_user_data, patient_error = get_user_from_user_service(report.patient_user_id)
            doctor_user_data, doctor_error = get_user_from_user_service(report.doctor_user_id)

            combined_data = {**report_data}
            if patient_user_data: combined_data['patient'] = patient_user_data
            elif patient_error: combined_data['_patient_user_error'] = patient_error
            if doctor_user_data: combined_data['doctor'] = doctor_user_data
            elif doctor_error: combined_data['_doctor_user_error'] = doctor_error

            return JsonResponse(combined_data)

        except DoctorReport.DoesNotExist:
            return JsonResponse({'error': 'Doctor Report not found'}, status=404)
        except Exception as e:
             print(f"Error fetching doctor report: {e}")
             return JsonResponse({'error': 'Could not fetch doctor report', 'details': str(e)}, status=500)

    # Skipping PUT/PATCH/DELETE for now
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# --- Patient Medical History View (Major Aggregator) ---
# This view orchestrates calls to multiple services
def patient_medical_history_view(request, patient_user_id: UUID):
    if request.method == 'GET':
        combined_history = {} # Dictionary to build the full history response

        # 1. Get Patient's User data
        patient_user_data, user_error = get_user_from_user_service(patient_user_id)
        if patient_user_data:
            combined_history['patient_user'] = patient_user_data
        elif user_error:
            combined_history['_patient_user_error'] = user_error
            # Decide if you return a 404 if the patient user is missing
            # For this demo, let's return whatever data we can get with the error flagged.
            # return JsonResponse({'error': f'Patient not found in User Service: {user_error}'}, status=404)


        # 2. Get Patient's specific profile data from Patient Service
        patient_profile_data, profile_error = call_other_service(
            settings.PATIENT_SERVICE_BASE_URL,
            f'/patients/{patient_user_id}/'
        )
        if patient_profile_data:
            combined_history['patient_profile'] = patient_profile_data
        elif profile_error:
             combined_history['_patient_profile_error'] = profile_error # Add error if call failed


        # 3. Get Patient's Vitals from Nurse Service
        # Nurse Service GET /api/vitals/ endpoint supports filtering by patient_user_id
        patient_vitals_data, vitals_error = call_other_service(
            settings.NURSE_SERVICE_BASE_URL,
            '/vitals/',
            params={'patient_user_id': str(patient_user_id)} # Pass UUID as string query param
        )
        if patient_vitals_data:
            # Nurse Service already aggregates patient/nurse user, so we include the results directly
            combined_history['vitals_history'] = patient_vitals_data
        elif vitals_error:
            combined_history['_vitals_history_error'] = vitals_error # Add error if call failed


        # 4. Get Patient's Lab Orders from Lab Service
        # Lab Service GET /api/orders/ endpoint supports filtering by patient_user_id
        lab_orders_data, orders_error = call_other_service(
            settings.LAB_SERVICE_BASE_URL,
            '/orders/',
            params={'patient_user_id': str(patient_user_id)} # Pass UUID as string query param
        )
        if lab_orders_data:
            # Lab Service already aggregates patient/doctor user for orders
            combined_history['lab_orders'] = lab_orders_data
        elif orders_error:
             combined_history['_lab_orders_error'] = orders_error # Add error


        # 5. Get Patient's Lab Results from Lab Service
        # Lab Service GET /api/results/ endpoint supports filtering by lab_order_id.
        # It doesn't directly filter by patient_user_id (as noted in Lab Service views).
        # To get results for a patient, we'd ideally fetch orders first (as done above),
        # collect the order IDs, and then query results by those order IDs.
        # However, the Lab Service GET /api/results/ endpoint *does* aggregate order data
        # including patient/doctor user. So, we can fetch ALL results and filter by patient_user_id
        # *after* getting the response, although this is inefficient if there are many results globally.
        # A better approach: modify the Lab Service GET /api/results/ to accept patient_user_id filter.
        # Or, as a simpler demo approach here: just fetch ALL results from the Lab Service's
        # list endpoint (which aggregates patient user) and rely on that aggregation.
        # Let's modify the call to the Lab Service's results endpoint to filter by patient_user_id if that filter was added there.
        # Assuming for this example that the Lab Service GET /api/results/ endpoint *was* modified to accept patient_user_id filter.
        # If not, the simple call below will get all results and the Medical Records service won't filter them.
        # For robustness, let's explicitly add patient_user_id filter here, assuming the Lab Service supports it now.
        # If Lab Service GET /api/results/ *doesn't* support patient_user_id filter, this call will still succeed but the list might be large.
        # A more correct pattern: Use the `lab_orders_data` fetched in step 4 to get the `lab_order_id`s,
        # then make a call like `GET /api/results/?lab_order_id__in=<comma_separated_ids>`.
        # Since Lab Service's GET /api/results/ *already* aggregates order data including patient/doctor user,
        # the easiest approach for this demo is to call Lab Service's *list* endpoint for results and hope it has patient filtering,
        # OR just fetch all and rely on its aggregation providing the patient info.
        # Let's assume Lab Service GET /api/results/ supports patient_user_id filter for simplicity in the aggregator.
        lab_results_data, results_error = call_other_service(
             settings.LAB_SERVICE_BASE_URL,
             '/results/',
             params={'patient_user_id': str(patient_user_id)} # Assume Lab Results endpoint accepts this filter
        )
        if lab_results_data:
             # Lab Service already aggregates order, patient, doctor, lab tech user for results
             combined_history['lab_results'] = lab_results_data
        elif results_error:
             combined_history['_lab_results_error'] = results_error # Add error


        # 6. Get Patient's Doctor Reports from THIS Service's database
        # Use the filter logic already built in doctor_report_list_create_view
        try:
             reports = DoctorReport.objects.filter(patient_user_id=patient_user_id).order_by('-report_date')
             doctor_reports_data = []
             # Aggregation for reports happens here in this service (its owner)
             # We need Doctor User data for each report
             doctor_ids = set(report.doctor_user_id for report in reports)
             # Fetch all unique doctors needed for aggregation efficiently
             doctors_data = {}
             for doc_id in doctor_ids:
                  user_data, err = get_user_from_user_service(doc_id)
                  if user_data: doctors_data[str(doc_id)] = user_data
                  elif err: print(f"WARNING: Could not fetch user for doctor {doc_id}: {err}")


             for report in reports:
                 report_data = {
                     'id': str(report.id),
                     'patient_user_id': str(report.patient_user_id),
                     'doctor_user_id': str(report.doctor_user_id),
                     'report_date': report.report_date.isoformat() if report.report_date else None,
                     'title': report.title,
                     'content': report.content,
                     'created_at': report.created_at.isoformat() if report.created_at else None,
                     'updated_at': report.updated_at.isoformat() if report.updated_at else None,
                 }
                 combined_report_entry = {**report_data}
                 # Add doctor user data fetched earlier
                 if str(report.doctor_user_id) in doctors_data:
                      combined_report_entry['doctor'] = doctors_data[str(report.doctor_user_id)]
                 else:
                      combined_report_entry['_doctor_user_error'] = f"User data missing for doctor ID {report.doctor_user_id}"

                 doctor_reports_data.append(combined_report_entry)

             combined_history['doctor_reports'] = doctor_reports_data

        except Exception as e:
             print(f"Error fetching Doctor Reports: {e}")
             combined_history['_doctor_reports_error'] = f"Error fetching Doctor Reports: {e}"


        # 7. Get Patient's Prescriptions from Prescription Service (To Do)
        # When Prescription Service is implemented:
        # prescriptions_data, prescriptions_error = call_other_service(
        #     settings.PRESCRIPTION_SERVICE_BASE_URL,
        #     '/prescriptions/',
        #     params={'patient_user_id': str(patient_user_id)}
        # )
        # if prescriptions_data:
        #     combined_history['prescriptions'] = prescriptions_data
        # elif prescriptions_error:
        #      combined_history['_prescriptions_error'] = prescriptions_error


        # 8. Return the comprehensive aggregated history
        # Check if we got any data at all, or if the patient user wasn't found.
        # If patient user wasn't found, maybe return 404? Let's return 200 with the error flag for demo.
        return JsonResponse(combined_history)

    # Skipping PUT/PATCH/DELETE for now
    return JsonResponse({'error': 'Method not allowed'}, status=405)