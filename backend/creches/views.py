# creches/views.py
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import Creche, Employee, Emargement, EmployeeSchedule


class LoginView(APIView):
    """
    Connexion pour les tablettes (rôle CRECHE) ou la directrice (rôle ADMIN).
    """
    permission_classes = []  # accès public, c'est le point d'entrée

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Identifiants invalides"}, status=401)

        profil = getattr(user, "profil", None)
        if profil is None:
            return Response({"detail": "Ce compte n'a pas de profil associé"}, status=403)

        refresh = RefreshToken.for_user(user)
        
        response_data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "role": profil.role,
        }
        
        if profil.role == "CRECHE" and profil.creche:
            response_data["creche"] = {"id": str(profil.creche.id), "nom": profil.creche.nom}

        return Response(response_data)


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

from collections import defaultdict
from django.utils import timezone
import calendar as cal_module

def _schedule_minutes_for_date(schedule_map, date_obj):
    """Calcule les minutes contractuelles pour une date donnée d'après la grille."""
    dow = date_obj.weekday()  # 0=Lundi … 6=Dimanche
    sched = schedule_map.get(dow)
    if not sched:
        return 0
    total = 0
    def slot_minutes(debut, fin):
        if debut and fin:
            d = datetime.combine(date_obj, debut)
            f = datetime.combine(date_obj, fin)
            diff = (f - d).total_seconds() / 60
            return max(diff, 0)
        return 0
    total += slot_minutes(sched.matin_debut, sched.matin_fin)
    total += slot_minutes(sched.aprem_debut, sched.aprem_fin)
    return total

def _schedule_pause_minutes(schedule_map, date_obj):
    """Calcule la durée de la pause contractuelle (entre matin_fin et aprem_debut)."""
    dow = date_obj.weekday()
    sched = schedule_map.get(dow)
    if not sched:
        return 0
    if sched.matin_fin and sched.aprem_debut:
        d = datetime.combine(date_obj, sched.matin_fin)
        f = datetime.combine(date_obj, sched.aprem_debut)
        diff = (f - d).total_seconds() / 60
        return max(diff, 0)
    return 0


class AdminEmployeeListView(APIView):
    """Liste de tous les employés pour la directrice, avec bilan mensuel du mois en cours."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.profil.role != "ADMIN":
            return Response({"detail": "Accès refusé"}, status=403)

        now = timezone.now()
        month = int(request.query_params.get('month', now.month))
        year  = int(request.query_params.get('year',  now.year))

        employees = Employee.objects.all().select_related('creche').prefetch_related('schedules')

        data = []
        for e in employees:
            # Construire la map dow → schedule
            schedule_map = {s.jour: s for s in e.schedules.all()}

            emargements = Emargement.objects.filter(
                employee=e,
                horodatage__year=year,
                horodatage__month=month
            ).order_by('horodatage')

            days = defaultdict(list)
            for em in emargements:
                day_str = em.horodatage.astimezone(timezone.get_current_timezone()).date()
                days[day_str].append(em)

            total_worked = 0
            total_contract = 0

            for day_date, events in days.items():
                arrivees = [ev for ev in events if ev.type_event == 'ARRIVEE']
                departs  = [ev for ev in events if ev.type_event == 'DEPART']

                if len(arrivees) == 1 and len(departs) == 1:
                    worked = (departs[0].horodatage - arrivees[0].horodatage).total_seconds() / 60

                    if schedule_map:
                        contract = _schedule_minutes_for_date(schedule_map, day_date)
                        scheduled_pause = _schedule_pause_minutes(schedule_map, day_date)
                        worked -= scheduled_pause
                        worked = max(worked, 0)
                    else:
                        contract = float(e.heures_jour_contrat) * 60

                    total_worked   += worked
                    total_contract += contract

            diff = total_worked - total_contract
            data.append({
                "id": str(e.id),
                "nom": e.nom,
                "prenom": e.prenom,
                "creche_nom": e.creche.nom,
                "heures_jour_contrat": str(e.heures_jour_contrat),
                "total_worked_minutes": round(total_worked, 1),
                "total_contract_minutes": round(total_contract, 1),
                "diff_minutes": round(diff, 1),
            })
        return Response(data)


class AdminEmployeeEmargementView(APIView):
    """Historique visuel des signatures pour un employé."""
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        if request.user.profil.role != "ADMIN":
            return Response({"detail": "Accès refusé"}, status=403)

        month = int(request.query_params.get('month', timezone.now().month))
        year  = int(request.query_params.get('year',  timezone.now().year))

        emargements = Emargement.objects.filter(
            employee_id=employee_id,
            horodatage__year=year,
            horodatage__month=month
        ).order_by('-horodatage')

        data = [
            {
                "id": str(e.id),
                "type_event": e.type_event,
                "horodatage": e.horodatage,
                "signature": e.signature,
            }
            for e in emargements
        ]
        return Response(data)


class AdminEmployeeTimeView(APIView):
    """Calcul des horaires par jour et mensuel pour un employé (utilise EmployeeSchedule si défini)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        if request.user.profil.role != "ADMIN":
            return Response({"detail": "Accès refusé"}, status=403)

        month = int(request.query_params.get('month', timezone.now().month))
        year  = int(request.query_params.get('year',  timezone.now().year))

        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(status=404)

        schedule_map = {s.jour: s for s in employee.schedules.all()}

        emargements = Emargement.objects.filter(
            employee=employee,
            horodatage__year=year,
            horodatage__month=month
        ).order_by('horodatage')

        days = defaultdict(list)
        for e in emargements:
            day_date = e.horodatage.astimezone(timezone.get_current_timezone()).date()
            days[day_date].append(e)

        results = []
        total_worked_minutes   = 0
        total_contract_minutes = 0

        for day_date, events in sorted(days.items()):
            arrivees = [e for e in events if e.type_event == 'ARRIVEE']
            departs  = [e for e in events if e.type_event == 'DEPART']

            worked_minutes = 0
            is_complete    = False

            if len(arrivees) == 1 and len(departs) == 1:
                delta = departs[0].horodatage - arrivees[0].horodatage
                worked_minutes = delta.total_seconds() / 60
                is_complete = True

            if schedule_map:
                contract_minutes = _schedule_minutes_for_date(schedule_map, day_date)
            else:
                contract_minutes = float(employee.heures_jour_contrat) * 60

            if is_complete:
                diff_minutes = worked_minutes - contract_minutes
                total_worked_minutes   += worked_minutes
                total_contract_minutes += contract_minutes
            else:
                diff_minutes = 0

            results.append({
                "date": day_date.isoformat(),
                "worked_minutes": round(worked_minutes, 1),
                "contract_minutes": round(contract_minutes, 1),
                "diff_minutes": round(diff_minutes, 1),
                "is_complete": is_complete,
                "events_count": len(events)
            })

        total_diff_minutes = total_worked_minutes - total_contract_minutes

        return Response({
            "employee_id": str(employee.id),
            "heures_jour_contrat": float(employee.heures_jour_contrat),
            "has_schedule": bool(schedule_map),
            "month": month,
            "year": year,
            "daily": results,
            "total_worked_minutes": round(total_worked_minutes, 1),
            "total_contract_minutes": round(total_contract_minutes, 1),
            "total_diff_minutes": round(total_diff_minutes, 1),
        })


class EmployeeScheduleView(APIView):
    """GET/POST l'emploi du temps hebdomadaire précis d'un employé (directrice uniquement)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        if request.user.profil.role != "ADMIN":
            return Response({"detail": "Accès refusé"}, status=403)

        schedules = EmployeeSchedule.objects.filter(employee_id=employee_id).order_by('jour')
        data = [
            {
                "jour": s.jour,
                "matin_debut":  s.matin_debut.strftime("%H:%M")  if s.matin_debut  else None,
                "matin_fin":    s.matin_fin.strftime("%H:%M")    if s.matin_fin    else None,
                "aprem_debut":  s.aprem_debut.strftime("%H:%M")  if s.aprem_debut  else None,
                "aprem_fin":    s.aprem_fin.strftime("%H:%M")    if s.aprem_fin    else None,
            }
            for s in schedules
        ]
        return Response(data)

    def post(self, request, employee_id):
        if request.user.profil.role != "ADMIN":
            return Response({"detail": "Accès refusé"}, status=403)

        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(status=404)

        # Le body est une liste de jours : [{jour, matin_debut, matin_fin, aprem_debut, aprem_fin}, …]
        entries = request.data
        if not isinstance(entries, list):
            return Response({"detail": "Format attendu : liste de jours"}, status=400)

        for entry in entries:
            jour = entry.get("jour")
            if jour is None:
                continue
            EmployeeSchedule.objects.update_or_create(
                employee=employee,
                jour=int(jour),
                defaults={
                    "matin_debut": entry.get("matin_debut") or None,
                    "matin_fin":   entry.get("matin_fin")   or None,
                    "aprem_debut": entry.get("aprem_debut") or None,
                    "aprem_fin":   entry.get("aprem_fin")   or None,
                }
            )

        return Response({"ok": True})