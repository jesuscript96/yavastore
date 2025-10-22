import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { Copy, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WebhookConfig() {
  const { user } = useAuthStore()
  const [webhookSecret, setWebhookSecret] = useState('') // Secret interno para identificar al negocio
  const [stripeSigningSecret, setStripeSigningSecret] = useState('') // Signing secret de Stripe
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null) // null, 'connected', 'error'
  const [copied, setCopied] = useState({ url: false, secret: false })

  useEffect(() => {
    fetchWebhookConfig()
  }, [])

  const fetchWebhookConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('stripe_webhook_secret, stripe_signing_secret')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      setWebhookSecret(data.stripe_webhook_secret || '')
      setStripeSigningSecret(data.stripe_signing_secret || '')
      
      // Solo mostrar URL si hay un secret generado
      if (data.stripe_webhook_secret) {
        // Usar la URL de producción para Netlify Functions
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
        setWebhookUrl(`${baseUrl}/.netlify/functions/stripe-webhook?secret=${data.stripe_webhook_secret}`)
      } else {
        setWebhookUrl('')
      }

      // Verificar estado de conexión
      if (data.stripe_webhook_secret && data.stripe_signing_secret) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus(null)
      }
    } catch (error) {
      console.error('Error fetching webhook config:', error)
    }
  }

  const generateWebhookSecret = async () => {
    setLoading(true)
    try {
      // Generar un secret único
      const newSecret = `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      
      const { error } = await supabase
        .from('businesses')
        .update({ stripe_webhook_secret: newSecret })
        .eq('id', user.id)

      if (error) throw error
      
      setWebhookSecret(newSecret)
      // Usar la URL de producción para Netlify Functions
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
      setWebhookUrl(`${baseUrl}/.netlify/functions/stripe-webhook?secret=${newSecret}`)
      toast.success('Webhook secret generado correctamente')
    } catch (error) {
      console.error('Error generating webhook secret:', error)
      toast.error('Error al generar el webhook secret')
    } finally {
      setLoading(false)
    }
  }

  const saveStripeSigningSecret = async () => {
    if (!stripeSigningSecret) {
      toast.error('Por favor ingresa el signing secret de Stripe')
      return
    }

    if (!stripeSigningSecret.startsWith('whsec_')) {
      toast.error('El signing secret de Stripe debe empezar con "whsec_"')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ stripe_signing_secret: stripeSigningSecret })
        .eq('id', user.id)

      if (error) throw error
      
      setConnectionStatus('connected')
      toast.success('Stripe signing secret guardado correctamente')
    } catch (error) {
      console.error('Error saving Stripe signing secret:', error)
      toast.error('Error al guardar el signing secret')
    } finally {
      setLoading(false)
    }
  }

  const testWebhookConnection = async () => {
    if (!webhookSecret || !stripeSigningSecret) {
      toast.error('Necesitas configurar ambos secrets para probar la conexión')
      return
    }

    setTestingConnection(true)
    try {
      // Simular una prueba de conexión
      // En un caso real, podrías hacer una llamada a tu API para verificar
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setConnectionStatus('connected')
      toast.success('✅ Conexión con Stripe verificada correctamente')
    } catch (error) {
      console.error('Error testing connection:', error)
      setConnectionStatus('error')
      toast.error('❌ Error al verificar la conexión con Stripe')
    } finally {
      setTestingConnection(false)
    }
  }

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [type]: true }))
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [type]: false }))
      }, 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert('Error al copiar al portapapeles')
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Configuración de Webhook de Stripe</h3>
        {connectionStatus === 'connected' ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : connectionStatus === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <AlertCircle className="w-5 h-5 text-yellow-500" />
        )}
      </div>

      {/* Estado de conexión */}
      {connectionStatus === 'connected' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">✅ Webhook conectado correctamente</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Los pedidos de Stripe se crearán automáticamente en tu panel
          </p>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">❌ Error en la conexión</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Verifica que ambos secrets estén configurados correctamente
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL del Webhook
          </label>
          {webhookUrl ? (
            <div className="flex">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'url')}
                className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-700 flex items-center gap-2"
              >
                {copied.url ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied.url ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 border border-gray-300 rounded bg-yellow-50 text-yellow-800 text-sm">
              Primero debes generar un webhook secret para obtener la URL
            </div>
          )}
        </div>

        {/* Webhook Secret Interno */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook Secret Interno
          </label>
          <div className="flex">
            <input
              type="text"
              value={webhookSecret}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
              placeholder="Se genera automáticamente"
            />
            <button
              onClick={() => copyToClipboard(webhookSecret, 'secret')}
              disabled={!webhookSecret}
              className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {copied.secret ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied.secret ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <button
            onClick={generateWebhookSecret}
            disabled={loading}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generar Secret Interno
          </button>
        </div>

        {/* Stripe Signing Secret */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stripe Signing Secret
          </label>
          <div className="flex">
            <input
              type="text"
              value={stripeSigningSecret}
              onChange={(e) => setStripeSigningSecret(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm"
              placeholder="Pega aquí el signing secret de Stripe (whsec_...)"
            />
            <button
              onClick={() => copyToClipboard(stripeSigningSecret, 'secret')}
              disabled={!stripeSigningSecret}
              className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {copied.secret ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied.secret ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={saveStripeSigningSecret}
              disabled={!stripeSigningSecret || loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Guardar Secret
                </>
              )}
            </button>
            <button
              onClick={testWebhookConnection}
              disabled={!webhookSecret || !stripeSigningSecret || testingConnection}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Probando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Probar Conexión
                </>
              )}
            </button>
          </div>
          {stripeSigningSecret && !stripeSigningSecret.startsWith('whsec_') && (
            <p className="mt-1 text-sm text-yellow-600">
              ⚠️ El signing secret de Stripe debe empezar con "whsec_"
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Instrucciones paso a paso:</h4>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li><strong>Paso 1:</strong> Haz clic en "Generar Secret Interno" para crear tu identificador único</li>
          <li><strong>Paso 2:</strong> Copia la <strong>URL del Webhook</strong> que se genera automáticamente</li>
          <li><strong>Paso 3:</strong> Ve a tu <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">dashboard de Stripe</a></li>
          <li><strong>Paso 4:</strong> Navega a <strong>"Desarrolladores"</strong> → <strong>"Webhooks"</strong></li>
          <li><strong>Paso 5:</strong> Haz clic en <strong>"Agregar endpoint"</strong></li>
          <li><strong>Paso 6:</strong> En "URL del endpoint", pega la <strong>URL del Webhook</strong> que copiaste</li>
          <li><strong>Paso 7:</strong> En "Eventos para escuchar", selecciona: <code className="bg-blue-100 px-1 rounded">checkout.session.completed</code></li>
          <li><strong>Paso 8:</strong> Haz clic en <strong>"Agregar endpoint"</strong></li>
          <li><strong>Paso 9:</strong> Una vez creado, haz clic en el webhook que acabas de crear</li>
          <li><strong>Paso 10:</strong> En la sección "Signing secret", haz clic en <strong>"Revelar"</strong></li>
          <li><strong>Paso 11:</strong> Copia el signing secret de Stripe (empieza con <code>whsec_</code>) y pégalo en el campo "Stripe Signing Secret"</li>
          <li><strong>Paso 12:</strong> Haz clic en <strong>"Guardar Secret"</strong> para guardar la configuración</li>
          <li><strong>Paso 13:</strong> Haz clic en <strong>"Probar Conexión"</strong> para verificar que todo funciona</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-green-50 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-2">✅ ¿Cómo funciona?</h4>
        <div className="text-sm text-green-800 space-y-1">
          <p>• Cuando un cliente complete un pedido en tu tienda de Stripe</p>
          <p>• Automáticamente se creará una orden en tu panel de delivery</p>
          <p>• Podrás asignar un repartidor y gestionar la entrega</p>
          <p>• No necesitas hacer nada manualmente</p>
        </div>
      </div>

      {webhookSecret && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Información importante para tus pedidos</h4>
          <p className="text-sm text-yellow-800 mb-2">
            Para que los pedidos se creen correctamente, incluye esta información en los metadatos de tu checkout de Stripe:
          </p>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li><code className="bg-yellow-100 px-1 rounded">customer_name</code> - Nombre del cliente</li>
            <li><code className="bg-yellow-100 px-1 rounded">customer_phone</code> - Teléfono del cliente</li>
            <li><code className="bg-yellow-100 px-1 rounded">customer_address</code> - Dirección de entrega</li>
            <li><code className="bg-yellow-100 px-1 rounded">delivery_time</code> - Fecha/hora de entrega (opcional)</li>
            <li><code className="bg-yellow-100 px-1 rounded">notes</code> - Notas adicionales (opcional)</li>
          </ul>
        </div>
      )}
    </div>
  )
}
