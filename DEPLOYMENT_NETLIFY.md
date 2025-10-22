# 🚀 Guía de Deployment en Netlify

Esta guía te ayudará a desplegar tu aplicación de delivery management en Netlify de forma completa y segura.

## 📋 Pre-requisitos

- [x] Cuenta de Netlify
- [x] Proyecto en Supabase configurado
- [x] Cuenta de Stripe configurada
- [x] Código subido a GitHub/GitLab

## 🔧 Paso 1: Configurar Variables de Entorno en Netlify

### 1.1 Acceder a las Variables de Entorno

1. Ve a tu proyecto en [Netlify Dashboard](https://app.netlify.com)
2. Ve a **Site settings** → **Environment variables**
3. Haz clic en **Add variable**

### 1.2 Variables Requeridas

Agrega las siguientes variables **UNA POR UNA**:

#### **Supabase Configuration**
```
VITE_SUPABASE_URL = https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Stripe Configuration**
```
STRIPE_SECRET_KEY = sk_live_... (para producción)
STRIPE_PUBLISHABLE_KEY = pk_live_... (para producción)
```

#### **Application Configuration**
```
VITE_APP_URL = https://tu-dominio.netlify.app
NODE_ENV = production
```

### 1.3 Obtener las Claves

#### **Supabase:**
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

#### **Stripe:**
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Ve a **Developers** → **API keys**
3. Copia:
   - **Secret key** → `STRIPE_SECRET_KEY`
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY`
4. **IMPORTANTE**: Usa las claves de **LIVE** para producción

## 🔗 Paso 2: Configurar el Webhook en Stripe

### 2.1 URL del Webhook en Producción

Tu webhook estará disponible en:
```
https://tu-dominio.netlify.app/.netlify/functions/stripe-webhook?secret=TU_WEBHOOK_SECRET
```

### 2.2 Configurar en Stripe

1. Ve a **Stripe Dashboard** → **Developers** → **Webhooks**
2. Haz clic en **Add endpoint**
3. **URL del endpoint**: `https://tu-dominio.netlify.app/.netlify/functions/stripe-webhook?secret=TU_WEBHOOK_SECRET`
4. **Eventos**: Selecciona `checkout.session.completed`
5. Haz clic en **Add endpoint**

## 🏗️ Paso 3: Configurar el Build en Netlify

### 3.1 Build Settings

Netlify detectará automáticamente la configuración del archivo `netlify.toml`:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `18`

### 3.2 Deploy desde Git

1. Conecta tu repositorio de GitHub/GitLab
2. Netlify hará deploy automático en cada push
3. El primer deploy puede tardar 5-10 minutos

## 🔒 Paso 4: Configurar Dominio Personalizado (Opcional)

### 4.1 Dominio Personalizado

1. Ve a **Domain settings** en Netlify
2. Haz clic en **Add custom domain**
3. Sigue las instrucciones de DNS

### 4.2 SSL Certificate

- Netlify proporciona SSL automáticamente
- Se activa en 24-48 horas después del deploy

## 🧪 Paso 5: Probar la Aplicación

### 5.1 Verificar Frontend

1. Visita tu URL de Netlify
2. Verifica que la aplicación carga correctamente
3. Prueba el registro y login

### 5.2 Verificar Webhook

1. Configura un webhook en tu panel
2. Haz una compra de prueba en Stripe
3. Verifica que se crea la orden automáticamente

### 5.3 Verificar Logs

1. Ve a **Functions** en Netlify Dashboard
2. Revisa los logs del webhook
3. Verifica que no hay errores

## 📊 Paso 6: Monitoreo y Mantenimiento

### 6.1 Logs de Netlify

- **Site overview**: Estadísticas generales
- **Functions**: Logs de webhooks
- **Deploys**: Historial de deployments

### 6.2 Monitoreo de Errores

Considera agregar:
- **Sentry**: Para tracking de errores
- **Google Analytics**: Para métricas de uso

## 🚨 Troubleshooting

### Error: "Function not found"

**Causa**: El webhook no está en la ruta correcta
**Solución**: 
- Verifica que el archivo esté en `netlify/functions/stripe-webhook.js`
- La URL debe ser `/.netlify/functions/stripe-webhook`

### Error: "Environment variables not found"

**Causa**: Variables de entorno no configuradas
**Solución**:
- Verifica que todas las variables estén en Netlify Dashboard
- Reinicia el deploy después de agregar variables

### Error: "Stripe webhook verification failed"

**Causa**: Webhook secret incorrecto
**Solución**:
- Verifica que el secret en la URL coincida con el de la base de datos
- Regenera el webhook secret si es necesario

### Error: "Supabase connection failed"

**Causa**: Claves de Supabase incorrectas
**Solución**:
- Verifica las claves en Supabase Dashboard
- Asegúrate de usar las claves correctas (anon vs service_role)

## 📈 Optimizaciones de Producción

### 6.1 Performance

- **Lighthouse**: Netlify ejecuta automáticamente
- **CDN**: Netlify Edge Network
- **Caching**: Configurado en `netlify.toml`

### 6.2 Security

- **Headers de seguridad**: Configurados en `netlify.toml`
- **HTTPS**: Automático con Netlify
- **Environment variables**: Seguras en Netlify

## 🔄 Actualizaciones

### Deploy Automático

- Cada push a `main` hace deploy automático
- Los deploys toman 2-5 minutos
- Netlify notifica por email si hay errores

### Deploy Manual

1. Ve a **Deploys** en Netlify Dashboard
2. Haz clic en **Trigger deploy**
3. Selecciona **Deploy site**

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs** en Netlify Dashboard
2. **Verifica las variables** de entorno
3. **Consulta la documentación** de Netlify
4. **Revisa el estado** de los servicios (Supabase, Stripe)

---

## ✅ Checklist de Deployment

- [ ] Variables de entorno configuradas en Netlify
- [ ] Webhook configurado en Stripe con URL de producción
- [ ] Dominio personalizado configurado (opcional)
- [ ] SSL certificate activo
- [ ] Aplicación funcionando correctamente
- [ ] Webhook creando órdenes automáticamente
- [ ] Logs sin errores críticos

**¡Listo!** Tu aplicación está desplegada en producción y lista para recibir usuarios reales.
