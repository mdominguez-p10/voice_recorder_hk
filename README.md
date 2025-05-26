# Módulo de Grabación de Voz

Este proyecto contiene un módulo para capturar audio desde el micrófono mediante un botón y enviarlo a un endpoint mediante una solicitud POST.

## Características

- Grabación de audio mediante el micrófono del dispositivo
- Interfaz visual con temporizador y estados de grabación
- Reproducción de la grabación antes de enviarla
- Envío de la grabación a un endpoint personalizable
- Soporte para cancelar y reiniciar grabaciones
- Límite de tiempo de grabación configurable
- Soporte para grabación en formato MP3 (con fallback automático a otros formatos si no es compatible)
- Callbacks para manejar eventos durante el proceso

## Requisitos

- Navegador moderno con soporte para MediaRecorder API
- Conexión a internet para enviar la grabación al endpoint

## Uso

1. Abre el archivo `index.html` en un navegador moderno
2. Haz clic en el botón de grabación para iniciar la captura de audio
3. Haz clic nuevamente para detener la grabación
4. Escucha la vista previa de la grabación
5. Haz clic en "Enviar Grabación" para enviar el audio al endpoint
6. O haz clic en "Cancelar" para descartar la grabación

## Configuración del Endpoint

Para configurar el endpoint donde se enviará la grabación, modifica la siguiente línea en el archivo `src/app.js`:

```javascript
endpoint: 'https://tu-api.com/api/audio',
```

Reemplaza la URL con la dirección de tu endpoint.

## Personalización

Puedes personalizar diversos aspectos del módulo modificando las opciones en el objeto de configuración en `src/app.js`. Algunas opciones disponibles son:

- `maxRecordingTime`: Tiempo máximo de grabación en milisegundos
- `mimeType`: Formato de audio a utilizar
- `fileFormat`: Extensión del archivo generado
- Varios callbacks para manejar eventos durante el proceso

## Integración en otros proyectos

Para usar este módulo en tu propio proyecto:

1. Copia los archivos `src/voiceRecorder.js` y `css/styles.css` a tu proyecto
2. Incluye los archivos en tu HTML:

```html
<link rel="stylesheet" href="ruta/a/styles.css">
<script src="ruta/a/voiceRecorder.js"></script>
```

3. Crea una instancia del grabador con tu configuración personalizada:

```javascript
const voiceRecorder = new VoiceRecorder({
    endpoint: 'https://tu-api.com/api/audio',
    mimeType: 'audio/mpeg',  // Para formato MP3
    fileFormat: 'mp3',       // Extensión del archivo
    // Otras opciones de configuración...
});
```

4. Utiliza los métodos del módulo para controlar la grabación:

```javascript
// Iniciar grabación
voiceRecorder.startRecording();

// Detener grabación
voiceRecorder.stopRecording();

// Enviar grabación
voiceRecorder.sendRecording();

// Cancelar grabación
voiceRecorder.cancelRecording();
```

## Ejemplo de formato de respuesta del servidor

El servidor debería responder con un objeto JSON. Por ejemplo:

```json
{
  "success": true,
  "message": "Audio recibido correctamente",
  "fileId": "abc123",
  "url": "https://tu-api.com/audios/abc123.webm"
}
```

## Licencia

Este proyecto está disponible como software de código abierto.
