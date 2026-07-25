const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  stripeCustomerId: { type: DataTypes.STRING, defaultValue: null },
  stripeSubscriptionId: { type: DataTypes.STRING, defaultValue: null },
  stripeSubscriptionStatus: { 
    type: DataTypes.ENUM('none', 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'),
    defaultValue: 'none'
  },
  stripePriceId: { type: DataTypes.STRING, defaultValue: null },
  freeCreditsRemaining: { type: DataTypes.INTEGER, defaultValue: 3 },
  totalSummariesDone: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  hooks: {
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  }
});

User.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

User.prototype.hasPremiumAccess = function () {
  return ['active', 'trialing'].includes(this.stripeSubscriptionStatus);
};

module.exports = User;
