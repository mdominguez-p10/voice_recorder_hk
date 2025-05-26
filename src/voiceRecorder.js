/**
 * Clase VoiceRecorder - Módulo para grabar audio y enviarlo a un endpoint
 */
class VoiceRecorder {
    constructor(config = {}) {
        // Verificar el formato de audio soportado
        const preferredMimeType = config.mimeType || 'audio/mpeg';
        const preferredFormat = config.fileFormat || 'mp3';
        
        // Detectar el formato soportado por el navegador
        const supportedFormat = this.getSupportedAudioFormat(preferredMimeType, preferredFormat);
        
        // Configuración por defecto
        this.config = {
            endpoint: config.endpoint || '/api/audio',
            maxRecordingTime: config.maxRecordingTime || 60000, // 60 segundos por defecto
            mimeType: supportedFormat.mimeType,
            fileFormat: supportedFormat.fileFormat,
            onRecordStart: config.onRecordStart || (() => {}),
            onRecordStop: config.onRecordStop || (() => {}),
            onRecordingTime: config.onRecordingTime || (() => {}),
            onSendSuccess: config.onSendSuccess || (() => {}),
            onSendError: config.onSendError || (() => {})
        };

        // Variables de estado
        this.isRecording = false;
        this.isPaused = false;
        this.audioChunks = [];
        this.mediaRecorder = null;
        this.audioBlob = null;
        this.audioUrl = null;
        this.recordingTimer = null;
        this.recordingTime = 0;
        this.stream = null;
    }

    /**
     * Iniciar la grabación de audio
     * @returns {Promise} Promesa que se resuelve cuando comienza la grabación
     */
    async startRecording() {
        if (this.isRecording) return;

        try {
            // Solicitar permiso para acceder al micrófono
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Crear el MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: this.config.mimeType
            });
            
            // Resetear variables
            this.audioChunks = [];
            this.recordingTime = 0;
            
            // Configurar eventos del MediaRecorder
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                // Crear blob de audio
                this.audioBlob = new Blob(this.audioChunks, { type: this.config.mimeType });
                this.audioUrl = URL.createObjectURL(this.audioBlob);
                
                // Liberar recursos del micrófono
                this.stopMicrophone();
                
                // Llamar al callback onRecordStop
                this.config.onRecordStop({
                    blob: this.audioBlob,
                    url: this.audioUrl,
                    duration: this.recordingTime
                });
            };
            
            // Iniciar grabación
            this.mediaRecorder.start(10); // Capturar datos cada 10ms
            this.isRecording = true;
            
            // Iniciar temporizador
            this.startTimer();
            
            // Llamar al callback onRecordStart
            this.config.onRecordStart();
            
            // Configurar finalización automática después del tiempo máximo
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, this.config.maxRecordingTime);
            
            return true;
        } catch (error) {
            console.error('Error al iniciar la grabación:', error);
            return false;
        }
    }
    
    /**
     * Detener la grabación de audio
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.clearTimer();
    }
    
    /**
     * Pausar la grabación
     */
    pauseRecording() {
        if (!this.isRecording || this.isPaused || !this.mediaRecorder) return;
        
        this.mediaRecorder.pause();
        this.isPaused = true;
        this.clearTimer();
    }
    
    /**
     * Reanudar la grabación
     */
    resumeRecording() {
        if (!this.isRecording || !this.isPaused || !this.mediaRecorder) return;
        
        this.mediaRecorder.resume();
        this.isPaused = false;
        this.startTimer();
    }
    
    /**
     * Cancelar la grabación
     */
    cancelRecording() {
        if (!this.isRecording && !this.audioBlob) return;
        
        if (this.isRecording) {
            this.stopRecording();
        }
        
        this.audioChunks = [];
        this.audioBlob = null;
        
        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
            this.audioUrl = null;
        }
        
        this.stopMicrophone();
        this.clearTimer();
        this.recordingTime = 0;
    }
    
    /**
     * Enviar la grabación al endpoint configurado
     * @param {Object} extraData - Datos adicionales para enviar junto con el audio
     * @returns {Promise} - Promesa con la respuesta del servidor
     */
    async sendRecording(extraData = {}) {
        if (!this.audioBlob) {
            throw new Error('No hay grabación para enviar');
        }
        
        try {
            // Crear FormData para enviar el archivo
            const formData = new FormData();
            const fileName = `recording_${Date.now()}.${this.config.fileFormat}`;
            
            // Agregar el archivo de audio
            formData.append('audio', this.audioBlob, fileName);
            
            // Agregar datos extra si se proporcionan
            if (extraData && typeof extraData === 'object') {
                for (const key in extraData) {
                    formData.append(key, extraData[key]);
                }
            }
            
            // Enviar la solicitud
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Error al enviar: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Llamar al callback de éxito
            this.config.onSendSuccess(result);
            
            return result;
        } catch (error) {
            console.error('Error al enviar la grabación:', error);
            
            // Llamar al callback de error
            this.config.onSendError(error);
            
            throw error;
        }
    }
    
    /**
     * Crear un elemento de audio para reproducir la grabación
     * @returns {HTMLElement|null} - Elemento de audio o null si no hay grabación
     */
    createAudioElement() {
        if (!this.audioUrl) return null;
        
        const audio = document.createElement('audio');
        audio.src = this.audioUrl;
        audio.controls = true;
        return audio;
    }
    
    /**
     * Obtener la duración actual de la grabación en formato mm:ss
     * @returns {string} - Tiempo formateado
     */
    getFormattedTime() {
        const minutes = Math.floor(this.recordingTime / 60000);
        const seconds = Math.floor((this.recordingTime % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Verificar si el navegador soporta la grabación de audio
     * @returns {boolean} - true si es soportado, false si no
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    
    /**
     * Iniciar el temporizador de grabación
     * @private
     */
    startTimer() {
        this.clearTimer();
        
        const startTime = Date.now() - this.recordingTime;
        this.recordingTimer = setInterval(() => {
            this.recordingTime = Date.now() - startTime;
            this.config.onRecordingTime(this.recordingTime, this.getFormattedTime());
        }, 100);
    }
    
    /**
     * Detener el temporizador
     * @private
     */
    clearTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }
    
    /**
     * Detener y liberar el micrófono
     * @private
     */
    stopMicrophone() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    /**
     * Detecta el formato de audio soportado por el navegador
     * @param {string} preferredMimeType - Tipo MIME preferido
     * @param {string} preferredFormat - Formato preferido
     * @returns {Object} - Formato soportado {mimeType, fileFormat}
     * @private
     */
    getSupportedAudioFormat(preferredMimeType, preferredFormat) {
        // Formatos a comprobar en orden de preferencia
        const formats = [
            { mimeType: 'audio/mpeg', fileFormat: 'mp3' },
            { mimeType: 'audio/mp4', fileFormat: 'mp4' },
            { mimeType: 'audio/webm', fileFormat: 'webm' },
            { mimeType: 'audio/ogg', fileFormat: 'ogg' }
        ];
        
        // Si MediaRecorder no está disponible, devolver el formato preferido
        if (typeof MediaRecorder === 'undefined') {
            console.warn('MediaRecorder no está disponible. Usando formato preferido sin verificación.');
            return { mimeType: preferredMimeType, fileFormat: preferredFormat };
        }
        
        // Verificar primero el formato preferido
        if (MediaRecorder.isTypeSupported(preferredMimeType)) {
            return { mimeType: preferredMimeType, fileFormat: preferredFormat };
        }
        
        // Si el formato preferido no es soportado, probar con los demás
        for (const format of formats) {
            if (MediaRecorder.isTypeSupported(format.mimeType)) {
                console.log(`El formato preferido ${preferredMimeType} no es soportado. Usando ${format.mimeType} en su lugar.`);
                return format;
            }
        }
        
        // Si ningún formato específico es soportado, usar el predeterminado del navegador
        console.warn('Ningún formato específico es soportado. Usando el formato predeterminado del navegador.');
        return { mimeType: '', fileFormat: 'webm' };
    }
}

// Exportar la clase si estamos en un entorno con módulos
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = VoiceRecorder;
}
