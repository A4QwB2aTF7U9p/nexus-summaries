const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor, ingresa un correo electrónico válido',
    ],
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
  },
  // Datos de Facturación de Stripe
  stripeCustomerId: {
    type: String,
    default: null,
  },
  stripeSubscriptionId: {
    type: String,
    default: null,
  },
  stripeSubscriptionStatus: {
    type: String,
    enum: ['none', 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'],
    default: 'none',
  },
  stripePriceId: {
    type: String,
    default: null,
  },
  // Pago por uso / Límites de uso gratuito
  freeCreditsRemaining: {
    type: Number,
    default: 3, // Regala 3 resúmenes gratis de prueba al registrarse
  },
  totalSummariesDone: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Hook pre-save para hashear contraseñas de forma automática y segura
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Método de instancia para verificar contraseñas durante el login
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Método de instancia para verificar si el usuario tiene acceso Premium activo
UserSchema.methods.hasPremiumAccess = function () {
  // Retorna true si tiene suscripción activa o de prueba válida
  return ['active', 'trialing'].includes(this.stripeSubscriptionStatus);
};

module.exports = mongoose.model('User', UserSchema);
