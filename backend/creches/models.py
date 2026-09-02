# creches/models.py
from django.db import models
import uuid

class Creche(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=255)
    code_acces = models.CharField(max_length=50, unique=True)  # identifiant tablette
    adresse = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)


class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creche = models.ForeignKey(Creche, on_delete=models.CASCADE, related_name="employees")
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    poste = models.CharField(max_length=100, blank=True)
    heures_jour_contrat = models.DecimalField(max_digits=4, decimal_places=2, default=7.0, help_text="Heures de travail prévues par jour (ex: 7.0 pour 35h/semaine)")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["nom", "prenom"]


class Emargement(models.Model):
    class TypeEvent(models.TextChoices):
        ARRIVEE = "ARRIVEE", "Arrivée"
        DEPART  = "DEPART",  "Départ"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="emargements")
    creche = models.ForeignKey(Creche, on_delete=models.CASCADE, related_name="emargements")
    type_event = models.CharField(max_length=20, choices=TypeEvent.choices)
    horodatage = models.DateTimeField(auto_now_add=True)
    signature = models.TextField()  # image PNG en base64 (ou upload vers S3/media)

    class Meta:
        ordering = ["-horodatage"]
        indexes = [
            models.Index(fields=["employee", "horodatage"]),
        ]

class JourSemaine(models.IntegerChoices):
    LUNDI = 0, "Lundi"
    MARDI = 1, "Mardi"
    MERCREDI = 2, "Mercredi"
    JEUDI = 3, "Jeudi"
    VENDREDI = 4, "Vendredi"
    SAMEDI = 5, "Samedi"
    DIMANCHE = 6, "Dimanche"

class EmployeeSchedule(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="schedules")
    jour = models.IntegerField(choices=JourSemaine.choices)
    matin_debut = models.TimeField(null=True, blank=True)
    matin_fin = models.TimeField(null=True, blank=True)
    aprem_debut = models.TimeField(null=True, blank=True)
    aprem_fin = models.TimeField(null=True, blank=True)

    class Meta:
        unique_together = ('employee', 'jour')
        ordering = ['jour']