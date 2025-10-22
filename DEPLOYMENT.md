# Guía de Deployment - Yava Delivery Management

Esta guía te ayudará a desplegar la aplicación Yava en diferentes plataformas de hosting.

## 📋 Pre-requisitos de Deployment

Antes de desplegar, asegúrate de tener:

1. ✅ Cuenta de Supabase configurada con:
   - Base de datos creada
   - Migración SQL ejecutada
   - API keys copiadas

2. ✅ Variables de entorno configuradas
3. ✅ (Opcional) Cuenta de Stripe con webhook configurado
4. ✅ Código en un repositorio Git (GitHub, GitLab, etc.)

## 🚀 Opción 1: Vercel (Recomendado)

Vercel es la forma más sencilla de desplegar una aplicación React + Vite con serverless functions.

### Paso 1: Preparar el proyecto

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login en Vercel
vercel login
```

### Paso 2: Configurar variables de entorno

Crea las variables de entorno en el dashboard de Vercel o mediante CLI:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
vercel env add VITE_APP_URL production
```

### Paso 3: Desplegar

```bash
# Deployment de prueba
vercel

# Deployment a producción
vercel --prod
```

### Configuración de Build en Vercel

El archivo `vercel.json` ya está configurado. Asegúrate de que contiene:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### URL del Webhook

Después del deployment, tu URL de webhook será:
```
https://tu-dominio.vercel.app/api/webhooks/stripe
```

## 🌐 Opción 2: Netlify

### Paso 1: Configurar Netlify

Crea un archivo `netlify.toml` en la raíz del proyecto:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Paso 2: Crear Netlify Function

Crea `netlify/functions/stripe.js`:

```javascript
const handler = require('../../api/webhooks/stripe').default

exports.handler = async (event, context) => {
  return handler(
    {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body
    },
    {
      status: (code) => ({
        send: (body) => ({
          statusCode: code,
          body: JSON.stringify(body)
        })
      }),
      json: (body) => ({
        statusCode: 200,
        body: JSON.stringify(body)
      })
    }
  )
}
```

### Paso 3: Deploy

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## 🐳 Opción 3: Docker + VPS

### Crear Dockerfile

```dockerfile
# Frontend build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Nginx para servir archivos estáticos
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Crear docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production

  webhook-server:
    build:
      context: .
      dockerfile: Dockerfile.webhook
    ports:
      - "3001:3001"
    env_file:
      - .env
    restart: unless-stopped
```

### Crear Dockerfile.webhook

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY api ./api
EXPOSE 3001
CMD ["node", "api/server.js"]
```

## ☁️ Opción 4: AWS (EC2 + S3 + CloudFront)

### Frontend en S3 + CloudFront

```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://tu-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Backend en EC2

```bash
# SSH a tu instancia EC2
ssh -i tu-key.pem ubuntu@tu-ip

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar repositorio
git clone tu-repo.git
cd yava

# Instalar dependencias
npm install

# Configurar PM2 para mantener el servidor activo
npm install -g pm2
pm2 start api/server.js --name "yava-webhook"
pm2 save
pm2 startup
```

## 🔒 Configuración Post-Deployment

### 1. Configurar HTTPS

En Vercel/Netlify, HTTPS es automático. Para VPS:

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com
```

### 2. Configurar Stripe Webhook

1. Ve a [Dashboard de Stripe → Webhooks](https://dashboard.stripe.com/webhooks)
2. Agrega un nuevo endpoint con tu URL de producción
3. Selecciona `checkout.session.completed`
4. Copia el Webhook Secret
5. Actualízalo en:
   - Variables de entorno de tu plataforma
   - Página de Configuración en la app

### 3. Configurar CORS (si es necesario)

En `api/server.js`, configura CORS para tu dominio:

```javascript
app.use(cors({
  origin: 'https://tu-dominio.com',
  credentials: true
}))
```

### 4. Monitoring y Logs

#### Vercel
```bash
vercel logs
```

#### Netlify
```bash
netlify logs
```

#### PM2 (VPS)
```bash
pm2 logs yava-webhook
pm2 monit
```

## 🔧 Troubleshooting

### Error: Webhook no funciona en producción

1. Verifica que `STRIPE_WEBHOOK_SECRET` esté configurado
2. Asegúrate de que la URL del webhook en Stripe sea correcta
3. Revisa los logs del servidor
4. Prueba el endpoint con `curl`:
   ```bash
   curl -X POST https://tu-dominio.com/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Error: Variables de entorno no se cargan

1. En Vercel/Netlify, asegúrate de que las variables empiecen con `VITE_` para el frontend
2. Re-deploy después de agregar variables de entorno
3. Verifica que las variables estén en el entorno correcto (production/preview)

### Error: Build falla

1. Verifica que todas las dependencias estén en `package.json`
2. Asegúrate de que `node_modules` no esté en el repositorio
3. Revisa los logs de build para ver el error específico

### Error: Supabase RLS bloquea queries

1. Verifica que las políticas RLS estén correctamente configuradas
2. Asegúrate de estar usando el `service_role_key` en el servidor de webhooks
3. El `anon_key` solo funciona con RLS activado

## 📊 Métricas y Performance

### Configurar Analytics

#### Google Analytics

Agrega a `index.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

#### Vercel Analytics

```bash
npm install @vercel/analytics
```

En `main.jsx`:
```javascript
import { Analytics } from '@vercel/analytics/react'

// En el render
<Analytics />
```

## 🔄 CI/CD

### GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🎯 Checklist de Deployment

- [ ] Base de datos de Supabase configurada y migración ejecutada
- [ ] Variables de entorno configuradas en la plataforma
- [ ] Build ejecutado exitosamente
- [ ] Aplicación desplegada y accesible
- [ ] HTTPS configurado
- [ ] Webhook de Stripe configurado (si aplica)
- [ ] DNS apuntando al dominio correcto
- [ ] Pruebas de funcionalidad realizadas
- [ ] Monitoring y logs configurados
- [ ] Backup de base de datos configurado

## 📞 Soporte

Para problemas durante el deployment, revisa:
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Netlify](https://docs.netlify.com)
- [Documentación de Supabase](https://supabase.com/docs)
- Issues en el repositorio del proyecto
