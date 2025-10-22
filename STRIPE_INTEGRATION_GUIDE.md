# Guía de Integración con Stripe - Sistema de Pedidos Automáticos

## 🎯 ¿Qué hace esta integración?

Esta integración permite que cada negocio conecte su propia tienda de Stripe para recibir pedidos automáticamente en su panel de delivery. Cuando un cliente completa una compra en la tienda del negocio, automáticamente se crea una orden en el sistema de delivery.

## 🔄 Flujo de Trabajo

1. **Negocio se registra** en la aplicación
2. **Configura su tienda** en Stripe (externamente)
3. **Configura el webhook** siguiendo las instrucciones
4. **Recibe pedidos automáticamente** cuando los clientes compran

## 📋 Pasos para el Usuario

### Paso 1: Configurar tienda en Stripe
- Crear cuenta en [Stripe](https://stripe.com)
- Configurar productos y precios
- Probar que la tienda funciona correctamente

### Paso 2: Generar Webhook Secret
- Ir a Configuración en el panel de administración
- En la sección "Configuración de Webhook de Stripe"
- Hacer clic en "Generar Secret"
- Copiar la URL del webhook que se genera automáticamente

### Paso 3: Configurar webhook en Stripe
- Ir a Dashboard de Stripe → Desarrolladores → Webhooks
- Agregar endpoint con la URL copiada
- Seleccionar evento: `checkout.session.completed`
- Crear el webhook
- Hacer clic en el webhook creado
- Copiar el "Signing secret" (hacer clic en "Revelar")

### Paso 4: Completar configuración en el panel
- Regresar al panel de administración
- Pegar el "Signing secret" de Stripe en el campo correspondiente
- Guardar configuración

## 🛠️ Implementación Técnica

### Base de Datos
- Campo `stripe_webhook_secret` único por negocio
- Migración: `20241022000003_add_stripe_webhook_secret.sql`

### Webhook Handler
- Archivo: `api/webhooks/stripe.js`
- Maneja múltiples negocios usando webhook secrets únicos
- Crea órdenes automáticamente cuando se completa un checkout

### Componentes Frontend
- `WebhookConfig.jsx`: Componente para configurar webhook
- `StripeSetupInstructions.jsx`: Página con instrucciones detalladas
- Integrado en `Settings.jsx`

## 📝 Metadatos Requeridos

Para que los pedidos se creen correctamente, incluir en los metadatos del checkout:

```javascript
metadata: {
  customer_name: 'Nombre del cliente',
  customer_phone: 'Teléfono del cliente',
  customer_address: 'Dirección de entrega',
  delivery_time: '2024-01-15T18:00:00Z', // Opcional
  notes: 'Notas adicionales' // Opcional
}
```

## 🔒 Seguridad

- Cada negocio tiene su propio webhook secret único
- Verificación de firma de Stripe para cada webhook
- RLS (Row Level Security) en Supabase
- Los pagos van directamente a la cuenta de Stripe del negocio

## 🚀 Beneficios

- ✅ **No manejas dinero** - Los pagos van directo a Stripe del negocio
- ✅ **Configuración simple** - Solo un webhook por negocio
- ✅ **Escalable** - Cada negocio maneja sus propios pagos
- ✅ **Sin comisiones** - No cobras por procesar pagos
- ✅ **Automático** - Los pedidos se crean sin intervención manual

## 📁 Archivos Modificados/Creados

### Nuevos archivos:
- `supabase/migrations/20241022000003_add_stripe_webhook_secret.sql`
- `src/components/WebhookConfig.jsx`
- `src/pages/StripeSetupInstructions.jsx`

### Archivos modificados:
- `api/webhooks/stripe.js` - Mejorado para múltiples negocios
- `src/pages/Settings.jsx` - Integrado componente WebhookConfig
- `src/App.jsx` - Agregada ruta para instrucciones

## 🧪 Testing

Para probar la integración:

1. Configurar webhook en Stripe (modo test)
2. Hacer una compra de prueba
3. Verificar que se crea la orden en el panel
4. Verificar que los datos del cliente se importan correctamente

## 📞 Soporte

Si hay problemas:
1. Verificar que el webhook esté configurado correctamente en Stripe
2. Revisar los logs del webhook
3. Verificar que los metadatos estén incluidos en el checkout
4. Comprobar que el webhook secret sea correcto

---

**¡Listo!** El sistema está configurado para que cada negocio pueda recibir pedidos automáticamente desde su propia tienda de Stripe.
