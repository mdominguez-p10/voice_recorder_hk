/**
 * worker.js - Worker para cargar Transformers.js
 * Este archivo permite la carga de Transformers.js en un Web Worker
 */

// Importar la biblioteca Transformers
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.2';

// Variable para controlar cancelación
let isCancelled = false;
let abortController = null;

// Manejar mensajes desde el hilo principal
self.addEventListener('message', async (event) => {
  const { action, data } = event.data;
  
  if (action === 'cancel') {
    // Manejar solicitud de cancelación
    isCancelled = true;
    if (abortController) {
      abortController.abort();
    }
    self.postMessage({ status: 'cancelled' });
    return;
  }
  
  if (action === 'transcribe') {
    try {
      // Resetear estado de cancelación
      isCancelled = false;
      abortController = new AbortController();
      const signal = abortController.signal;
      
      // Notificar que estamos cargando el modelo
      self.postMessage({ status: 'loading_model' });
      
      // Verificar si ya se canceló durante la carga
      if (isCancelled) {
        self.postMessage({ status: 'cancelled' });
        return;
      }
      
      // Cargar el modelo de ASR
      const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
        progress_callback: (progress) => {
          self.postMessage({ status: 'model_progress', progress });
          
          // Verificar cancelación durante la carga del modelo
          if (isCancelled) {
            throw new Error('Transcripción cancelada por timeout');
          }
        }
      });
      
      // Verificar si ya se canceló
      if (isCancelled) {
        self.postMessage({ status: 'cancelled' });
        return;
      }
      
      // Notificar que estamos transcribiendo
      self.postMessage({ status: 'transcribing' });
      
      // Realizar la transcripción
      const result = await pipe(data.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'spanish',
        task: 'transcribe',
        // Añadir la señal de cancelación a la configuración si es compatible
        signal: signal
      });
      
      // Verificar si se canceló durante la transcripción
      if (isCancelled) {
        self.postMessage({ status: 'cancelled' });
        return;
      }
      
      // Enviar el resultado de la transcripción
      self.postMessage({ 
        status: 'complete', 
        result: result.text 
      });
      
    } catch (error) {
      // Si fue cancelado, enviar estado cancelado
      if (isCancelled || error.name === 'AbortError') {
        self.postMessage({ status: 'cancelled' });
      } else {
        // Enviar el error
        self.postMessage({ 
          status: 'error', 
          error: error.message 
        });
      }
    } finally {
      // Limpiar recursos
      abortController = null;
    }
  }
});
