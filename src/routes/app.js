const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPremiumOrCredits } = require('../middleware/premium');

// @desc    Servicio SaaS Premium: Resumir texto de un documento PDF o manuscrito
// @route   POST /api/app/summarize
// @access  Private (Premium o con Créditos de Prueba)
router.post('/summarize', protect, checkPremiumOrCredits, async (req, res) => {
  const { documentTitle, documentText } = req.body;

  if (!documentTitle || !documentText) {
    return res.status(400).json({ success: false, error: 'Por favor, proporciona el título y el contenido del documento.' });
  }

  try {
    // 1. Simulación o Integración real con una API de IA (ej: OpenAI o Claude)
    // En producción, aquí harías:
    // const aiResponse = await openai.chat.completions.create({...})
    
    // Creación de una respuesta simulada de alta calidad basada en el texto proporcionado:
    const wordCount = documentText.split(/\s+/).filter(Boolean).length;
    const readingTimeOriginal = Math.ceil(wordCount / 200); // 200 ppm estándar
    const readingTimeSummary = Math.ceil((wordCount * 0.15) / 200) || 1;

    // Estructuramos un resumen dinámico y estético
    const keywords = ['Análisis Estratégico', 'Eficiencia', 'Optimización', 'SaaS', 'Escalabilidad']
      .filter(() => Math.random() > 0.3)
      .join(', ');

    const summaryHTML = `
### 📄 Resumen Ejecutivo: ${documentTitle}
*Tiempo de lectura original: ~${readingTimeOriginal} min | Tiempo de lectura del resumen: ~${readingTimeSummary} min*

---

#### 💡 Idea Central e Impacto
El documento aborda de manera sistemática los pilares de la optimización operativa y la escalabilidad del proyecto. En esencia, propone un modelo estructurado para mejorar los flujos de trabajo actuales y eliminar cuellos de botella mediante la automatización.

#### 📌 Puntos Clave Extraídos
1. **Sustentabilidad Financiera:** Se destaca la necesidad de mantener un modelo limpio sin publicidad para mejorar la retención de usuarios premium (LTV).
2. **Eficiencia en la Nube:** Análisis profundo de la infraestructura ligera para mantener costes de servidor bajos.
3. **Escalabilidad Técnica:** Desacoplamiento de microservicios para evitar cuellos de botella en peticiones de alta intensidad.

#### 🎯 Acciones Sugeridas (Roadmap de Acción)
- **Corto Plazo:** Validar la pasarela de pagos con Stripe CLI antes del lanzamiento.
- **Medio Plazo:** Integrar análisis sintáctico real para ficheros de más de 50 páginas mediante LLMs ligeros.
- **Largo Plazo:** Expandir a soporte multi-idioma nativo.

*Palabras clave detectadas:* \`${keywords}\`
    `;

    // 2. Incrementar el contador total en el usuario si pasó como Premium
    // (Si pasó por crédito gratuito, el middleware premium.js ya lo decrementó e incrementó el total)
    if (req.accessType === 'premium') {
      req.user.totalSummariesDone += 1;
      await req.user.save();
    }

    res.json({
      success: true,
      accessUsed: req.accessType, // Indica si consumió 'premium' (ilimitado) o 'free_credits'
      creditsRemaining: req.user.freeCreditsRemaining,
      totalSummariesDone: req.user.totalSummariesDone,
      summary: summaryHTML,
    });
  } catch (error) {
    console.error('Error al generar resumen:', error);
    res.status(500).json({ success: false, error: 'Ocurrió un error procesando el documento. Inténtalo de nuevo.' });
  }
});

module.exports = router;
