import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { Copy, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WebhookConfig() {
  const { user } = useAuthStore()
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState({ url: false, secret: false })

  useEffect(() => {
    fetchWebhookConfig()
  }, [])

  const fetchWebhookConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('stripe_webhook_secret')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      setWebhookSecret(data.stripe_webhook_secret || '')
      
      // Solo mostrar URL si hay un secret generado
      if (data.stripe_webhook_secret) {
        // Usar la URL de producción para Netlify Functions
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
        setWebhookUrl(`${baseUrl}/.netlify/functions/stripe-webhook?secret=${data.stripe_webhook_secret}`)
      } else {
        setWebhookUrl('')
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

  const saveWebhookSecret = async () => {
    if (!webhookSecret) {
      toast.error('Por favor ingresa un webhook secret')
      return
    }

    if (!webhookSecret.startsWith('whsec_')) {
      toast.error('El signing secret de Stripe debe empezar con "whsec_"')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ stripe_webhook_secret: webhookSecret })
        .eq('id', user.id)

      if (error) throw error
      
      // Actualizar la URL del webhook
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
      setWebhookUrl(`${baseUrl}/.netlify/functions/stripe-webhook?secret=${webhookSecret}`)
      
      toast.success('Webhook secret guardado correctamente')
    } catch (error) {
      console.error('Error saving webhook secret:', error)
      toast.error('Error al guardar el webhook secret')
    } finally {
      setLoading(false)
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
        {webhookSecret ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <AlertCircle className="w-5 h-5 text-yellow-500" />
        )}
      </div>
      
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stripe Signing Secret
          </label>
          <div className="flex">
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm"
              placeholder="Pega aquí el signing secret de Stripe (whsec_...)"
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
          <div className="mt-2 flex gap-2">
            <button
              onClick={saveWebhookSecret}
              disabled={!webhookSecret || loading}
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
              onClick={generateWebhookSecret}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generar Nuevo
            </button>
          </div>
          {webhookSecret && !webhookSecret.startsWith('whsec_') && (
            <p className="mt-1 text-sm text-yellow-600">
              ⚠️ El signing secret de Stripe debe empezar con "whsec_"
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Instrucciones paso a paso:</h4>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li><strong>Primero:</strong> Haz clic en "Generar Nuevo" arriba para crear tu webhook secret único</li>
          <li>Copia la <strong>URL del Webhook</strong> que se genera automáticamente</li>
          <li>Ve a tu <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">dashboard de Stripe</a></li>
          <li>Navega a <strong>"Desarrolladores"</strong> → <strong>"Webhooks"</strong></li>
          <li>Haz clic en <strong>"Agregar endpoint"</strong></li>
          <li>En "URL del endpoint", pega la <strong>URL del Webhook</strong> que copiaste</li>
          <li>En "Eventos para escuchar", selecciona: <code className="bg-blue-100 px-1 rounded">checkout.session.completed</code></li>
          <li>Haz clic en <strong>"Agregar endpoint"</strong></li>
          <li>Una vez creado, haz clic en el webhook que acabas de crear</li>
          <li>En la sección "Signing secret", haz clic en <strong>"Revelar"</strong></li>
          <li>Copia el secret de Stripe (empieza con <code>whsec_</code>) y pégalo en el campo "Stripe Signing Secret" de arriba</li>
          <li>Haz clic en <strong>"Guardar Secret"</strong> para completar la configuración</li>
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
