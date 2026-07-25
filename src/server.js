require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./db/connection');

// Inicializar la aplicación Express
const app = express();

// Conectar con la Base de Datos (MongoDB)
connectDB();

// 1. Parser JSON Global con Verificación para capturar req.rawBody necesario en Webhooks de Stripe
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/stripe/webhook')) {
      req.rawBody = buf;
    }
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir Archivos Estáticos del Frontend
app.use(express.static(path.join(__dirname, '../public')));

// 2. Rutas del Sistema (Endpoints API)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/app', require('./routes/app'));

// Redirigir cualquier otra ruta no encontrada a la landing page index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Middleware Global para el control de errores
app.use((err, req, res, next) => {
  console.error('🔥 Error no controlado:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Ocurrió un error interno en el servidor. Inténtalo más tarde.',
  });
});

// Arrancar el Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 SERVIDOR SAAS INICIADO EN EL PUERTO: ${PORT}`);
  console.log(`👉 URL Local: http://localhost:${PORT}`);
  console.log(`🔒 Modo sin anuncios y monetización Stripe lista`);
  console.log(`===================================================`);
});
