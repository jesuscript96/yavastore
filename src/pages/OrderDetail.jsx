import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  User, 
  MapPin, 
  Phone, 
  Clock, 
  Package,
  CheckCircle,
  AlertCircle,
  Truck,
  Calendar
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useOrdersStore } from '../store/ordersStore'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import LoadingSpinner from '../components/LoadingSpinner'
import AssignOrderModal from '../components/AssignOrderModal'
import EditAssignmentModal from '../components/EditAssignmentModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const statusConfig = {
  pending: { label: 'Pendiente', color: 'badge-danger', icon: Clock },
  assigned: { label: 'Asignado', color: 'badge-warning', icon: User },
  in_route: { label: 'En Ruta', color: 'badge-info', icon: Truck },
  delivered: { label: 'Entregado', color: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'badge-danger', icon: AlertCircle }
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business } = useAuthStore()
  const { orders, updateOrderStatus, assignOrder, unassignOrder } = useOrdersStore()
  const { deliveryPeople, fetchDeliveryPeople } = useDeliveryPeopleStore()
  const [loading, setLoading] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('')
  const [assignedDate, setAssignedDate] = useState('')

  const order = orders.find(o => o.id === id)

  useEffect(() => {
    if (business?.id) {
      fetchDeliveryPeople(business.id)
    }
  }, [business?.id, fetchDeliveryPeople])

  useEffect(() => {
    if (!order) {
      navigate('/orders')
    }
  }, [order, navigate])

  if (!order) {
    return <LoadingSpinner className="py-12" />
  }

  const statusInfo = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  const handleStatusChange = async (newStatus) => {
    setLoading(true)
    try {
      const { error } = await updateOrderStatus(order.id, newStatus)
      if (error) {
        toast.error('Error al actualizar el estado')
      } else {
        toast.success('Estado actualizado correctamente')
      }
    } catch (error) {
      toast.error('Error al actualizar el estado')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedDeliveryPerson || !assignedDate) {
      toast.error('Selecciona un repartidor y fecha')
      return
    }

    setLoading(true)
    try {
      const { error } = await assignOrder(order.id, selectedDeliveryPerson, assignedDate)
      if (error) {
        toast.error('Error al asignar el pedido')
      } else {
        toast.success('Pedido asignado correctamente')
        setShowAssignModal(false)
        setSelectedDeliveryPerson('')
        setAssignedDate('')
      }
    } catch (error) {
      toast.error('Error al asignar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    if (!confirm('¿Estás seguro de que quieres desasignar este pedido?')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await unassignOrder(order.id)
      if (error) {
        toast.error('Error al desasignar el pedido')
      } else {
        toast.success('Pedido desasignado correctamente')
      }
    } catch (error) {
      toast.error('Error al desasignar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const getNextStatus = () => {
    switch (order.status) {
      case 'pending': return 'assigned'
      case 'assigned': return 'in_route'
      case 'in_route': return 'delivered'
      default: return null
    }
  }

  const nextStatus = getNextStatus()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/orders')}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.id.slice(-8)}</h1>
            <p className="text-gray-600">
              Creado el {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`badge ${statusInfo.color} flex items-center`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Información del Cliente</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">Cliente</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.customer_phone}</p>
                  <p className="text-sm text-gray-500">Teléfono</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.customer_address}</p>
                  <p className="text-sm text-gray-500">Dirección de entrega</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Información de Entrega</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(order.delivery_time), 'dd/MM/yyyy', { locale: es })}
                  </p>
                  <p className="text-sm text-gray-500">Fecha de entrega</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(order.delivery_time), 'HH:mm', { locale: es })}
                  </p>
                  <p className="text-sm text-gray-500">Hora de entrega</p>
                </div>
              </div>

              {order.delivery_people && (
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.delivery_people.name}</p>
                    <p className="text-sm text-gray-500">Repartidor asignado</p>
                  </div>
                </div>
              )}

              {order.assigned_date && (
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(order.assigned_date), 'dd/MM/yyyy', { locale: es })}
                    </p>
                    <p className="text-sm text-gray-500">Fecha de asignación</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Productos</h2>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {order.products?.map((product, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">Cantidad: {product.quantity}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ${(product.quantity * product.price).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-primary-600">
                    ${order.total_amount?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">Notas</h2>
              </div>
              <div className="card-body">
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Acciones</h2>
            </div>
            <div className="card-body space-y-3">
              {!order.delivery_person_id && order.status === 'pending' && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="btn-primary w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Asignar Repartidor
                </button>
              )}

              {/* Edit Assignment Button - Only show for assigned orders in editable states */}
              {order.delivery_person_id && ['pending', 'assigned', 'in_route'].includes(order.status) && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Asignación
                </button>
              )}

              {/* Unassign Button - Only show for assigned orders in editable states */}
              {order.delivery_person_id && ['pending', 'assigned', 'in_route'].includes(order.status) && (
                <button
                  onClick={handleUnassign}
                  disabled={loading}
                  className="btn-danger w-full"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  Desasignar
                </button>
              )}

              {nextStatus && (
                <button
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={loading}
                  className="btn-success w-full"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  {nextStatus === 'assigned' ? 'Marcar como Asignado' :
                   nextStatus === 'in_route' ? 'Marcar como En Ruta' :
                   nextStatus === 'delivered' ? 'Marcar como Entregado' : ''}
                </button>
              )}

              {order.status === 'delivered' && (
                <div className="text-center py-2">
                  <CheckCircle className="h-8 w-8 text-success-600 mx-auto mb-2" />
                  <p className="text-sm text-success-600 font-medium">Pedido Entregado</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Info */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Información del Pedido</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">ID:</span>
                <span className="text-sm font-medium text-gray-900">#{order.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Origen:</span>
                <span className="text-sm font-medium text-gray-900">
                  {order.source === 'stripe' ? 'Stripe' : 'Manual'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Estado:</span>
                <span className={`badge ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      <AssignOrderModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        order={order}
      />

      {/* Edit Assignment Modal */}
      <EditAssignmentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        order={order}
      />
    </div>
  )
}
