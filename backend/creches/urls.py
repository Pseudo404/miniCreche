# creches/urls.py
from django.urls import path
from .views import CrecheLoginView, EmployeeListView, EmargementCreateView

urlpatterns = [
    path('login/', CrecheLoginView.as_view()),
    path('employees/', EmployeeListView.as_view()),
    path('emargements/', EmargementCreateView.as_view()),
]