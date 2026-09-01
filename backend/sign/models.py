from django.conf import settings
from django.db import models


class Profil(models.Model):
    """
    Profil applicatif associé à un utilisateur Django.

    ROLE_ADMIN : accès à toutes les crèches et à tous les émargements.
    ROLE_CRECHE : accès uniquement à la crèche associée.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrateur"
        CRECHE = "CRECHE", "Crèche"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profil",
    )

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
    )

    # Sera relié à Creche.
    # On le laisse nullable car un administrateur
    # n'appartient pas à une crèche particulière.
    creche = models.ForeignKey(
        "creches.Creche",
        on_delete=models.PROTECT,
        related_name="profils",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Profil"
        verbose_name_plural = "Profils"

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
