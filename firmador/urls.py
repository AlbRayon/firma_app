from django.urls import path
from . import views

urlpatterns = [
    path('', views.subir_pdf, name='subir_pdf'),
    path('firmar/<uuid:uuid>/', views.firmar_pdf, name='firmar_pdf'),
    path('guardar_firma/<uuid:uuid>/', views.guardar_firma, name='guardar_firma'),
]
