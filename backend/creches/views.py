# creches/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import Creche, Employee, Emargement


class CrecheLoginView(APIView):
    """
    La tablette se connecte une fois avec le compte User lié à la crèche
    (username/password classique Django), pas avec Creche directement.
    """
    permission_classes = []  # accès public, c'est le point d'entrée

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Identifiants invalides"}, status=401)

        profil = getattr(user, "profil", None)
        if profil is None or profil.role != "CRECHE" or profil.creche is None:
            return Response({"detail": "Ce compte n'est pas rattaché à une crèche"}, status=403)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "creche": {"id": str(profil.creche.id), "nom": profil.creche.nom},
        })


class EmployeeListView(APIView):
    """Liste des employés de la crèche connectée, pour l'écran de sélection."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profil = request.user.profil
        employees = Employee.objects.filter(creche=profil.creche, is_active=True)
        data = [
            {"id": str(e.id), "nom": e.nom, "prenom": e.prenom}
            for e in employees
        ]
        return Response(data)


class EmargementCreateView(APIView):
    """Enregistre une signature (arrivée/départ)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profil = request.user.profil
        employee_id = request.data.get("employee_id")
        type_event = request.data.get("type_event")
        signature = request.data.get("signature")

        try:
            employee = Employee.objects.get(id=employee_id, creche=profil.creche)
        except Employee.DoesNotExist:
            return Response({"detail": "Employé introuvable"}, status=404)

        emargement = Emargement.objects.create(
            employee=employee,
            creche=profil.creche,
            type_event=type_event,
            signature=signature,
        )
        return Response({
            "ok": True,
            "id": str(emargement.id),
            "horodatage": emargement.horodatage,
        }, status=201)