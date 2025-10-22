import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Save,
  Key,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Copy,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import WebhookConfig from '../components/WebhookConfig'
import toast from 'react-hot-toast'

export default function Settings() {
  const { business, updateBusiness } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm({
    defaultValues: {
      name: business?.name || '',
      email: business?.email || '',
      stripe_webhook_secret: business?.stripe_webhook_secret || '',
      stripe_publishable_key: business?.stripe_publishable_key || ''
    }
  })

  useEffect(() => {
    if (business) {
      reset({
        name: business.name || '',
        email: business.email || '',
        stripe_webhook_secret: business.stripe_webhook_secret || '',
        stripe_publishable_key: business.stripe_publishable_key || ''
      })
    }
  }, [business, reset])

  useEffect(() => {
    // Generate webhook URL based on environment
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
    setWebhookUrl(`${appUrl}/api/webhooks/stripe`)
  }, [])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { error } = await updateBusiness(data)
      if (error) {
        toast.error('Error al actualizar la configuración')
      } else {
        toast.success('Configuración actualizada correctamente')
        reset(data)
      }
    } catch (error) {
      toast.error('Error al actualizar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra la configuración de tu negocio</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Information */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2 text-gray-500" />
              <h2 className="text-lg font-medium text-gray-900">Información del Negocio</h2>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre del Negocio
              </label>
              <input
                {...register('name', { required: 'El nombre es requerido' })}
                type="text"
                className={`input mt-1 ${errors.name ? 'input-error' : ''}`}
                placeholder="Mi Negocio"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email del Negocio
              </label>
              <input
                {...register('email', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido'
                  }
                })}
                type="email"
                className={`input mt-1 ${errors.email ? 'input-error' : ''}`}
                placeholder="contacto@minegocio.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stripe Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
              <h2 className="text-lg font-medium text-gray-900">Configuración de Stripe</h2>
            </div>
            <Link 
              to="/stripe-instructions" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Ver instrucciones completas
            </Link>
          </div>
          
          <WebhookConfig />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty || loading}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Descartar Cambios
          </button>
          <button
            type="submit"
            disabled={!isDirty || loading}
            className="btn-primary"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  )
}
