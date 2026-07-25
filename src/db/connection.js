const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf_summarizer_saas';
    await mongoose.connect(connStr);
    console.log('✅ Conexión exitosa a MongoDB Atlas / Local');
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error.message);
    console.error('Por favor, asegúrate de tener una base de datos MongoDB ejecutándose localmente o configura MONGODB_URI en un archivo .env');
    process.exit(1);
  }
};

module.exports = connectDB;
