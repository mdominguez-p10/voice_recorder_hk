const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Crear la aplicación Express
const app = express();
const port = 3000;

// Configurar CORS
app.use(cors());

// Servir archivos estáticos desde el directorio actual
app.use(express.static(__dirname));

// Crear directorio para almacenar las grabaciones
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
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
    
    // Simular una pequeña demora para demostrar el estado de carga
    setTimeout(() => {
      // Devolver una respuesta exitosa
      res.json({
        success: true,
        message: 'Audio recibido correctamente',
        fileId: req.file.filename,
        url: `http://localhost:${port}/uploads/${req.file.filename}`,
        metadata: {
          size: req.file.size,
          mimetype: req.file.mimetype,
          originalName: req.file.originalname,
          timestamp: new Date().toISOString()
        }
      });
    }, 1000);
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
