document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const recordButton = document.getElementById('recordButton');
    const sendButton = document.getElementById('sendButton');
    const cancelButton = document.getElementById('cancelButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTime = document.getElementById('recordingTime');
    const audioPreview = document.getElementById('audioPreview');
    const statusMessage = document.getElementById('statusMessage');

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
            
            // Mostrar el reproductor de audio
            audioPreview.innerHTML = '';
            const audioElement = voiceRecorder.createAudioElement();
            if (audioElement) {
                audioPreview.appendChild(audioElement);
            }
            
            // Habilitar el botón de enviar
            sendButton.disabled = false;
            cancelButton.disabled = false;
        },
        
        onRecordingTime: (ms, formattedTime) => {
            recordingTime.textContent = formattedTime;
        },
        
        onSendSuccess: (result) => {
            statusMessage.textContent = 'Grabación enviada con éxito';
            statusMessage.className = 'status-message success';
            
            // Resetear la interfaz
            setTimeout(() => {
                resetInterface();
            }, 3000);
        },
        
        onSendError: (error) => {
            statusMessage.textContent = `Error al enviar: ${error.message}`;
            statusMessage.className = 'status-message error';
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
        
        // Puedes añadir datos adicionales al envío
        const extraData = {
            timestamp: new Date().toISOString(),
            device: navigator.userAgent
        };
        
        voiceRecorder.sendRecording(extraData).catch(error => {
            // El error ya se maneja en el callback onSendError
        });
    });

    // Evento para el botón de cancelar
    cancelButton.addEventListener('click', () => {
        voiceRecorder.cancelRecording();
        resetInterface();
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
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }
});
