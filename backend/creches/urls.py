# creches/urls.py
from django.urls import path
from .views import (
    LoginView,
    EmployeeListView,
    EmargementCreateView,
    AdminEmployeeListView,
    AdminEmployeeEmargementView,
    AdminEmployeeTimeView,
    EmployeeScheduleView,
)

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('employees/', EmployeeListView.as_view()),
    path('emargements/', EmargementCreateView.as_view()),

    # Admin endpoints
    path('admin/employees/', AdminEmployeeListView.as_view()),
    path('admin/employees/<uuid:employee_id>/emargements/', AdminEmployeeEmargementView.as_view()),
    path('admin/employees/<uuid:employee_id>/time/', AdminEmployeeTimeView.as_view()),
    path('admin/employees/<uuid:employee_id>/schedule/', EmployeeScheduleView.as_view()),
]