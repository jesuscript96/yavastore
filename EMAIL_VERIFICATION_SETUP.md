# 📧 Configuración de Verificación de Email

Esta guía explica cómo configurar correctamente la verificación de email en tu aplicación Yava.

## 🔧 Configuración en Supabase

### 1. Configurar URLs de Redirección

1. Ve a tu proyecto en [app.supabase.com](https://app.supabase.com)
2. Navega a **Authentication** → **Settings**
3. En la sección **URL Configuration**:

   **Site URL:**
   ```
   https://tu-dominio.netlify.app
   ```

   **Redirect URLs (agregar ambas):**
   ```
   http://localhost:5173/login
   https://tu-dominio.netlify.app/login
   ```

### 2. Configurar Plantillas de Email (Opcional)

1. Ve a **Authentication** → **Email Templates**
2. Personaliza el template de **Confirm signup** si deseas
3. Asegúrate de que el template incluya el enlace de confirmación

## 🌐 Configuración en Netlify

### Variables de Entorno Requeridas

Asegúrate de tener configurada la variable `VITE_APP_URL` en Netlify:

1. Ve a tu sitio en Netlify Dashboard
2. Ve a **Site settings** → **Environment variables**
3. Agrega o actualiza:

```
VITE_APP_URL = https://tu-dominio.netlify.app
```

**IMPORTANTE:** Esta URL debe coincidir exactamente con la Site URL configurada en Supabase.

## 🔄 Flujo de Verificación

### 1. Registro de Usuario
- El usuario se registra con email y contraseña
- Supabase envía un email de verificación
- El email contiene un enlace que redirige a: `https://tu-dominio.netlify.app/login?type=signup&token=...`

### 2. Verificación de Email
- El usuario hace clic en el enlace del email
- Es redirigido a la página de login
- La aplicación detecta los parámetros de verificación
- Muestra un mensaje de éxito: "¡Email verificado exitosamente!"

### 3. Inicio de Sesión
- El usuario puede ahora iniciar sesión normalmente
- Si intenta iniciar sesión sin verificar, recibe el mensaje: "Por favor verifica tu correo electrónico antes de iniciar sesión"

## 🛡️ Seguridad Implementada

### Bloqueo de Acceso
- Los usuarios no verificados **NO** pueden acceder al dashboard
- Si hay una sesión activa pero el email no está verificado, se cierra automáticamente
- Se verifica `email_confirmed_at` en cada inicio de sesión

### Verificación en Múltiples Puntos
1. **Durante el login:** Se verifica antes de permitir acceso
2. **Durante la inicialización:** Se verifica al cargar la aplicación
3. **En cambios de estado:** Se verifica cuando cambia el estado de autenticación

## 🧪 Pruebas

### Probar el Flujo Completo

1. **Registro:**
   - Ve a `/register`
   - Completa el formulario
   - Verifica que aparezca el mensaje: "Cuenta creada exitosamente. Revisa tu email para confirmar tu cuenta antes de iniciar sesión."

2. **Verificación:**
   - Revisa tu email
   - Haz clic en el enlace de verificación
   - Deberías ser redirigido a `/login` con un mensaje de éxito

3. **Login:**
   - Intenta iniciar sesión sin verificar → Debería mostrar error
   - Verifica el email y luego inicia sesión → Debería funcionar

### Probar en Desarrollo

Para desarrollo local, asegúrate de que:
- `VITE_APP_URL=http://localhost:5173` en tu `.env`
- La URL de redirección en Supabase incluya `http://localhost:5173/login`

## 🐛 Troubleshooting

### El email de verificación no llega
- Verifica que el email no esté en spam
- Revisa la configuración de SMTP en Supabase
- Verifica que el email sea válido

### El enlace de verificación no funciona
- Verifica que `VITE_APP_URL` esté configurada correctamente
- Asegúrate de que la URL esté en la lista de Redirect URLs de Supabase
- Verifica que no haya errores en la consola del navegador

### El usuario puede iniciar sesión sin verificar
- Verifica que los cambios en `authStore.js` estén aplicados
- Revisa la consola para mensajes de debug
- Asegúrate de que `email_confirmed_at` se esté verificando correctamente

## 📝 Notas Importantes

- **Siempre usa HTTPS en producción** para las URLs de redirección
- **La URL debe coincidir exactamente** entre Supabase y Netlify
- **Los usuarios existentes** que ya tienen sesión activa necesitarán verificar su email
- **Para desarrollo local**, usa `http://localhost:5173` en lugar de HTTPS

---

**¡Listo!** Con esta configuración, tu aplicación tendrá un sistema robusto de verificación de email.
