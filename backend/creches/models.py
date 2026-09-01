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
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["nom", "prenom"]


class Emargement(models.Model):
    class TypeEvent(models.TextChoices):
        ARRIVEE = "ARRIVEE", "Arrivée"
        DEPART = "DEPART", "Départ"
        PAUSE_DEBUT = "PAUSE_DEBUT", "Début de pause"
        PAUSE_FIN = "PAUSE_FIN", "Fin de pause"

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