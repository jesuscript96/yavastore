import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export default function StripeSetupInstructions() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link 
          to="/settings" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Configuración
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Stripe - Guía Completa</h1>
        <p className="text-gray-600 mt-2">
          Aprende cómo conectar tu tienda de Stripe para recibir pedidos automáticamente
        </p>
      </div>
      
      <div className="space-y-6">
        {/* ¿Qué hace esta integración? */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-3">¿Qué hace esta integración?</h2>
              <p className="text-blue-800">
                Cuando un cliente completa un pedido en tu tienda de Stripe, automáticamente 
                se creará una orden en tu sistema de delivery. No necesitas hacer nada manualmente.
                Los pagos se procesan directamente en tu cuenta de Stripe, nosotros solo recibimos 
                la información del pedido para gestionar la entrega.
              </p>
            </div>
          </div>
        </div>

        {/* Paso 1: Configurar tienda en Stripe */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
            Configurar tu tienda en Stripe
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              Ve a tu <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                dashboard de Stripe <ExternalLink className="w-4 h-4" />
              </a>
            </li>
            <li>Configura tus productos y precios en la sección "Productos"</li>
            <li>Asegúrate de que tu tienda esté funcionando correctamente</li>
            <li>Prueba hacer una compra de prueba para verificar que todo funciona</li>
          </ol>
        </div>

        {/* Paso 2: Configurar el Webhook */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
            Generar tu Webhook Secret
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Ve a <strong>Configuración</strong> en tu panel de administración</li>
            <li>En la sección "Configuración de Webhook de Stripe"</li>
            <li>Haz clic en <strong>"Generar Secret"</strong> para crear tu webhook secret único</li>
            <li>
              Se generará automáticamente una URL como esta:
              <div className="mt-2 p-3 bg-gray-100 rounded border font-mono text-sm">
                https://tu-dominio.com/api/webhooks/stripe?secret=whsec_abc123def456
              </div>
            </li>
            <li>Copia esta <strong>URL del Webhook</strong> completa</li>
          </ol>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</span>
            Configurar el Webhook en Stripe
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>En tu dashboard de Stripe, ve a <strong>"Desarrolladores"</strong> → <strong>"Webhooks"</strong></li>
            <li>Haz clic en <strong>"Agregar endpoint"</strong></li>
            <li>En "URL del endpoint", pega la <strong>URL del Webhook</strong> que copiaste</li>
            <li>
              En "Eventos para escuchar", selecciona: 
              <code className="bg-gray-100 px-2 py-1 rounded ml-2">checkout.session.completed</code>
            </li>
            <li>Haz clic en <strong>"Agregar endpoint"</strong></li>
            <li>Una vez creado el webhook, haz clic en él para ver los detalles</li>
            <li>En la sección <strong>"Signing secret"</strong>, haz clic en <strong>"Revelar"</strong></li>
            <li>
              Copia el secret de Stripe (empieza con <code>whsec_</code>)
            </li>
          </ol>
        </div>

        {/* Paso 4: Configurar en el panel */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</span>
            Completar la configuración en tu panel
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Regresa a tu panel de administración</li>
            <li>En la sección "Configuración de Webhook de Stripe"</li>
            <li>Pega el <strong>Signing secret</strong> que copiaste de Stripe en el campo "Webhook Secret"</li>
            <li>Guarda la configuración</li>
            <li>¡Listo! Ya recibirás pedidos automáticamente</li>
          </ol>
        </div>

        {/* Flujo de trabajo */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-green-900 mb-3">¿Cómo funciona el flujo completo?</h2>
              <div className="space-y-3 text-green-800">
                <div className="flex items-start gap-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                  <p><strong>Cliente hace pedido:</strong> En tu tienda de Stripe (tu sitio web, app, etc.)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                  <p><strong>Pago procesado:</strong> Stripe procesa el pago directamente en tu cuenta</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                  <p><strong>Webhook enviado:</strong> Stripe envía notificación a tu sistema de delivery</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</span>
                  <p><strong>Orden creada:</strong> Automáticamente se crea en tu panel de delivery</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">5</span>
                  <p><strong>Asignar repartidor:</strong> Puedes asignar un repartidor desde tu panel</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información importante para metadatos */}
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-yellow-900 mb-3">Información importante para tus pedidos</h2>
              <p className="text-yellow-800 mb-3">
                Para que los pedidos se creen correctamente, asegúrate de incluir esta información 
                en los metadatos de tu checkout de Stripe:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-yellow-100 p-3 rounded">
                  <code className="text-yellow-900 font-semibold">customer_name</code>
                  <p className="text-yellow-800 text-sm mt-1">Nombre del cliente</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded">
                  <code className="text-yellow-900 font-semibold">customer_phone</code>
                  <p className="text-yellow-800 text-sm mt-1">Teléfono del cliente</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded">
                  <code className="text-yellow-900 font-semibold">customer_address</code>
                  <p className="text-yellow-800 text-sm mt-1">Dirección de entrega</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded">
                  <code className="text-yellow-900 font-semibold">delivery_time</code>
                  <p className="text-yellow-800 text-sm mt-1">Fecha/hora de entrega (opcional)</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded">
                  <code className="text-yellow-900 font-semibold">notes</code>
                  <p className="text-yellow-800 text-sm mt-1">Notas adicionales (opcional)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ejemplo de código */}
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Ejemplo de código para tu tienda</h2>
          <p className="text-gray-700 mb-4">
            Aquí tienes un ejemplo de cómo incluir los metadatos en tu checkout de Stripe:
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm">
{`// Ejemplo con Stripe.js
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [/* tus productos */],
  mode: 'payment',
  success_url: 'https://tu-tienda.com/success',
  cancel_url: 'https://tu-tienda.com/cancel',
  metadata: {
    customer_name: 'Juan Pérez',
    customer_phone: '+1234567890',
    customer_address: 'Calle Principal 123, Ciudad',
    delivery_time: '2024-01-15T18:00:00Z',
    notes: 'Entregar en la puerta principal'
  }
});`}
          </pre>
        </div>

        {/* Advertencias importantes */}
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-red-900 mb-3">⚠️ Advertencias importantes</h2>
              <ul className="list-disc list-inside space-y-2 text-red-800">
                <li>El webhook debe estar configurado correctamente para que funcione</li>
                <li>Si cambias la URL del webhook, actualiza la configuración en Stripe</li>
                <li>Los pedidos solo se crearán si el pago es exitoso</li>
                <li>Verifica que tu tienda de Stripe esté funcionando antes de configurar el webhook</li>
                <li>Los metadatos son opcionales, pero recomendados para mejor experiencia</li>
                <li>Mantén tu webhook secret seguro y no lo compartas</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Explicación de los secrets */}
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h2 className="text-xl font-semibold text-purple-900 mb-4">🔑 Entendiendo los Secrets</h2>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-gray-900 mb-2">1. Webhook Secret (que generas en tu panel):</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Se genera automáticamente cuando haces clic en "Generar Secret"</li>
                <li>Se incluye en la URL del webhook: <code>?secret=whsec_abc123</code></li>
                <li>Identifica tu negocio específico en nuestro sistema</li>
                <li>Se usa para saber qué negocio debe recibir el pedido</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-gray-900 mb-2">2. Signing Secret (que obtienes de Stripe):</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Se genera automáticamente por Stripe cuando creas el webhook</li>
                <li>Se usa para verificar que el webhook realmente viene de Stripe</li>
                <li>Debes copiarlo de Stripe y pegarlo en tu panel</li>
                <li>Garantiza la seguridad de la comunicación</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Detalles de la interfaz de Stripe */}
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Detalles de la interfaz de Stripe</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Al crear el webhook:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Verás un formulario con campos: "URL del endpoint" y "Eventos para escuchar"</li>
                <li>En "URL del endpoint" pegas la URL que copiaste de tu panel</li>
                <li>En "Eventos para escuchar" buscas y seleccionas "checkout.session.completed"</li>
                <li>Haces clic en "Agregar endpoint"</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Después de crear el webhook:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Verás una lista de webhooks creados</li>
                <li>Haz clic en el webhook que acabas de crear</li>
                <li>En la página de detalles, busca la sección "Signing secret"</li>
                <li>Haz clic en "Revelar" para mostrar el secret</li>
                <li>Copia el secret (empieza con whsec_)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Enlaces útiles */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Enlaces útiles</h2>
          <div className="space-y-2">
            <a 
              href="https://dashboard.stripe.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4" />
              Dashboard de Stripe
            </a>
            <a 
              href="https://stripe.com/docs/webhooks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4" />
              Documentación de Webhooks de Stripe
            </a>
            <a 
              href="https://stripe.com/docs/checkout" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4" />
              Documentación de Checkout de Stripe
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
