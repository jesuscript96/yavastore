import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'
import { useOrdersStore } from '../store/ordersStore'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const statusConfig = {
  pending: { label: 'Pendiente', color: 'badge-danger', icon: Clock },
  assigned: { label: 'Asignado', color: 'badge-warning', icon: User },
  in_route: { label: 'En Ruta', color: 'badge-info', icon: Truck },
  delivered: { label: 'Entregado', color: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'badge-danger', icon: AlertCircle }
}

export default function Orders() {
  const { business } = useAuthStore()
  const { 
    orders, 
    loading, 
    filters, 
    setFilters, 
    clearFilters,
    fetchOrders 
  } = useOrdersStore()
  const { deliveryPeople, fetchDeliveryPeople } = useDeliveryPeopleStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { register, watch, setValue } = useForm({
    defaultValues: filters
  })

  const watchedFilters = watch()

  useEffect(() => {
    if (business?.id) {
      fetchOrders(business.id)
      fetchDeliveryPeople(business.id)
    }
  }, [business?.id, fetchOrders, fetchDeliveryPeople])

  useEffect(() => {
    setFilters(watchedFilters)
  }, [watchedFilters, setFilters])

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.customer_phone?.includes(searchTerm) ||
        order.customer_address?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const handleStatusChange = async (orderId, newStatus) => {
    // This would be implemented with the updateOrderStatus function
    console.log('Update order status:', orderId, newStatus)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">Gestiona todos los pedidos de tu negocio</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/orders/new" className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pedido
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, teléfono o dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  {...register('status')}
                  className="input"
                >
                  <option value="">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="assigned">Asignado</option>
                  <option value="in_route">En Ruta</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  {...register('date')}
                  type="date"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repartidor
                </label>
                <select
                  {...register('deliveryPersonId')}
                  className="input"
                >
                  <option value="">Todos los repartidores</option>
                  {deliveryPeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="btn-secondary"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Repartidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => {
                    const statusInfo = statusConfig[order.status] || statusConfig.pending
                    const StatusIcon = statusInfo.icon

                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.customer_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customer_phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(order.delivery_time), 'dd/MM/yyyy', { locale: es })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(order.delivery_time), 'HH:mm')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${statusInfo.color} flex items-center w-fit`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.delivery_people?.name || 'Sin asignar'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${order.total_amount?.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/orders/${order.id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Ver detalles
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pedidos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? 'No se encontraron pedidos con los filtros aplicados.'
                  : 'Comienza creando tu primer pedido.'
                }
              </p>
              {!searchTerm && !Object.values(filters).some(f => f) && (
                <div className="mt-6">
                  <Link to="/orders/new" className="btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Pedido
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
