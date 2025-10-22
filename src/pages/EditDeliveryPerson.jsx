import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, User, Mail, Phone, Clock, Save, Trash2 } from 'lucide-react'
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

export default function EditDeliveryPerson() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { id } = useParams()
  const { business } = useAuthStore()
  const { deliveryPeople, fetchDeliveryPeople, updateDeliveryPerson } = useDeliveryPeopleStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      active: true,
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

  useEffect(() => {
    const loadDeliveryPerson = async () => {
      if (business?.id) {
        await fetchDeliveryPeople(business.id)
        const person = deliveryPeople.find(p => p.id === id)

        if (person) {
          reset({
            name: person.name,
            email: person.email,
            phone: person.phone,
            active: person.active,
            schedule_config: person.schedule_config || {
              0: { enabled: false, start_time: '09:00', end_time: '18:00' },
              1: { enabled: true, start_time: '09:00', end_time: '18:00' },
              2: { enabled: true, start_time: '09:00', end_time: '18:00' },
              3: { enabled: true, start_time: '09:00', end_time: '18:00' },
              4: { enabled: true, start_time: '09:00', end_time: '18:00' },
              5: { enabled: true, start_time: '09:00', end_time: '18:00' },
              6: { enabled: false, start_time: '09:00', end_time: '18:00' }
            }
          })
          setLoading(false)
        } else {
          toast.error('Repartidor no encontrado')
          navigate('/delivery-people')
        }
      }
    }

    loadDeliveryPerson()
  }, [id, business?.id, deliveryPeople, fetchDeliveryPeople, reset, navigate])

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const updates = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        active: data.active,
        schedule_config: data.schedule_config
      }

      const { error } = await updateDeliveryPerson(id, updates)

      if (error) {
        toast.error('Error al actualizar el repartidor')
      } else {
        toast.success('Repartidor actualizado exitosamente')
        navigate('/delivery-people')
      }
    } catch (error) {
      toast.error('Error al actualizar el repartidor')
    } finally {
      setSaving(false)
    }
  }

  const handleScheduleChange = (dayKey, field, value) => {
    const newSchedule = { ...watchedSchedule }
    newSchedule[dayKey] = { ...newSchedule[dayKey], [field]: value }
    setValue('schedule_config', newSchedule, { shouldDirty: true })
  }

  const handleToggleActive = async () => {
    const currentActive = watch('active')
    setValue('active', !currentActive, { shouldDirty: true })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Editar Repartidor</h1>
          <p className="text-gray-600">Actualiza la información del repartidor</p>
        </div>
        <div>
          <button
            type="button"
            onClick={handleToggleActive}
            className={`px-4 py-2 rounded-lg font-medium ${
              watch('active')
                ? 'bg-success-100 text-success-800 hover:bg-success-200'
                : 'bg-danger-100 text-danger-800 hover:bg-danger-200'
            }`}
          >
            {watch('active') ? 'Activo' : 'Inactivo'}
          </button>
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
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate('/delivery-people')}
            className="btn-secondary"
          >
            Cancelar
          </button>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => reset()}
              disabled={!isDirty || saving}
              className="btn-secondary"
            >
              Descartar Cambios
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="btn-primary"
            >
              {saving ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Cambios
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
