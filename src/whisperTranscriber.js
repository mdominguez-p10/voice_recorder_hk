/**
 * Clase WhisperTranscriber - Módulo para transcribir audio utilizando Whisper.js
 */
class WhisperTranscriber {
    constructor() {
        this.worker = null;
        this.isLoading = false;
        this.isReady = false;
        this.onStatusChange = null;
        this.onProgress = null;
        this.transcribeResolve = null;
        this.transcribeReject = null;
    }

    /**
     * Inicializa el worker de Whisper
     * @param {Function} onStatusChange - Callback para cambios de estado
     * @param {Function} onProgress - Callback para el progreso de carga
     * @returns {Promise} - Promesa que se resuelve cuando el worker está listo
     */
    async initialize(onStatusChange = null, onProgress = null) {
        this.onStatusChange = onStatusChange;
        this.onProgress = onProgress;
        
        if (this.worker) {
            return Promise.resolve();
        }
        
        this._updateStatus('Preparando el transcriptor...');
        
        try {
            // Crear worker
            this.worker = new Worker('./src/whisper-worker.js', { type: 'module' });
            
            // Configurar listener de mensajes
            this.worker.onmessage = this._handleWorkerMessage.bind(this);
            
            this._updateStatus('Transcriptor listo');
            return Promise.resolve();
        } catch (error) {
            this._updateStatus(`Error al inicializar el transcriptor: ${error.message}`);
            return Promise.reject(error);
        }
    }

    /**
     * Transcribe un archivo de audio utilizando Whisper
     * @param {Blob} audioBlob - Blob de audio a transcribir
     * @param {number} timeoutMs - Tiempo máximo de espera en milisegundos
     * @returns {Promise<string>} - Promesa con el texto transcrito
     */
    async transcribeAudio(audioBlob, timeoutMs = 30000) {
        if (!this.worker) {
            await this.initialize();
        }

        this._updateStatus('Transcribiendo audio...');
        
        // Convertir el blob a ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // Crear promesa que se resolverá cuando la transcripción esté completa
        return new Promise((resolve, reject) => {
            this.transcribeResolve = resolve;
            this.transcribeReject = reject;
            
            // Configurar timeout
            const timeoutId = setTimeout(() => {
                this._updateStatus('Transcripción cancelada: tiempo de espera excedido (30 segundos)');
                
                // Enviar un mensaje de cancelación al worker
                if (this.worker) {
                    this.worker.postMessage({
                        action: 'cancel'
                    });
                }
                
                // Rechazar la promesa con un error de timeout
                if (this.transcribeReject) {
                    this.transcribeReject(new Error('Timeout: La transcripción tardó demasiado tiempo'));
                    this.transcribeResolve = null;
                    this.transcribeReject = null;
                }
                
                // Reiniciar el worker para futuros usos
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                    // Reiniciar el worker de forma asíncrona para no bloquear
                    setTimeout(() => {
                        this.initialize(this.onStatusChange, this.onProgress);
                    }, 0);
                }
            }, timeoutMs);
            
            // Guardar el ID del timeout para cancelarlo si la transcripción termina a tiempo
            this.currentTimeoutId = timeoutId;
            
            // Enviar el audio al worker
            this.worker.postMessage({
                action: 'transcribe',
                data: {
                    audio: arrayBuffer
                }
            }, [arrayBuffer]);
        });
    }

    /**
     * Maneja los mensajes recibidos del worker
     * @param {MessageEvent} event - Evento de mensaje
     * @private
     */
    _handleWorkerMessage(event) {
        const { status, result, error, progress } = event.data;
        
        switch (status) {
            case 'loading_model':
                this._updateStatus('Cargando modelo Whisper...');
                break;
                
            case 'model_progress':
                if (this.onProgress && progress) {
                    this.onProgress('Cargando modelo', progress);
                }
                break;
                
            case 'transcribing':
                this._updateStatus('Procesando audio...');
                break;
                
            case 'complete':
                this._updateStatus('Transcripción completada');
                // Limpiar el timeout si existe
                if (this.currentTimeoutId) {
                    clearTimeout(this.currentTimeoutId);
                    this.currentTimeoutId = null;
                }
                if (this.transcribeResolve) {
                    this.transcribeResolve(result);
                    this.transcribeResolve = null;
                    this.transcribeReject = null;
                }
                break;
                
            case 'error':
                this._updateStatus(`Error: ${error}`);
                // Limpiar el timeout si existe
                if (this.currentTimeoutId) {
                    clearTimeout(this.currentTimeoutId);
                    this.currentTimeoutId = null;
                }
                if (this.transcribeReject) {
                    this.transcribeReject(new Error(error));
                    this.transcribeResolve = null;
                    this.transcribeReject = null;
                }
                break;
                
            case 'cancelled':
                this._updateStatus('Transcripción cancelada');
                // No es necesario limpiar el timeout aquí, ya que la cancelación 
                // se hace desde el timeout mismo
                break;
        }
    }

    /**
     * Actualiza el estado de la transcripción
     * @param {string} status - Mensaje de estado
     * @private
     */
    _updateStatus(status) {
        console.log(status);
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }
}

// Exportar la clase como singleton
const whisperTranscriber = new WhisperTranscriber();
export default whisperTranscriber;
