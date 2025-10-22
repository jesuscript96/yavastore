# 🔑 Variables de Entorno para Netlify

## 📋 Lista Completa de Variables

Copia y pega estas variables **UNA POR UNA** en Netlify Dashboard → Site settings → Environment variables:

### 🗄️ **SUPABASE CONFIGURATION**

```
VITE_SUPABASE_URL
```
**Valor**: `https://tu-proyecto-id.supabase.co`
**Descripción**: URL de tu proyecto de Supabase

```
VITE_SUPABASE_ANON_KEY
```
**Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
**Descripción**: Clave pública de Supabase (anon key)

```
SUPABASE_SERVICE_ROLE_KEY
```
**Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
**Descripción**: Clave de servicio de Supabase (service role key)

### 💳 **STRIPE CONFIGURATION**

```
STRIPE_SECRET_KEY
```
**Valor**: `sk_live_...` (para producción)
**Descripción**: Clave secreta de Stripe para producción

```
STRIPE_PUBLISHABLE_KEY
```
**Valor**: `pk_live_...` (para producción)
**Descripción**: Clave pública de Stripe para producción

```
STRIPE_WEBHOOK_SECRET
```
**Valor**: `whsec_...` (signing secret de tu webhook principal)
**Descripción**: Signing secret por defecto para verificar webhooks cuando no se encuentra el negocio específico

### 🌐 **APPLICATION CONFIGURATION**

```
VITE_APP_URL
```
**Valor**: `https://tu-dominio.netlify.app`
**Descripción**: URL de tu aplicación en producción

```
NODE_ENV
```
**Valor**: `production`
**Descripción**: Entorno de ejecución

## 📍 **Dónde Obtener las Claves**

### **Supabase:**
1. Ve a [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia las claves

### **Stripe:**
1. Ve a [dashboard.stripe.com](https://dashboard.stripe.com)
2. Ve a **Developers** → **API keys**
3. **IMPORTANTE**: Usa las claves de **LIVE** (no test)
4. Copia las claves

## ⚠️ **IMPORTANTE**

- ✅ Usa claves de **PRODUCCIÓN** de Stripe (`sk_live_`, `pk_live_`)
- ✅ NO uses claves de test (`sk_test_`, `pk_test_`)
- ✅ Reinicia el deploy después de agregar las variables
- ✅ Verifica que todas las variables estén configuradas antes del primer deploy

## 🔄 **Después de Configurar**

1. **Haz commit** de todos los cambios
2. **Push** a tu repositorio
3. **Netlify** hará deploy automático
4. **Verifica** que la aplicación funcione correctamente
5. **Prueba** el webhook con una compra de prueba

---

**¡Listo!** Con estas variables configuradas, tu aplicación estará lista para producción.
