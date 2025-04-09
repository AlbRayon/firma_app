// Elementos DOM
const pdfContainer = document.querySelector('.pdf-container');
const firmaCanvas = document.getElementById('firmaCanvas');
const signatureCanvas = document.getElementById('signatureCanvas');
const signatureModal = document.getElementById('signatureModal');
const openSignatureModalBtn = document.getElementById('openSignatureModal');
const clearSignatureBtn = document.getElementById('clearSignature');
const acceptSignatureBtn = document.getElementById('acceptSignature');
const cancelSignatureBtn = document.getElementById('cancelSignature');

// Contextos de canvas
const firmaCtx = firmaCanvas.getContext('2d');
const signatureCtx = signatureCanvas.getContext('2d');

// Variables para manejo de la firma
let firmaDibujada = false;
let dibujando = false;
let moviendo = false;
let offsetX = 0;
let offsetY = 0;
let trazos = [];

// Configurar canvas de firma para transparencia
firmaCanvas.style.backgroundColor = 'transparent';
firmaCtx.fillStyle = 'rgba(0,0,0,0)';

// ----- FUNCIONES DEL MODAL DE FIRMA -----

// Abrir modal de firma
openSignatureModalBtn.addEventListener('click', () => {
    signatureModal.style.display = 'block';
    dibujarBordeGuia(signatureCtx, signatureCanvas.width, signatureCanvas.height);
});

// Cerrar modal con botón cancelar
cancelSignatureBtn.addEventListener('click', () => {
    signatureModal.style.display = 'none';
});

// Limpiar canvas de firma en el modal
clearSignatureBtn.addEventListener('click', () => {
    signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    dibujarBordeGuia(signatureCtx, signatureCanvas.width, signatureCanvas.height);
    trazos = [];
});

// Aceptar la firma y pasarla al canvas principal
acceptSignatureBtn.addEventListener('click', () => {
    if (trazos.length > 0) {
        // Crear imagen temporal sin bordes
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = signatureCanvas.width;
        tempCanvas.height = signatureCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Dibujar solo los trazos (sin bordes)
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        dibujarTrazos(tempCtx, trazos);
        
        // Obtener los límites reales de la firma
        const firmaBounds = obtenerLimitesFirma(tempCanvas);
        
        // Ajustar tamaño del canvas de firma según contenido
        firmaCanvas.width = firmaBounds.width + 20; // Añadir margen
        firmaCanvas.height = firmaBounds.height + 20; // Añadir margen
        
        // Limpiar canvas de firma
        firmaCtx.clearRect(0, 0, firmaCanvas.width, firmaCanvas.height);
        
        // Dibujar la firma recortada en el canvas principal
        firmaCtx.drawImage(
            tempCanvas, 
            firmaBounds.left, firmaBounds.top, 
            firmaBounds.width, firmaBounds.height,
            10, 10, // Posición con margen
            firmaBounds.width, firmaBounds.height
        );
        
        // Mostrar el canvas de firma y cerrar modal
        firmaCanvas.style.display = 'block';
        signatureModal.style.display = 'none';
        firmaDibujada = true;
        
        // Colocar la firma en una posición inicial sobre el PDF
        const pdfImg = document.getElementById('pdfImage');
        firmaCanvas.style.left = ((pdfImg.width - firmaCanvas.width) / 2) + 'px';
        firmaCanvas.style.top = ((pdfImg.height - firmaCanvas.height) / 2) + 'px';
    } else {
        alert('Por favor dibuja una firma antes de continuar');
    }
});

// ----- FUNCIONES DE DIBUJO DE FIRMA EN MODAL -----

// Eventos para dibujar en el canvas del modal
signatureCanvas.addEventListener('mousedown', iniciarTrazo);
signatureCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
});

signatureCanvas.addEventListener('mousemove', dibujarTrazo);
signatureCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
});

signatureCanvas.addEventListener('mouseup', finalizarTrazo);
signatureCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup');
    signatureCanvas.dispatchEvent(mouseEvent);
});

function iniciarTrazo(e) {
    const rect = signatureCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    dibujando = true;
    trazos.push({
        type: 'begin',
        x: x,
        y: y
    });
    
    signatureCtx.beginPath();
    signatureCtx.moveTo(x, y);
}

function dibujarTrazo(e) {
    if (!dibujando) return;
    
    const rect = signatureCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    trazos.push({
        type: 'point',
        x: x,
        y: y
    });
    
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.strokeStyle = 'black';
    signatureCtx.lineTo(x, y);
    signatureCtx.stroke();
    signatureCtx.beginPath();
    signatureCtx.moveTo(x, y);
}

function finalizarTrazo() {
    dibujando = false;
    signatureCtx.beginPath();
}

// ----- FUNCIONES PARA MOVER LA FIRMA SOBRE EL PDF -----

// Eventos para mover la firma sobre el PDF
firmaCanvas.addEventListener('mousedown', iniciarMovimiento);
firmaCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    firmaCanvas.dispatchEvent(mouseEvent);
});

document.addEventListener('mousemove', moverFirma);
document.addEventListener('touchmove', (e) => {
    if (moviendo) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        document.dispatchEvent(mouseEvent);
    }
});

document.addEventListener('mouseup', finalizarMovimiento);
document.addEventListener('touchend', (e) => {
    if (moviendo) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup');
        document.dispatchEvent(mouseEvent);
    }
});

function iniciarMovimiento(e) {
    if (!firmaDibujada) return;
    
    const rect = firmaCanvas.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    moviendo = true;
}

function moverFirma(e) {
    if (!moviendo) return;
    
    const pdfRect = document.getElementById('pdfImage').getBoundingClientRect();
    const canvasRect = firmaCanvas.getBoundingClientRect();
    
    // Calcular nueva posición
    let newLeft = e.clientX - pdfRect.left - offsetX;
    let newTop = e.clientY - pdfRect.top - offsetY;
    
    // Restricciones para mantener la firma dentro del PDF
    newLeft = Math.max(0, Math.min(pdfRect.width - canvasRect.width, newLeft));
    newTop = Math.max(0, Math.min(pdfRect.height - canvasRect.height, newTop));
    
    firmaCanvas.style.left = newLeft + 'px';
    firmaCanvas.style.top = newTop + 'px';
}

function finalizarMovimiento() {
    moviendo = false;
}

// ----- FUNCIONES AUXILIARES -----

// Dibujar borde guía
function dibujarBordeGuia(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    const margen = 20;
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]); // Línea punteada
    ctx.strokeRect(margen, margen, width - (margen * 2), height - (margen * 2));
    ctx.setLineDash([]); // Restaurar línea sólida
    
    // Línea base para guiar la firma
    ctx.beginPath();
    ctx.moveTo(margen, height - margen);
    ctx.lineTo(width - margen, height - margen);
    ctx.stroke();
}

// Dibujar trazos guardados
function dibujarTrazos(ctx, trazosArray) {
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
    
    let isBegin = true;
    for (let trazo of trazosArray) {
        if (trazo.type === 'begin' || isBegin) {
            ctx.beginPath();
            ctx.moveTo(trazo.x, trazo.y);
            isBegin = false;
        } else {
            ctx.lineTo(trazo.x, trazo.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(trazo.x, trazo.y);
        }
    }
}

// Obtener los límites reales de la firma (recortar espacio vacío)
function obtenerLimitesFirma(canvas) {
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    
    // Buscar los límites del contenido
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = data[((y * canvas.width + x) * 4) + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    // Si no hay firma, devolver valores predeterminados
    if (minX > maxX || minY > maxY) {
        return { left: 0, top: 0, width: canvas.width, height: canvas.height };
    }
    
    // Añadir un pequeño margen
    minX = Math.max(0, minX - 5);
    minY = Math.max(0, minY - 5);
    maxX = Math.min(canvas.width, maxX + 5);
    maxY = Math.min(canvas.height, maxY + 5);
    
    return {
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// Limpiar firma (función accesible desde el HTML)
function limpiarFirma() {
    firmaCanvas.style.display = 'none';
    firmaDibujada = false;
    trazos = [];
}

// Preparar la firma para enviar (función accesible desde el HTML)
function prepararFirma() {
    if (!firmaDibujada) {
        alert('Por favor genera una firma antes de continuar');
        return false;
    }
    
    // Generar imagen en base64 de la firma
    const dataURL = firmaCanvas.toDataURL('image/png');
    document.getElementById('firmaInput').value = dataURL;
    
    // Obtener la posición relativa al PDF
    const imgRect = document.getElementById('pdfImage').getBoundingClientRect();
    const canvasRect = firmaCanvas.getBoundingClientRect();
    
    const relX = canvasRect.left - imgRect.left;
    const relY = imgRect.height - (canvasRect.top - imgRect.top + canvasRect.height);
    
    document.getElementById('xInput').value = Math.round(relX);
    document.getElementById('yInput').value = Math.round(relY);
    
    return true;
}