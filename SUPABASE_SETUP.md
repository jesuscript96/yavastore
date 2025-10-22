# Guía de Configuración de Supabase - Paso a Paso

Esta guía te ayudará a configurar correctamente tu base de datos de Supabase para que el registro de negocios funcione sin errores de RLS.

## 📋 Pre-requisitos

- Cuenta de Supabase creada
- Proyecto nuevo en Supabase
- Acceso al SQL Editor en Supabase

## 🔧 Pasos de Configuración

### Paso 1: Acceder al SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **+ New query**

### Paso 2: Ejecutar la Migración Inicial

1. Copia **TODO** el contenido del archivo:
   ```
   supabase/migrations/20241022000001_initial_schema.sql
   ```

2. Pégalo en el SQL Editor

3. Haz clic en **RUN** (o presiona `Ctrl/Cmd + Enter`)

4. **Verifica** que no haya errores. Deberías ver:
   ```
   Success. No rows returned
   ```

### Paso 3: Aplicar el Fix de RLS (IMPORTANTE)

**Este paso es CRÍTICO para que el registro funcione.**

1. Abre una **nueva query** en el SQL Editor

2. Copia **TODO** el contenido del archivo:
   ```
   supabase/migrations/20241022000002_fix_rls_policies.sql
   ```

3. Pégalo en el SQL Editor

4. Haz clic en **RUN**

5. **Verifica** que se ejecute sin errores

### Paso 4: Verificar las Tablas Creadas

1. En el menú lateral, ve a **Database → Tables**

2. Deberías ver 3 tablas:
   - ✅ `businesses`
   - ✅ `delivery_people`
   - ✅ `orders`

3. Haz clic en cada una para verificar las columnas

### Paso 5: Verificar las Políticas RLS

1. Ve a **Authentication → Policies**

2. Deberías ver políticas para:
   - `businesses` (3 políticas)
   - `delivery_people` (6 políticas)
   - `orders` (6 políticas)

3. Verifica que exista la política:
   ```
   "Businesses can insert own data" en businesses
   ```

### Paso 6: Verificar el Trigger

1. En el SQL Editor, ejecuta esta query para verificar:
   ```sql
   SELECT
     trigger_name,
     event_manipulation,
     event_object_table,
     action_statement
   FROM information_schema.triggers
   WHERE trigger_name = 'on_auth_user_created';
   ```

2. Deberías ver el trigger configurado en la tabla `users`

### Paso 7: Verificar la Función

1. Ejecuta esta query:
   ```sql
   SELECT
     routine_name,
     routine_type,
     security_type
   FROM information_schema.routines
   WHERE routine_name = 'handle_new_user';
   ```

2. Deberías ver:
   - `routine_type`: FUNCTION
   - `security_type`: DEFINER

### Paso 8: Obtener tus API Keys

1. Ve a **Settings → API**

2. Copia las siguientes claves:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: Empieza con `eyJhbGci...`
   - **service_role key**: Empieza con `eyJhbGci...` (¡Mantén esto secreto!)

3. Guárdalas en tu archivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

## 🧪 Probar el Registro

Ahora puedes probar el registro:

1. Inicia tu aplicación:
   ```bash
   npm run dev
   ```

2. Ve a la página de registro

3. Completa el formulario:
   - Email
   - Contraseña
   - Nombre del negocio

4. Haz clic en **Registrarse**

5. **Verifica** que:
   - ✅ No aparezca error de RLS
   - ✅ El usuario se cree correctamente
   - ✅ Seas redirigido al dashboard

## 🔍 Verificar en Supabase

Después de registrarte, verifica en Supabase:

1. Ve a **Authentication → Users**
   - Deberías ver tu usuario creado

2. Ve a **Database → Tables → businesses**
   - Deberías ver un registro con:
     - `id`: El mismo UUID del usuario
     - `name`: El nombre del negocio
     - `email`: Tu email

## 🐛 Troubleshooting

### Error: "new row violates row-level security policy"

**Causa**: La migración del fix no se aplicó correctamente.

**Solución**:
1. Ve al SQL Editor
2. Ejecuta manualmente:
   ```sql
   -- Verificar que el trigger existe
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

   -- Si no existe, vuelve a ejecutar la migración 20241022000002_fix_rls_policies.sql
   ```

### Error: "duplicate key value violates unique constraint"

**Causa**: Ya existe un registro con ese email o ID.

**Solución**:
1. Elimina el usuario duplicado en **Authentication → Users**
2. Elimina el registro en **Database → businesses** si existe
3. Intenta registrarte nuevamente

### El trigger no crea el negocio automáticamente

**Causa**: El trigger podría no tener los permisos correctos.

**Solución**:
1. Ejecuta en el SQL Editor:
   ```sql
   -- Dar permisos al trigger
   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

   -- Verificar permisos
   SELECT grantee, privilege_type
   FROM information_schema.routine_privileges
   WHERE routine_name = 'handle_new_user';
   ```

### El usuario se crea pero no el negocio

**Causa**: El metadata `business_name` no se está pasando correctamente.

**Solución**: Verifica en el código que `authStore.signUp` esté pasando:
```javascript
options: {
  data: {
    business_name: businessName  // Debe ser business_name, no businessName
  }
}
```

## 🔒 Seguridad en Producción

### ✅ Verificaciones de Seguridad

Antes de ir a producción, verifica:

1. **RLS está activado** en todas las tablas:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('businesses', 'delivery_people', 'orders');
   ```
   Todas deben mostrar `rowsecurity = true`

2. **Las políticas RLS funcionan**:
   - Intenta acceder a datos de otro negocio → Debe ser bloqueado
   - Intenta modificar datos de otro negocio → Debe ser bloqueado

3. **El service_role_key está protegido**:
   - ✅ Solo usado en el servidor de webhooks
   - ✅ No expuesto en el frontend
   - ✅ En variables de entorno del servidor

4. **El trigger usa SECURITY DEFINER**:
   - Esto permite crear el negocio sin exponer el service_role_key
   - Es seguro porque la función valida que el ID coincida

## 📊 Monitoreo

Puedes monitorear el registro de usuarios:

```sql
-- Ver usuarios registrados recientemente
SELECT
  u.id,
  u.email,
  u.created_at,
  b.name as business_name
FROM auth.users u
LEFT JOIN public.businesses b ON u.id = b.id
ORDER BY u.created_at DESC
LIMIT 10;
```

## 🎯 Resumen de Configuración

- [x] Migración inicial ejecutada
- [x] Fix de RLS aplicado
- [x] Tablas creadas correctamente
- [x] Políticas RLS configuradas
- [x] Trigger y función creados
- [x] API keys copiadas al `.env`
- [x] Registro probado exitosamente
- [x] Verificaciones de seguridad completadas

## 📞 Soporte

Si después de seguir estos pasos sigues teniendo problemas:

1. Revisa los logs en **Supabase Dashboard → Logs**
2. Verifica la consola del navegador para errores
3. Revisa que todas las migraciones se ejecutaron sin errores
4. Abre un issue en el repositorio con:
   - Mensaje de error completo
   - Pasos que seguiste
   - Capturas de pantalla si es posible

---

**¡Listo!** Tu Supabase está configurado correctamente y de forma segura para producción.
