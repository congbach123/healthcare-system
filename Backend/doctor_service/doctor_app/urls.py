from django.urls import path
from . import views

urlpatterns = [
    path('doctors/', views.doctor_list_create_view, name='doctor_list_create'),
    path('doctors/<uuid:user_id>/', views.doctor_detail_view, name='doctor_detail'),
    path('doctors/<uuid:user_id>/update/', views.doctor_update_view, name='doctor_update'),
    path('doctors/<uuid:user_id>/delete/', views.doctor_delete_view, name='doctor_delete'),
]