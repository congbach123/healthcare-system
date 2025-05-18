# healthcare_microservices/lab_service/lab_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Lab Technician Profile URLs
    path('labtechs/', views.lab_technician_profile_list_create_view, name='lab_technician_profile_list_create'),
    path('labtechs/<uuid:user_id>/', views.lab_technician_profile_detail_view, name='lab_technician_profile_detail'),

    # Lab Order URLs
    path('orders/', views.lab_order_list_create_view, name='lab_order_list_create'),
    path('orders/<uuid:order_id>/', views.lab_order_detail_view, name='lab_order_detail'),

    # Lab Result URLs
    path('results/', views.lab_result_list_create_view, name='lab_result_list_create'),
    path('results/<uuid:result_id>/', views.lab_result_detail_view, name='lab_result_detail'),

    # Skipping update/delete URLs for now
    # path('labtechs/<uuid:user_id>/', views.lab_technician_profile_update_view, name='lab_technician_profile_update'),
    # path('labtechs/<uuid:user_id>/', views.lab_technician_profile_delete_view, name='lab_technician_profile_delete'),
    # path('orders/<uuid:order_id>/', views.lab_order_update_view, name='lab_order_update'),
    # path('orders/<uuid:order_id>/', views.lab_order_delete_view, name='lab_order_delete'),
    # path('results/<uuid:result_id>/', views.lab_result_update_view, name='lab_result_update'),
    # path('results/<uuid:result_id>/', views.lab_result_delete_view, name='lab_result_delete'),
]