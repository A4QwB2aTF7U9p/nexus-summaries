const { Sequelize } = require('sequelize');

// Configuración de PostgreSQL usando variable de entorno DATABASE_URL (formato: postgres://user:pass@host:port/dbname)
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/pdf_summarizer_saas', {
  dialect: 'postgres',
  logging: false, // Cambiar a true para depurar queries
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // Sincroniza modelos con la BD
    console.log('✅ Conexión exitosa a PostgreSQL');
  } catch (error) {
    console.error('❌ ERROR DETALLADO DE CONEXIÓN A POSTGRESQL:');
    console.error('Message:', error.message);
    console.error('Connection URL in use:', process.env.DATABASE_URL || 'DEFAULT_LOCAL');
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
