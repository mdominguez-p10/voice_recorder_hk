const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Crear la aplicación Express
const app = express();
const port = 3000;

// Configurar CORS
app.use(cors({
  origin: '*', // Permitir cualquier origen
  methods: ['GET', 'POST'], // Métodos permitidos
  allowedHeaders: ['Content-Type'] // Headers permitidos
}));

// Servir archivos estáticos desde el directorio actual
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    // Configurar el Content-Type para los archivos JS como módulos ES
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    }
  }
}));

// Crear directorio para almacenar las grabaciones
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/**
 * Función para generar una transcripción simulada basada en el tamaño del archivo
 * @param {number} fileSize - Tamaño del archivo en bytes
 * @returns {string} - Texto simulado de la transcripción
 */
function generateSimulatedTranscription(fileSize) {
  // Simulamos que el tamaño del archivo determina la longitud de la transcripción
  const possibleResponses = [
    "Hola, necesito ayuda con mi reserva de vuelo para mañana.",
    "Me gustaría solicitar información sobre los servicios que ofrecen.",
    "Buenos días, quisiera saber el horario de atención al público.",
    "Estoy interesado en el producto que anunciaron recientemente en su página web.",
    "Tengo un problema con mi cuenta, no puedo acceder desde ayer.",
    "Gracias por la atención recibida, el servicio fue excelente.",
    "Necesito cambiar la dirección de envío de mi pedido reciente.",
    "Quisiera saber si tienen disponibilidad para una reunión la próxima semana.",
    "He intentado resolver el problema siguiendo las instrucciones, pero sigo teniendo errores.",
    "Me gustaría recibir más información sobre las opciones de pago disponibles."
  ];
  
  // Seleccionar una respuesta basada en el tamaño del archivo (para simular variabilidad)
  const index = Math.floor((fileSize % 1000) / 100);
  const baseResponse = possibleResponses[index % possibleResponses.length];
  
  // Si el archivo es grande, añadimos más texto para simular una transcripción más larga
  if (fileSize > 500000) {
    return `${baseResponse} Además, me gustaría añadir que estoy muy interesado en conocer todas las características y beneficios que ofrecen. Si pudieran proporcionarme documentación adicional, lo agradecería mucho.`;
  } else if (fileSize > 200000) {
    return `${baseResponse} También quería preguntar sobre los plazos de entrega.`;
  } else {
    return baseResponse;
  }
}

// Configurar multer para manejar la carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `audio_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB máximo
  }
});

// Endpoint para recibir el audio
app.post('/api/audio', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No se recibió ningún archivo de audio' 
      });
    }
    
    console.log('Archivo recibido:', req.file);
    console.log('Datos adicionales:', req.body);
    
    // Simular una pequeña demora para demostrar el proceso de transcripción
    setTimeout(() => {
      // Generar una transcripción simulada basada en la duración del archivo
      const fileSize = req.file.size;
      const transcription = generateSimulatedTranscription(fileSize);
      
      console.log('Transcripción generada:', transcription);
      
      // Devolver una respuesta exitosa con la transcripción
      res.json({
        success: true,
        message: 'Audio recibido y transcrito correctamente',
        fileId: req.file.filename,
        url: `http://localhost:${port}/uploads/${req.file.filename}`,
        transcription: transcription,
        metadata: {
          size: req.file.size,
          mimetype: req.file.mimetype,
          originalName: req.file.originalname,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('Respuesta enviada al cliente');
    }, 2000);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
  console.log(`Endpoint para audio: http://localhost:${port}/api/audio`);
});
