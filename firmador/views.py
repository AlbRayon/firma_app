import base64
from django.shortcuts import render, get_object_or_404, redirect
from .models import PDFDocument
from .forms import PDFUploadForm
from django.http import HttpResponse
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
from PIL import Image
from pdf2image import convert_from_path
import os
from django.conf import settings

def subir_pdf(request):
    if request.method == 'POST':
        form = PDFUploadForm(request.POST, request.FILES)
        if form.is_valid():
            pdf = form.save()
            return redirect('firmar_pdf', uuid=pdf.uuid)
    else:
        form = PDFUploadForm()
    return render(request, 'firmador/subir_pdf.html', {'form': form})


def firmar_pdf(request, uuid):
    pdf = get_object_or_404(PDFDocument, uuid=uuid)

    # Convertimos la primera página del PDF a imagen
    imagenes = convert_from_path(pdf.archivo.path, first_page=1, last_page=1)
    ruta_imagen = os.path.join(settings.MEDIA_ROOT, f'preview_{pdf.pk}.png')
    imagenes[0].save(ruta_imagen, 'PNG')

    return render(request, 'firmador/firmar_pdf.html', {
        'pdf': pdf,
        'imagen_preview': f'/media/preview_{pdf.pk}.png'
    })


import os
from tempfile import NamedTemporaryFile
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from PIL import Image
from io import BytesIO
import base64
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

def guardar_firma(request, uuid):
    # Obtener el documento PDF
    pdf = get_object_or_404(PDFDocument, uuid=uuid)
    
    # Recibir datos de la firma
    firma_data_url = request.POST['firma']
    x = int(request.POST['x'])
    y = int(request.POST['y'])

    # Extraer la parte de la imagen base64
    header, encoded = firma_data_url.split(",", 1)
    firma_image_data = base64.b64decode(encoded)
    firma_image = Image.open(BytesIO(firma_image_data))

    # Mantener la transparencia si existe
    # No convertir a fondo blanco como antes
    if firma_image.mode != 'RGBA':
        # Si no tiene canal alfa, convertir a RGBA para tener transparencia
        firma_image = firma_image.convert('RGBA')

    # Crear un archivo temporal para la firma (PNG para mantener transparencia)
    firma_temp = NamedTemporaryFile(delete=False, suffix='.png')
    firma_image.save(firma_temp, format='PNG')
    firma_temp.close()  # Cerramos el archivo temporal

    # Crear el PDF de la firma
    firma_pdf = BytesIO()
    c = canvas.Canvas(firma_pdf)
    
    # Ya no dibujamos el rectángulo negro aquí
    
    # Dibujar solo la imagen de la firma
    c.drawImage(firma_temp.name, x, y, width=firma_image.width, height=firma_image.height, mask='auto')
    # El parámetro mask='auto' es crucial para mantener la transparencia
    c.showPage()
    c.save()

    firma_pdf.seek(0)
    
    # Crear un archivo temporal para la firma en formato PDF
    with NamedTemporaryFile(delete=False, suffix='.pdf') as temp_firma_file:
        temp_firma_file.write(firma_pdf.read())
        temp_firma_file.close()
        
        # Leer el PDF original
        pdf_reader = PdfReader(pdf.archivo.path)
        pdf_writer = PdfWriter()
        
        # Extraer la primera página
        page = pdf_reader.pages[0]
        
        # Fusionar la firma al PDF original
        firma_pdf_reader = PdfReader(temp_firma_file.name)
        firma_page = firma_pdf_reader.pages[0]
        
        page.merge_page(firma_page)
        
        # Agregar la página firmada al PDF
        pdf_writer.add_page(page)
        
        # Crear el archivo PDF firmado
        signed_pdf = BytesIO()
        pdf_writer.write(signed_pdf)
        signed_pdf.seek(0)

        # Eliminar el archivo temporal de la firma
        os.remove(firma_temp.name)
        os.remove(temp_firma_file.name)

        # Devolver el archivo PDF firmado como respuesta
        response = HttpResponse(signed_pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="signed_document.pdf"'
        return response




