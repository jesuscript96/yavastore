# Yava - Delivery Management System

Una aplicación web completa para negocios que necesitan gestionar pedidos de delivery, repartidores y generar estadísticas. Diseñada con un enfoque mobile-first.

## 🚀 Características

### Autenticación y Gestión de Usuarios
- Sistema de registro e inicio de sesión con Supabase Auth
- Cada negocio tiene su espacio aislado de datos
- Sesión persistente en el navegador

### Gestión de Pedidos
- ✅ Creación manual de pedidos con formulario completo
- ✅ Integración con Stripe para pedidos automáticos vía webhooks
- ✅ Lista de pedidos con filtros por estado, fecha y repartidor
- ✅ Vista detallada de cada pedido
- ✅ Edición de hora de entrega
- Estados: Pendiente, Asignado, En Ruta, Entregado, Cancelado

### Gestión de Repartidores
- ✅ Creación de repartidores con credenciales de acceso
- ✅ Configuración de horarios de servicio por día
- ✅ Activación/Desactivación de repartidores
- ✅ Edición de información y horarios

### Asignación de Pedidos
- ✅ Interfaz para asignar pedidos a repartidores
- ✅ Vista calendario semanal con pedidos asignados
- ✅ Validación de horarios de servicio
- ✅ Reasignación de pedidos

### Estadísticas y Dashboard
- ✅ Dashboard principal con métricas clave
- ✅ Estadísticas con gráficos interactivos
- ✅ Top 5 productos más vendidos
- ✅ Rendimiento de repartidores
- ✅ Filtros por período (hoy, semana, mes, personalizado)

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Estado**: Zustand
- **Base de datos**: Supabase (PostgreSQL + Auth + Realtime)
- **Estilos**: Tailwind CSS (mobile-first)
- **Formularios**: React Hook Form
- **Gráficos**: Recharts
- **Notificaciones**: React Hot Toast
- **Iconos**: Lucide React
- **Pagos**: Stripe + Webhooks
- **Backend**: Express.js (para webhooks)

## 📋 Requisitos Previos

- Node.js 18+ y npm/yarn
- Cuenta de Supabase (gratis)
- Cuenta de Stripe (opcional, para pagos automáticos)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd yava
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

**⚠️ IMPORTANTE: Sigue la guía detallada paso a paso**

Para configurar correctamente Supabase y evitar errores de RLS, consulta:

📖 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Guía completa paso a paso

**Resumen rápido:**

1. Crea un proyecto en [Supabase](https://app.supabase.com)
2. Ve a **SQL Editor** en Supabase
3. Ejecuta las migraciones en orden:
   - `supabase/migrations/20241022000001_initial_schema.sql`
   - `supabase/migrations/20241022000002_fix_rls_policies.sql` ⚠️ **CRÍTICO**
4. Copia tus API keys desde **Settings → API**:
   - Project URL
   - anon/public key
   - service_role key (para webhooks)

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.local.example .env
```

Edita `.env` con tus credenciales:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe (opcional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App
VITE_APP_URL=http://localhost:5173
PORT=3001
```

### 5. Iniciar la aplicación

```bash
# Desarrollo frontend
npm run dev

# Desarrollo servidor de webhooks (opcional)
npm run webhook:dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🔐 Configuración de Stripe (Opcional)

Si quieres recibir pedidos automáticamente desde Stripe:

### Desarrollo Local

1. Instala Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Inicia sesión:
   ```bash
   stripe login
   ```

3. Reenvía webhooks a tu servidor local:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```

4. Copia el webhook secret que aparece y agrégalo a tu `.env`

### Producción

1. Despliega tu aplicación (Vercel, Netlify, etc.)

2. En tu [Dashboard de Stripe](https://dashboard.stripe.com/webhooks):
   - Haz clic en "Add endpoint"
   - URL: `https://tu-dominio.com/api/webhooks/stripe`
   - Eventos: Selecciona `checkout.session.completed`
   - Copia el Webhook Secret

3. Configura el Webhook Secret en:
   - Tu archivo `.env` de producción
   - La página de **Configuración** dentro de la app

### Formato de Metadata en Stripe Checkout

Para que los pedidos se creen automáticamente, incluye en el metadata del checkout:

```javascript
{
  business_id: "uuid-del-negocio",
  customer_name: "Nombre del Cliente",
  customer_phone: "+1234567890",
  customer_address: "Calle 123, Ciudad",
  delivery_time: "2024-10-25T14:00:00Z",
  notes: "Notas adicionales"
}
```

## 🚢 Deployment

### Opción 1: Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

Asegúrate de configurar las variables de entorno en el dashboard de Vercel.

### Opción 2: Netlify

```bash
npm install -g netlify-cli
netlify deploy
```

### Opción 3: Servidor Node.js

```bash
# Build frontend
npm run build

# Servir archivos estáticos con cualquier servidor
# Ejecutar servidor de webhooks
npm run webhook:start
```

## 📁 Estructura del Proyecto

```
yava/
├── api/                          # Backend para webhooks
│   ├── server.js                 # Servidor Express
│   └── webhooks/
│       └── stripe.js             # Handler de webhooks de Stripe
├── src/
│   ├── components/               # Componentes reutilizables
│   │   ├── Layout.jsx           # Layout principal con navegación
│   │   └── LoadingSpinner.jsx   # Spinner de carga
│   ├── lib/
│   │   └── supabase.js          # Cliente de Supabase
│   ├── pages/                    # Páginas de la aplicación
│   │   ├── Dashboard.jsx        # Dashboard principal
│   │   ├── Login.jsx            # Inicio de sesión
│   │   ├── Register.jsx         # Registro de negocios
│   │   ├── Orders.jsx           # Lista de pedidos
│   │   ├── CreateOrder.jsx      # Crear pedido manual
│   │   ├── OrderDetail.jsx      # Detalle del pedido
│   │   ├── DeliveryPeople.jsx   # Lista de repartidores
│   │   ├── CreateDeliveryPerson.jsx  # Crear repartidor
│   │   ├── EditDeliveryPerson.jsx    # Editar repartidor
│   │   ├── Assignments.jsx      # Asignaciones
│   │   ├── Statistics.jsx       # Estadísticas
│   │   └── Settings.jsx         # Configuración
│   ├── store/                    # Estado global (Zustand)
│   │   ├── authStore.js         # Autenticación
│   │   ├── ordersStore.js       # Pedidos
│   │   ├── deliveryPeopleStore.js  # Repartidores
│   │   └── statsStore.js        # Estadísticas
│   ├── App.jsx                   # Componente principal
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Estilos globales
├── supabase/
│   └── migrations/               # Migraciones de base de datos
│       └── 20241022000001_initial_schema.sql
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🗄️ Esquema de Base de Datos

### Tabla: `businesses`
- `id` (UUID, PK) - Referencia a auth.users
- `name` (TEXT) - Nombre del negocio
- `email` (TEXT) - Email del negocio
- `stripe_webhook_secret` (TEXT) - Secret del webhook
- `stripe_publishable_key` (TEXT) - Clave pública de Stripe
- `created_at`, `updated_at` (TIMESTAMP)

### Tabla: `delivery_people`
- `id` (UUID, PK) - Referencia a auth.users
- `business_id` (UUID, FK) - Negocio al que pertenece
- `name` (TEXT) - Nombre del repartidor
- `email` (TEXT) - Email del repartidor
- `phone` (TEXT) - Teléfono
- `schedule_config` (JSONB) - Configuración de horarios
- `active` (BOOLEAN) - Estado activo/inactivo
- `created_at`, `updated_at` (TIMESTAMP)

### Tabla: `orders`
- `id` (UUID, PK)
- `business_id` (UUID, FK) - Negocio
- `customer_name` (TEXT) - Nombre del cliente
- `customer_address` (TEXT) - Dirección de entrega
- `customer_phone` (TEXT) - Teléfono del cliente
- `products` (JSONB) - Array de productos
- `total_amount` (DECIMAL) - Monto total
- `delivery_time` (TIMESTAMP) - Hora de entrega
- `status` (TEXT) - Estado del pedido
- `source` (TEXT) - Origen (manual/stripe)
- `delivery_person_id` (UUID, FK) - Repartidor asignado
- `assigned_date` (DATE) - Fecha de asignación
- `notes` (TEXT) - Notas adicionales
- `stripe_session_id` (TEXT) - ID de sesión de Stripe
- `created_at`, `updated_at` (TIMESTAMP)

## 🔒 Seguridad

- Row Level Security (RLS) activado en todas las tablas
- Cada negocio solo puede acceder a sus propios datos
- Service Role Key solo se usa en el servidor de webhooks
- Autenticación mediante Supabase Auth
- Variables de entorno para secretos

## 🧪 Testing

```bash
# Ejecutar linter
npm run lint

# Build de producción
npm run build

# Preview del build
npm run preview
```

## 📱 Diseño Mobile-First

La aplicación está optimizada para dispositivos móviles:
- Menú hamburguesa en móvil
- Tablas con scroll horizontal
- Formularios optimizados para táctil
- Botones y elementos interactivos de tamaño apropiado

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
Verifica que tu archivo `.env` tenga las variables correctas y que Vite esté cargándolas (deben empezar con `VITE_`).

### Webhooks de Stripe no funcionan
1. Verifica que el servidor de webhooks esté corriendo (`npm run webhook:dev`)
2. Asegúrate de que Stripe CLI esté reenviando eventos correctamente
3. Revisa los logs del servidor para ver errores

### Error de RLS en Supabase
Asegúrate de haber ejecutado completamente la migración SQL que incluye las políticas RLS.

## 📄 Licencia

MIT

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría realizar.

## 📞 Soporte

Para reportar bugs o solicitar features, por favor abre un issue en el repositorio.

---

Hecho con ❤️ para negocios de delivery
