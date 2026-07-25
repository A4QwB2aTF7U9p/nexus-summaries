const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_keys_reemplazame');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Crear sesión de Checkout de Stripe para Suscripción
// @route   POST /api/stripe/create-checkout-session
// @access  Private
router.post('/create-checkout-session', protect, async (req, res) => {
  const user = req.user;

  try {
    // 1. Si el usuario no tiene Customer ID de Stripe, lo creamos y lo guardamos
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // 2. Obtener el Price ID desde .env
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId || priceId.startsWith('price_mock')) {
      return res.status(400).json({
        success: false,
        error: 'El ID de precio de Stripe no está configurado correctamente en el servidor. Configura STRIPE_PRICE_ID en .env',
      });
    }

    // 3. Crear sesión de pago recurrente
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Permite que sepamos qué usuario local corresponde a este checkout en el webhook
      client_reference_id: user._id.toString(),
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard.html?session_id={CHECKOUT_SESSION_ID}&checkout=success`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard.html?checkout=cancel`,
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Error al crear checkout session:', error);
    res.status(500).json({ success: false, error: 'No se pudo iniciar el proceso de cobro: ' + error.message });
  }
});

// @desc    Crear sesión de Portal de Facturación de Stripe (Permite cancelar/actualizar tarjeta)
// @route   POST /api/stripe/create-portal-session
// @access  Private
router.post('/create-portal-session', protect, async (req, res) => {
  const user = req.user;

  if (!user.stripeCustomerId) {
    return res.status(400).json({ success: false, error: 'No tienes una cuenta de cliente de Stripe activa.' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard.html`,
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Error al crear portal session:', error);
    res.status(500).json({ success: false, error: 'No se pudo abrir el portal de facturación: ' + error.message });
  }
});

// @desc    Webhook de Stripe para sincronizar el estado de los pagos asíncronamente
// @route   POST /api/stripe/webhook
// @access  Public (Debe ser crudo para verificación de firma)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const payload = req.rawBody || req.body;
    // Si no hay firma de webhook o clave configurada (desarrollo rápido), saltamos la verificación estricta.
    // Pero en producción SIEMPRE se debe verificar la firma.
    if (!sig || !webhookSecret || webhookSecret.startsWith('whsec_mock')) {
      console.warn('⚠️ Webhook recibido sin firma de verificación estricta o usando valores Mock.');
      event = typeof payload === 'string' ? JSON.parse(payload) : req.body;
    } else {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    }
  } catch (err) {
    console.error(`❌ Error en Firma del Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Extraer el tipo de evento y la información del objeto
  const dataObject = event.data.object;
  console.log(`🔔 Evento de Stripe Recibido: ${event.type}`);

  try {
    switch (event.type) {
      // 1. Pago de checkout completado por primera vez
      case 'checkout.session.completed': {
        const userId = dataObject.client_reference_id;
        const customerId = dataObject.customer;
        const subscriptionId = dataObject.subscription;

        // Obtener la suscripción completa para saber el estado y el precio
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const status = subscription.status; // 'active', 'trialing' etc.
        const priceId = subscription.items.data[0].price.id;

        const updateData = {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripeSubscriptionStatus: status,
          stripePriceId: priceId,
        };

        let user;
        if (userId) {
          user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        } else {
          // Fallback por si acaso: buscar por Stripe Customer ID
          user = await User.findOneAndUpdate({ stripeCustomerId: customerId }, updateData, { new: true });
        }

        console.log(`✅ Suscripción activada para el usuario: ${user ? user.email : 'No encontrado'}`);
        break;
      }

      // 2. Suscripción modificada/actualizada (ej. pasó de trialing a active, cambio de plan, renovación mensual)
      case 'customer.subscription.updated': {
        const subscriptionId = dataObject.id;
        const customerId = dataObject.customer;
        const status = dataObject.status; // 'active', 'past_due', 'canceled', etc.
        const priceId = dataObject.items.data[0].price.id;

        const user = await User.findOneAndUpdate(
          { stripeCustomerId: customerId },
          {
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: status,
            stripePriceId: priceId,
          },
          { new: true }
        );

        console.log(`🔄 Suscripción actualizada para: ${user ? user.email : 'No encontrado'}. Nuevo Estado: ${status}`);
        break;
      }

      // 3. Pago exitoso de factura mensual (renovación)
      case 'invoice.payment_succeeded': {
        // Asegura que mantenga acceso premium activo
        if (dataObject.subscription) {
          const user = await User.findOneAndUpdate(
            { stripeCustomerId: dataObject.customer },
            { stripeSubscriptionStatus: 'active' },
            { new: true }
          );
          console.log(`💰 Pago de renovación recibido para: ${user ? user.email : 'No encontrado'}`);
        }
        break;
      }

      // 4. Pago fallido (tarjeta rechazada)
      case 'invoice.payment_failed': {
        // Cambiar estado a past_due para restringir acceso premium
        const user = await User.findOneAndUpdate(
          { stripeCustomerId: dataObject.customer },
          { stripeSubscriptionStatus: 'past_due' },
          { new: true }
        );
        console.log(`⚠️ Pago fallido para: ${user ? user.email : 'No encontrado'}. Acceso restringido.`);
        break;
      }

      // 5. Suscripción cancelada por completo
      case 'customer.subscription.deleted': {
        const user = await User.findOneAndUpdate(
          { stripeCustomerId: dataObject.customer },
          {
            stripeSubscriptionStatus: 'canceled', // o 'none'
            stripeSubscriptionId: null,
          },
          { new: true }
        );
        console.log(`❌ Suscripción cancelada para: ${user ? user.email : 'No encontrado'}`);
        break;
      }

      default:
        console.log(`ℹ️ Evento no manejado explícitamente: ${event.type}`);
    }
  } catch (dbError) {
    console.error('❌ Error al actualizar base de datos en webhook:', dbError);
    return res.status(500).json({ error: 'Error interno en sincronización de base de datos' });
  }

  // Responder a Stripe con 200 OK para confirmar recepción del evento
  res.status(200).json({ received: true });
});

module.exports = router;
