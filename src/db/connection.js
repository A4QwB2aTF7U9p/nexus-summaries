const { Sequelize } = require('sequelize');

const dbUrl = process.env.DATABASE_URL;

console.log('DEBUG: DATABASE_URL value is:', dbUrl);

let sequelize;
if (dbUrl && typeof dbUrl === 'string') {
  sequelize = new Sequelize(dbUrl, {
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
} else {
  console.error('❌ ERROR CRÍTICO: DATABASE_URL no es una cadena válida.');
  console.error('Valor recibido:', dbUrl);
  process.exit(1);
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('✅ Conexión exitosa a PostgreSQL');
  } catch (error) {
    console.error('❌ ERROR DETALLADO DE CONEXIÓN A POSTGRESQL:');
    console.error('Message:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
