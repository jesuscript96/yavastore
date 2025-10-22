import { useEffect, useState } from 'react'
import { 
  Calendar, 
  User, 
  Package, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Truck,
  Plus
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useOrdersStore } from '../store/ordersStore'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import LoadingSpinner from '../components/LoadingSpinner'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const statusConfig = {
  pending: { label: 'Pendiente', color: 'badge-danger', icon: Clock },
  assigned: { label: 'Asignado', color: 'badge-warning', icon: User },
  in_route: { label: 'En Ruta', color: 'badge-info', icon: Truck },
  delivered: { label: 'Entregado', color: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'badge-danger', icon: AlertCircle }
}

export default function Assignments() {
  const { business } = useAuthStore()
  const { orders, fetchOrders, assignOrder } = useOrdersStore()
  const { deliveryPeople, fetchDeliveryPeople, getAvailableDeliveryPeople } = useDeliveryPeopleStore()
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('')
  const [assignedDate, setAssignedDate] = useState('')

  useEffect(() => {
    if (business?.id) {
      fetchOrders(business.id)
      fetchDeliveryPeople(business.id)
    }
  }, [business?.id, fetchOrders, fetchDeliveryPeople])

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }) // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getOrdersForDate = (date) => {
    return orders.filter(order => {
      const orderDate = new Date(order.delivery_time)
      return isSameDay(orderDate, date)
    })
  }

  const getUnassignedOrders = () => {
    return orders.filter(order => !order.delivery_person_id && order.status === 'pending')
  }

  const handleAssignOrder = (order) => {
    setSelectedOrder(order)
    setAssignedDate(format(new Date(order.delivery_time), 'yyyy-MM-dd'))
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (!selectedDeliveryPerson || !assignedDate) {
      toast.error('Selecciona un repartidor y fecha')
      return
    }

    setLoading(true)
    try {
      const { error } = await assignOrder(selectedOrder.id, selectedDeliveryPerson, assignedDate)
      if (error) {
        toast.error('Error al asignar el pedido')
      } else {
        toast.success('Pedido asignado correctamente')
        setShowAssignModal(false)
        setSelectedOrder(null)
        setSelectedDeliveryPerson('')
        setAssignedDate('')
      }
    } catch (error) {
      toast.error('Error al asignar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const getAvailablePeopleForOrder = (order) => {
    const orderDate = new Date(order.delivery_time)
    const orderTime = format(orderDate, 'HH:mm')
    return getAvailableDeliveryPeople(format(orderDate, 'yyyy-MM-dd'), orderTime)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignaciones</h1>
          <p className="text-gray-600">Gestiona las asignaciones de pedidos a repartidores</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="input"
          />
        </div>
      </div>

      {/* Unassigned Orders */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Pedidos Sin Asignar</h2>
        </div>
        <div className="card-body">
          {getUnassignedOrders().length > 0 ? (
            <div className="space-y-3">
              {getUnassignedOrders().map((order) => {
                const availablePeople = getAvailablePeopleForOrder(order)
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                          <p className="text-xs text-gray-500">{order.customer_phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">
                            {format(new Date(order.delivery_time), 'dd/MM HH:mm', { locale: es })}
                          </p>
                          <p className="text-xs text-gray-500">Entrega</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            ${order.total_amount?.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {availablePeople.length} repartidores disponibles
                      </span>
                      <button
                        onClick={() => handleAssignOrder(order)}
                        disabled={availablePeople.length === 0}
                        className="btn-primary"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Asignar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="mx-auto h-12 w-12 text-success-400" />
              <p className="mt-2 text-sm text-gray-500">Todos los pedidos están asignados</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">
            Vista Semanal - {format(weekStart, 'dd/MM', { locale: es })} - {format(weekEnd, 'dd/MM', { locale: es })}
          </h2>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header with days */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                    <p className="text-sm font-medium text-gray-900">
                      {format(day, 'EEE', { locale: es })}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {format(day, 'd')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Delivery people rows */}
              {deliveryPeople.filter(p => p.active).map((person) => (
                <div key={person.id} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
                  {weekDays.map((day) => {
                    const dayOrders = getOrdersForDate(day).filter(
                      order => order.delivery_person_id === person.id
                    )
                    
                    return (
                      <div key={`${person.id}-${day.toISOString()}`} className="p-2 border-r border-gray-200 last:border-r-0 min-h-[100px]">
                        <div className="space-y-1">
                          {dayOrders.map((order) => {
                            const statusInfo = statusConfig[order.status] || statusConfig.pending
                            const StatusIcon = statusInfo.icon
                            
                            return (
                              <div
                                key={order.id}
                                className="p-2 bg-gray-50 rounded text-xs border-l-4 border-primary-500"
                              >
                                <div className="flex items-center space-x-1 mb-1">
                                  <StatusIcon className="h-3 w-3" />
                                  <span className="font-medium truncate">{order.customer_name}</span>
                                </div>
                                <p className="text-gray-600 truncate">
                                  {format(new Date(order.delivery_time), 'HH:mm')}
                                </p>
                                <p className="text-gray-600 truncate">
                                  ${order.total_amount?.toLocaleString()}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Summary row */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {weekDays.map((day) => {
                  const dayOrders = getOrdersForDate(day)
                  const assignedOrders = dayOrders.filter(order => order.delivery_person_id)
                  const unassignedOrders = dayOrders.filter(order => !order.delivery_person_id)
                  
                  return (
                    <div key={`summary-${day.toISOString()}`} className="p-4 border-r border-gray-200 last:border-r-0 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-success-600" />
                          <span className="text-sm font-medium text-success-600">
                            {assignedOrders.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-danger-600" />
                          <span className="text-sm font-medium text-danger-600">
                            {unassignedOrders.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asignar Pedido</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{selectedOrder.customer_name}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(selectedOrder.delivery_time), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
                <p className="text-xs text-gray-500">${selectedOrder.total_amount?.toLocaleString()}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repartidor
                  </label>
                  <select
                    value={selectedDeliveryPerson}
                    onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                    className="input"
                  >
                    <option value="">Selecciona un repartidor</option>
                    {getAvailablePeopleForOrder(selectedOrder).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Asignación
                  </label>
                  <input
                    type="date"
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssign}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  Asignar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
