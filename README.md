# SaaS Resumidor de PDFs

Infraestructura backend completa para un SaaS monetizado con Stripe.

## Características
- **Autenticación:** Registro/Login seguro con JWT y cookies.
- **Monetización:** Suscripción mensual con Stripe Checkout.
- **Control de Acceso:** Sistema freemium (créditos gratuitos) y acceso ilimitado para suscriptores.
- **Sincronización:** Webhooks de Stripe para gestionar estados de suscripción automáticamente.

## Despliegue en Railway
1. **Conectar Repo:** Crea un nuevo proyecto en Railway conectando este repositorio de GitHub.
2. **Variables de Entorno:** En el panel de Railway ("Variables"), añade las siguientes:
   - `MONGODB_URI`: Tu conexión a MongoDB Atlas.
   - `JWT_SECRET`: Una cadena larga y aleatoria.
   - `STRIPE_SECRET_KEY`: Tu clave privada de Stripe.
   - `STRIPE_WEBHOOK_SECRET`: Firma del webhook configurado en Stripe.
   - `STRIPE_PRICE_ID`: ID del precio de tu suscripción en Stripe.
   - `APP_URL`: La URL pública que te dará Railway (ej: `https://tu-app.up.railway.app`).
   - `NODE_ENV`: `production`.
3. **Webhook Stripe:** En el Dashboard de Stripe, configura un Webhook apuntando a `https://tu-app.up.railway.app/api/stripe/webhook` y suscríbete a eventos de checkout y suscripción.

## Desarrollo Local
```bash
# 1. Instalar
npm install

# 2. Configurar .env
cp .env.example .env
# Rellena .env con tus claves

# 3. Arrancar
npm run dev
```
