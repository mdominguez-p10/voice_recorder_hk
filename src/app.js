// Importamos el transcriptor de Whisper
import whisperTranscriber from './whisperTranscriber.js';

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const recordButton = document.getElementById('recordButton');
    const sendButton = document.getElementById('sendButton');
    const cancelButton = document.getElementById('cancelButton');
    const transcribeLocalButton = document.getElementById('transcribeLocalButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTime = document.getElementById('recordingTime');
    const audioPreview = document.getElementById('audioPreview');
    const statusMessage = document.getElementById('statusMessage');
    const chatContainer = document.getElementById('chatContainer');
    const testButton = document.getElementById('testButton');
    const modelStatus = document.getElementById('modelStatus');
    const modelProgress = document.getElementById('modelProgress');
    
    // Variable para almacenar la última grabación
    let lastRecording = null;

    // Inicializar el modelo Whisper
    initializeWhisper();
    
    // Evento para el botón de prueba
    testButton.addEventListener('click', () => {
        console.log('Botón de prueba de transcripción presionado');
        
        // Simular un mensaje del usuario
        addMessageToChat('Usuario', 'user', '(Mensaje de voz de prueba)');
        
        // Mostrar indicador de carga
        showTranscriptionLoading();
        
        // Simular una respuesta después de 2 segundos
        setTimeout(() => {
            // Eliminar el indicador de carga
            removeTranscriptionLoading();
            
            // Añadir una transcripción simulada
            const transcripcion = "Este es un mensaje de prueba que simula una transcripción. Si puedes ver este mensaje, la funcionalidad del chat está funcionando correctamente.";
            addMessageToChat('Asistente', 'system', transcripcion);
            
            document.body.classList.add('has-transcription');
            
            console.log('Transcripción de prueba añadida al chat');
        }, 2000);
    });
    
    // Verificar soporte para grabación de audio
    if (!VoiceRecorder.isSupported()) {
        recordingStatus.textContent = 'Tu navegador no soporta la grabación de audio.';
        recordButton.disabled = true;
        return;
    }

    // Configuración del grabador de voz
    const voiceRecorder = new VoiceRecorder({
        // Endpoint local para pruebas
        endpoint: 'http://localhost:3000/api/audio',
        maxRecordingTime: 120000, // 2 minutos máximo
        mimeType: 'audio/mpeg',
        fileFormat: 'mp3',
        
        // Callbacks
        onRecordStart: () => {
            recordButton.classList.add('recording');
            recordingStatus.textContent = 'Grabando...';
            recordButton.querySelector('.record-text').textContent = 'Detener';
            cancelButton.disabled = false;
        },
        
        onRecordStop: (data) => {
            recordButton.classList.remove('recording');
            recordingStatus.textContent = 'Grabación completada';
            recordButton.querySelector('.record-text').textContent = 'Grabar';
            
            // Guardar la grabación para transcripción local
            lastRecording = data.blob;
            
            // Mostrar el reproductor de audio
            audioPreview.innerHTML = '';
            const audioElement = voiceRecorder.createAudioElement();
            if (audioElement) {
                audioPreview.appendChild(audioElement);
            }
            
            // Habilitar los botones
            sendButton.disabled = false;
            cancelButton.disabled = false;
            transcribeLocalButton.disabled = false;
        },
        
        onRecordingTime: (ms, formattedTime) => {
            recordingTime.textContent = formattedTime;
        },
        
        onSendSuccess: (result) => {
            statusMessage.textContent = 'Grabación enviada con éxito';
            statusMessage.className = 'status-message success';
            
            console.log('Respuesta del servidor:', result);
            
            // Añadir mensaje del usuario al chat
            addMessageToChat('Usuario', 'user', '(Mensaje de voz)');
            
            // Mostrar indicador de carga mientras se procesa la transcripción
            showTranscriptionLoading();
            
            // Mostrar la transcripción cuando esté disponible
            if (result.transcription) {
                console.log('Transcripción recibida:', result.transcription);
                document.body.classList.add('has-transcription');
                
                // Simulamos un pequeño retraso para mostrar el efecto de "escribiendo..."
                setTimeout(() => {
                    console.log('Añadiendo transcripción al chat después del timeout');
                    // Eliminar el indicador de carga
                    removeTranscriptionLoading();
                    
                    // Añadir la transcripción al chat
                    addMessageToChat('Asistente', 'system', result.transcription);
                    
                    console.log('Transcripción añadida al chat');
                }, 1500);
            } else {
                console.error('No se recibió ninguna transcripción en la respuesta');
                removeTranscriptionLoading();
                addMessageToChat('Asistente', 'system', 'No se pudo transcribir el audio.');
            }
            
            // Resetear la interfaz de grabación (solo después de mostrar la transcripción)
            if (result.transcription) {
                setTimeout(() => {
                    resetInterface();
                }, 5000); // Esperar 5 segundos después de enviar
            } else {
                setTimeout(() => {
                    resetInterface();
                }, 3000);
            }
        },
        
        onSendError: (error) => {
            console.error('Error al enviar la grabación:', error);
            statusMessage.textContent = `Error al enviar: ${error.message}`;
            statusMessage.className = 'status-message error';
            
            // Limpiar cualquier indicador de carga
            removeTranscriptionLoading();
            
            // Añadir mensaje de error al chat
            addMessageToChat('Sistema', 'system', `Error: No se pudo procesar el audio. ${error.message}`);
        }
    });

    // Evento para el botón de grabar/detener
    recordButton.addEventListener('click', () => {
        if (voiceRecorder.isRecording) {
            voiceRecorder.stopRecording();
        } else {
            resetInterface();
            voiceRecorder.startRecording().catch(error => {
                statusMessage.textContent = `Error al iniciar: ${error.message}`;
                statusMessage.className = 'status-message error';
            });
        }
    });

    // Evento para el botón de enviar
    sendButton.addEventListener('click', () => {
        statusMessage.textContent = 'Enviando grabación...';
        statusMessage.className = 'status-message';
        
        // Añadir mensaje del usuario al chat antes de enviar
        addMessageToChat('Usuario', 'user', '(Mensaje de voz)');
        
        // Mostrar indicador de carga mientras se procesa
        showTranscriptionLoading();
        
        // Puedes añadir datos adicionales al envío
        const extraData = {
            timestamp: new Date().toISOString(),
            device: navigator.userAgent
        };
        
        voiceRecorder.sendRecording(extraData)
            .then(result => {
                console.log('Resultado del envío:', result);
                // La respuesta se maneja en el callback onSendSuccess
            })
            .catch(error => {
                console.error('Error capturado en promesa:', error);
                // El error ya se maneja en el callback onSendError
            });
    });

    // Evento para el botón de cancelar
    cancelButton.addEventListener('click', () => {
        voiceRecorder.cancelRecording();
        resetInterface();
    });

    // Evento para el botón de transcripción local
    transcribeLocalButton.addEventListener('click', async () => {
        if (!lastRecording) {
            statusMessage.textContent = 'No hay grabación para transcribir';
            statusMessage.className = 'status-message error';
            return;
        }

        try {
            statusMessage.textContent = 'Transcribiendo localmente...';
            statusMessage.className = 'status-message';
            
            // Añadir mensaje del usuario al chat
            addMessageToChat('Usuario', 'user', '(Mensaje de voz - Transcripción local)');
            
            // Mostrar indicador de carga
            showTranscriptionLoading();
            
            // Transcribir usando Whisper
            const transcription = await whisperTranscriber.transcribeAudio(lastRecording);
            
            // Mostrar la transcripción
            console.log('Transcripción local completada:', transcription);
            document.body.classList.add('has-transcription');
            
            // Eliminar el indicador de carga
            removeTranscriptionLoading();
            
            // Añadir la transcripción al chat
            addMessageToChat('Asistente (Whisper)', 'system', transcription);
            
            statusMessage.textContent = 'Transcripción local completada';
            statusMessage.className = 'status-message success';
            
        } catch (error) {
            console.error('Error en la transcripción local:', error);
            statusMessage.textContent = `Error en la transcripción local: ${error.message}`;
            statusMessage.className = 'status-message error';
            
            // Limpiar indicador de carga
            removeTranscriptionLoading();
            
            // Añadir mensaje de error al chat
            addMessageToChat('Sistema', 'system', `Error: No se pudo transcribir localmente. ${error.message}`);
        }
    });

    // Función para resetear la interfaz
    function resetInterface() {
        recordButton.classList.remove('recording');
        recordButton.querySelector('.record-text').textContent = 'Grabar';
        recordingStatus.textContent = 'Presiona el botón para grabar';
        recordingTime.textContent = '00:00';
        audioPreview.innerHTML = '';
        sendButton.disabled = true;
        cancelButton.disabled = true;
        transcribeLocalButton.disabled = true;
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
        // No eliminamos los mensajes del chat
        lastRecording = null;
    }
    
    /**
     * Añade un mensaje al chat
     * @param {string} sender - Nombre del remitente
     * @param {string} type - Tipo de mensaje ('user' o 'system')
     * @param {string} text - Texto del mensaje
     */
    function addMessageToChat(sender, type, text) {
        console.log(`Añadiendo mensaje al chat - Remitente: ${sender}, Tipo: ${type}, Texto: ${text}`);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message chat-message-${type}`;
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'chat-sender';
        senderSpan.textContent = sender;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'chat-bubble';
        bubbleDiv.textContent = text;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'chat-time';
        timeSpan.textContent = getFormattedTime();
        
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(timeSpan);
        
        chatContainer.appendChild(messageDiv);
        
        // Scroll al final del chat
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        console.log('Mensaje añadido al chat correctamente');
    }
    
    /**
     * Muestra un indicador de carga de transcripción
     */
    function showTranscriptionLoading() {
        console.log('Mostrando indicador de carga de transcripción');
        
        // Eliminar cualquier indicador de carga previo
        removeTranscriptionLoading();
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message chat-message-system';
        loadingDiv.id = 'transcription-loading';
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'chat-sender';
        senderSpan.textContent = 'Asistente';
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'chat-bubble chat-loading';
        
        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'chat-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'chat-dot';
            dotsDiv.appendChild(dot);
        }
        
        bubbleDiv.appendChild(dotsDiv);
        loadingDiv.appendChild(senderSpan);
        loadingDiv.appendChild(bubbleDiv);
        
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        console.log('Indicador de carga de transcripción añadido al chat');
    }
    
    /**
     * Elimina el indicador de carga de transcripción
     */
    function removeTranscriptionLoading() {
        console.log('Removiendo indicador de carga de transcripción');
        const loadingElement = document.getElementById('transcription-loading');
        if (loadingElement) {
            loadingElement.remove();
            console.log('Indicador de carga removido');
        } else {
            console.log('No se encontró ningún indicador de carga para remover');
        }
    }
    
    /**
     * Obtiene la hora actual formateada
     * @returns {string} - Hora formateada (HH:MM)
     */
    function getFormattedTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    /**
     * Inicializa el modelo Whisper
     */
    async function initializeWhisper() {
        modelStatus.textContent = 'Estado del modelo: Cargando...';
        
        try {
            await whisperTranscriber.initialize(
                (status) => {
                    modelStatus.textContent = `Estado del modelo: ${status}`;
                },
                (status, progress) => {
                    if (progress !== null) {
                        modelProgress.style.width = `${Math.round(progress * 100)}%`;
                    }
                }
            );
            
            modelStatus.textContent = 'Estado del modelo: Listo';
            modelProgress.style.width = '100%';
            
        } catch (error) {
            console.error('Error al inicializar Whisper:', error);
            modelStatus.textContent = `Estado del modelo: Error (${error.message})`;
            modelProgress.style.width = '0%';
        }
    }
});
