import uuid
from django.db import models

class PDFDocument(models.Model):
    archivo = models.FileField(upload_to='pdfs/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    # Añadir primero sin restricción unique
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, null=True)

    def __str__(self):
        return self.archivo.name

