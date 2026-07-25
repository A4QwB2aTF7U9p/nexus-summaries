const { Sequelize } = require('sequelize');

const dbUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false,
});

const connectDB = async () => {
  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_URL no está definida en las variables de entorno.');
    process.exit(1);
  }
  
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('✅ Conexión exitosa a PostgreSQL');
  } catch (error) {
    console.error('❌ ERROR DETALLADO DE CONEXIÓN A POSTGRESQL:');
    console.error('Message:', error.message);
    console.error('Connection URL in use:', dbUrl);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
