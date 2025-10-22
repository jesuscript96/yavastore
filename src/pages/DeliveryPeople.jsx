import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Edit, 
  User, 
  Mail, 
  Phone, 
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function DeliveryPeople() {
  const { business } = useAuthStore()
  const { 
    deliveryPeople, 
    loading, 
    fetchDeliveryPeople, 
    toggleActive 
  } = useDeliveryPeopleStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    if (business?.id) {
      fetchDeliveryPeople(business.id)
    }
  }, [business?.id, fetchDeliveryPeople])

  const filteredPeople = deliveryPeople.filter(person => {
    const matchesSearch = !searchTerm || 
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.phone?.includes(searchTerm)
    
    const matchesStatus = showInactive || person.active
    
    return matchesSearch && matchesStatus
  })

  const handleToggleActive = async (personId) => {
    try {
      const { error } = await toggleActive(personId)
      if (error) {
        toast.error('Error al actualizar el estado')
      } else {
        toast.success('Estado actualizado correctamente')
      }
    } catch (error) {
      toast.error('Error al actualizar el estado')
    }
  }

  const formatSchedule = (scheduleConfig) => {
    if (!scheduleConfig) return 'Sin horario configurado'
    
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const activeDays = []
    
    Object.entries(scheduleConfig).forEach(([dayIndex, schedule]) => {
      if (schedule.enabled) {
        activeDays.push(`${days[dayIndex]} ${schedule.start_time}-${schedule.end_time}`)
      }
    })
    
    return activeDays.length > 0 ? activeDays.join(', ') : 'Sin horario configurado'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repartidores</h1>
          <p className="text-gray-600">Gestiona tu equipo de repartidores</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/delivery-people/new" className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Repartidor
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Show Inactive Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="showInactive" className="ml-2 text-sm text-gray-700">
                Mostrar inactivos
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery People List */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredPeople.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Repartidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPeople.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {person.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {person.id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{person.email}</div>
                        <div className="text-sm text-gray-500">{person.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {formatSchedule(person.schedule_config)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${person.active ? 'badge-success' : 'badge-danger'} flex items-center w-fit`}>
                          {person.active ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {person.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(person.created_at), 'dd/MM/yyyy', { locale: es })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleActive(person.id)}
                            className={`${
                              person.active 
                                ? 'text-danger-600 hover:text-danger-900' 
                                : 'text-success-600 hover:text-success-900'
                            }`}
                            title={person.active ? 'Desactivar' : 'Activar'}
                          >
                            {person.active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                          <Link
                            to={`/delivery-people/${person.id}/edit`}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay repartidores</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || !showInactive
                  ? 'No se encontraron repartidores con los filtros aplicados.'
                  : 'Comienza agregando tu primer repartidor.'
                }
              </p>
              {!searchTerm && showInactive && (
                <div className="mt-6">
                  <Link to="/delivery-people/new" className="btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Repartidor
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {deliveryPeople.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="card-body text-center">
              <p className="text-2xl font-bold text-primary-600">{deliveryPeople.length}</p>
              <p className="text-sm text-gray-500">Total Repartidores</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <p className="text-2xl font-bold text-success-600">
                {deliveryPeople.filter(p => p.active).length}
              </p>
              <p className="text-sm text-gray-500">Activos</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <p className="text-2xl font-bold text-danger-600">
                {deliveryPeople.filter(p => !p.active).length}
              </p>
              <p className="text-sm text-gray-500">Inactivos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
