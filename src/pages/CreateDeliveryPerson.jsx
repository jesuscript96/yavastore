import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, User, Mail, Phone, Clock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const daysOfWeek = [
  { key: 0, label: 'Domingo' },
  { key: 1, label: 'Lunes' },
  { key: 2, label: 'Martes' },
  { key: 3, label: 'Miércoles' },
  { key: 4, label: 'Jueves' },
  { key: 5, label: 'Viernes' },
  { key: 6, label: 'Sábado' }
]

export default function CreateDeliveryPerson() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { business } = useAuthStore()
  const { createDeliveryPerson } = useDeliveryPeopleStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      schedule_config: {
        0: { enabled: false, start_time: '09:00', end_time: '18:00' },
        1: { enabled: true, start_time: '09:00', end_time: '18:00' },
        2: { enabled: true, start_time: '09:00', end_time: '18:00' },
        3: { enabled: true, start_time: '09:00', end_time: '18:00' },
        4: { enabled: true, start_time: '09:00', end_time: '18:00' },
        5: { enabled: true, start_time: '09:00', end_time: '18:00' },
        6: { enabled: false, start_time: '09:00', end_time: '18:00' }
      }
    }
  })

  const watchedSchedule = watch('schedule_config')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const deliveryPersonData = {
        business_id: business.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        schedule_config: data.schedule_config,
        active: true
      }

      const { error } = await createDeliveryPerson(deliveryPersonData)
      
      if (error) {
        toast.error('Error al crear el repartidor')
      } else {
        toast.success('Repartidor creado exitosamente')
        navigate('/delivery-people')
      }
    } catch (error) {
      toast.error('Error al crear el repartidor')
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleChange = (dayKey, field, value) => {
    const newSchedule = { ...watchedSchedule }
    newSchedule[dayKey] = { ...newSchedule[dayKey], [field]: value }
    setValue('schedule_config', newSchedule)
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setValue('password', password)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/delivery-people')}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Repartidor</h1>
          <p className="text-gray-600">Agrega un nuevo repartidor a tu equipo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Información Personal</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre Completo *
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('name', { required: 'El nombre es requerido' })}
                  type="text"
                  className={`input pl-10 ${errors.name ? 'input-error' : ''}`}
                  placeholder="Juan Pérez"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('email', { 
                    required: 'El email es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    }
                  })}
                  type="email"
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  placeholder="juan@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Teléfono *
              </label>
              <div className="mt-1 relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('phone', { 
                    required: 'El teléfono es requerido',
                    pattern: {
                      value: /^[0-9+\-\s()]+$/,
                      message: 'Formato de teléfono inválido'
                    }
                  })}
                  type="tel"
                  className={`input pl-10 ${errors.phone ? 'input-error' : ''}`}
                  placeholder="+1 234 567 8900"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-danger-600">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Credenciales de Acceso</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña *
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password', { 
                    required: 'La contraseña es requerida',
                    minLength: {
                      value: 6,
                      message: 'La contraseña debe tener al menos 6 caracteres'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className={`input pr-20 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    Generar
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Esta será la contraseña permanente del repartidor para acceder a la aplicación
              </p>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Horario de Trabajo</h2>
          </div>
          <div className="card-body space-y-4">
            <p className="text-sm text-gray-600">
              Configura los días y horarios en los que el repartidor estará disponible
            </p>
            
            <div className="space-y-3">
              {daysOfWeek.map((day) => (
                <div key={day.key} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={watchedSchedule[day.key]?.enabled || false}
                      onChange={(e) => handleScheduleChange(day.key, 'enabled', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700 min-w-[80px]">
                      {day.label}
                    </label>
                  </div>
                  
                  {watchedSchedule[day.key]?.enabled && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <input
                          type="time"
                          value={watchedSchedule[day.key]?.start_time || '09:00'}
                          onChange={(e) => handleScheduleChange(day.key, 'start_time', e.target.value)}
                          className="input text-sm"
                        />
                      </div>
                      <span className="text-gray-500">-</span>
                      <div className="flex items-center space-x-1">
                        <input
                          type="time"
                          value={watchedSchedule[day.key]?.end_time || '18:00'}
                          onChange={(e) => handleScheduleChange(day.key, 'end_time', e.target.value)}
                          className="input text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/delivery-people')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : null}
            Crear Repartidor
          </button>
        </div>
      </form>
    </div>
  )
}
