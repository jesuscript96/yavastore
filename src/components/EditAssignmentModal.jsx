import { useState, useEffect } from 'react'
import { X, User, Calendar, Clock, Package, AlertTriangle } from 'lucide-react'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import { useOrdersStore } from '../store/ordersStore'
import toast from 'react-hot-toast'

// Time range options
const TIME_RANGES = [
  { label: 'Cualquiera', value: null, startTime: null, endTime: null },
  { label: '9:00 - 11:00', value: '9-11', startTime: '09:00', endTime: '11:00' },
  { label: '11:00 - 13:00', value: '11-13', startTime: '11:00', endTime: '13:00' },
  { label: '13:00 - 15:00', value: '13-15', startTime: '13:00', endTime: '15:00' },
  { label: '15:00 - 17:00', value: '15-17', startTime: '15:00', endTime: '17:00' },
  { label: '17:00 - 19:00', value: '17-19', startTime: '17:00', endTime: '19:00' },
  { label: '19:00 - 21:00', value: '19-21', startTime: '19:00', endTime: '21:00' }
]

export default function EditAssignmentModal({ 
  isOpen, 
  onClose, 
  order 
}) {
  const { deliveryPeople } = useDeliveryPeopleStore()
  const { assignOrder, unassignOrder } = useOrdersStore()
  
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('')
  const [assignedDate, setAssignedDate] = useState('')
  const [selectedTimeRange, setSelectedTimeRange] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && order) {
      // Pre-load current assignment values
      setSelectedDeliveryPerson(order.delivery_person_id || '')
      setAssignedDate(order.assigned_date || new Date().toISOString().split('T')[0])
      
      // Find current time range
      const currentTimeRange = TIME_RANGES.find(range => 
        range.startTime === order.assigned_delivery_start_time && 
        range.endTime === order.assigned_delivery_end_time
      )
      setSelectedTimeRange(currentTimeRange?.value || '')
      
      setShowUnassignConfirm(false)
    }
  }, [isOpen, order])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedDeliveryPerson || !assignedDate) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    
    try {
      const timeRange = TIME_RANGES.find(range => range.value === selectedTimeRange)
      
      console.log('🚀 Updating assignment:', {
        orderId: order.id,
        deliveryPersonId: selectedDeliveryPerson,
        assignedDate,
        startTime: timeRange?.startTime,
        endTime: timeRange?.endTime
      })

      const { error } = await assignOrder(
        order.id,
        selectedDeliveryPerson,
        assignedDate,
        timeRange?.startTime,
        timeRange?.endTime
      )

      if (error) {
        console.error('❌ Assignment update error:', error)
        toast.error('Error al actualizar la asignación')
      } else {
        console.log('✅ Assignment updated successfully')
        toast.success('Asignación actualizada exitosamente')
        onClose()
      }
    } catch (error) {
      console.error('💥 Assignment update failed:', error)
      toast.error('Error al actualizar la asignación')
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    setLoading(true)
    
    try {
      const { error } = await unassignOrder(order.id)

      if (error) {
        console.error('❌ Unassignment error:', error)
        toast.error('Error al desasignar el pedido')
      } else {
        console.log('✅ Order unassigned successfully')
        toast.success('Pedido desasignado exitosamente')
        onClose()
      }
    } catch (error) {
      console.error('💥 Unassignment failed:', error)
      toast.error('Error al desasignar el pedido')
    } finally {
      setLoading(false)
    }
  }

  // Get all active delivery people for assignment
  const availableDeliveryPeople = deliveryPeople.filter(person => person.active)

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Editar Asignación
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Order Info */}
        <div className="p-6 border-b bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-2">Información del Pedido</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Cliente:</strong> {order.customer_name}</p>
            <p><strong>Dirección:</strong> {order.customer_address}</p>
            <p><strong>Total:</strong> ${order.total_amount}</p>
            <p><strong>Productos:</strong> {order.products?.length || 0} items</p>
          </div>
          
          {/* Current Assignment Info */}
          {order.delivery_people && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Asignación Actual</h4>
              <div className="text-sm text-blue-800">
                <p><strong>Repartidor:</strong> {order.delivery_people.name}</p>
                {order.assigned_date && (
                  <p><strong>Fecha:</strong> {new Date(order.assigned_date).toLocaleDateString('es-ES')}</p>
                )}
                {order.assigned_delivery_start_time && order.assigned_delivery_end_time && (
                  <p><strong>Horario:</strong> {order.assigned_delivery_start_time} - {order.assigned_delivery_end_time}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Unassign Confirmation */}
        {showUnassignConfirm ? (
          <div className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¿Desasignar Pedido?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Esta acción eliminará la asignación actual y el pedido volverá al estado "Pendiente".
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUnassignConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnassign}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Desasignando...
                    </>
                  ) : (
                    'Desasignar'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Delivery Person Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Repartidor *
              </label>
              <select
                value={selectedDeliveryPerson}
                onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Selecciona un repartidor</option>
                {availableDeliveryPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} - {person.email}
                  </option>
                ))}
              </select>
              {availableDeliveryPeople.length === 0 && (
                <p className="mt-1 text-sm text-yellow-600">
                  ⚠️ No hay repartidores disponibles. Crea uno primero.
                </p>
              )}
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Fecha de Entrega *
              </label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Time Range Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Rango Horario
              </label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {TIME_RANGES.map((range) => (
                  <option key={range.value || 'anytime'} value={range.value || ''}>
                    {range.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Selecciona un rango horario específico o "Cualquiera" para flexibilidad
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUnassignConfirm(true)}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                >
                  Desasignar
                </button>
                <button
                  type="submit"
                  disabled={loading || availableDeliveryPeople.length === 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Asignación'
                  )}
                </button>
              </div>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
