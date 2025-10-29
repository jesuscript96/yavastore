import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useOrdersStore } from '../store/ordersStore'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import { useStatsStore } from '../store/statsStore'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Dashboard() {
  const business = useAuthStore(state => state.business)
  const orders = useOrdersStore(state => state.orders)
  const fetchOrders = useOrdersStore(state => state.fetchOrders)
  const deliveryPeople = useDeliveryPeopleStore(state => state.deliveryPeople)
  const fetchDeliveryPeople = useDeliveryPeopleStore(state => state.fetchDeliveryPeople)
  const stats = useStatsStore(state => state.stats)
  const fetchStats = useStatsStore(state => state.fetchStats)
  const statsLoading = useStatsStore(state => state.loading)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (business?.id) {
      setLoading(true)
      await Promise.all([
        fetchOrders(business.id),
        fetchDeliveryPeople(business.id),
        fetchStats(business.id)
      ])
      setLoading(false)
    }
  }, [business?.id, fetchOrders, fetchDeliveryPeople, fetchStats])

  useEffect(() => {
    loadData()
  }, [loadData])

  const todayOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.delivery_time)
      const today = new Date()
      return orderDate.toDateString() === today.toDateString()
    })
  }, [orders])

  const pendingOrders = useMemo(() => 
    orders.filter(order => order.status === 'pending'), [orders]
  )
  
  const assignedOrders = useMemo(() => 
    orders.filter(order => order.status === 'assigned'), [orders]
  )
  
  const inRouteOrders = useMemo(() => 
    orders.filter(order => order.status === 'in_route'), [orders]
  )
  
  const deliveredToday = useMemo(() => 
    todayOrders.filter(order => order.status === 'delivered'), [todayOrders]
  )

  const quickStats = useMemo(() => [
    {
      name: 'Pedidos Hoy',
      value: todayOrders.length,
      icon: Calendar,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100'
    },
    {
      name: 'Pendientes',
      value: pendingOrders.length,
      icon: Clock,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100'
    },
    {
      name: 'En Ruta',
      value: inRouteOrders.length,
      icon: Package,
      color: 'text-info-600',
      bgColor: 'bg-primary-100'
    },
    {
      name: 'Entregados Hoy',
      value: deliveredToday.length,
      icon: CheckCircle,
      color: 'text-success-600',
      bgColor: 'bg-success-100'
    }
  ], [todayOrders.length, pendingOrders.length, inRouteOrders.length, deliveredToday.length])

  const quickActions = useMemo(() => [
    {
      name: 'Nuevo Pedido',
      href: '/orders/new',
      icon: Plus,
      color: 'bg-primary-600 hover:bg-primary-700'
    },
    {
      name: 'Ver Pedidos',
      href: '/orders',
      icon: Package,
      color: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      name: 'Asignaciones',
      href: '/assignments',
      icon: Calendar,
      color: 'bg-success-600 hover:bg-success-700'
    },
    {
      name: 'Repartidores',
      href: '/delivery-people',
      icon: Users,
      color: 'bg-warning-600 hover:bg-warning-700'
    }
  ], [])

  if (loading) {
    return <LoadingSpinner className="py-12" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Hola, {business?.name}!
        </h1>
        <p className="text-gray-600">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Acciones Rápidas</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className={`${action.color} text-white rounded-lg p-4 flex items-center justify-center space-x-2 transition-colors`}
              >
                <action.icon className="h-5 w-5" />
                <span className="font-medium">{action.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Pedidos Recientes</h2>
            <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-500">
              Ver todos
            </Link>
          </div>
          <div className="card-body">
            {orders.slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.delivery_time), 'dd/MM HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${
                        order.status === 'delivered' ? 'badge-success' :
                        order.status === 'in_route' ? 'badge-info' :
                        order.status === 'assigned' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {order.status === 'delivered' ? 'Entregado' :
                         order.status === 'in_route' ? 'En Ruta' :
                         order.status === 'assigned' ? 'Asignado' :
                         'Pendiente'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        ${order.total_amount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay pedidos recientes</p>
                <Link to="/orders/new" className="btn-primary mt-2">
                  Crear primer pedido
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Delivery People Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Repartidores</h2>
            <Link to="/delivery-people" className="text-sm text-primary-600 hover:text-primary-500">
              Gestionar
            </Link>
          </div>
          <div className="card-body">
            {deliveryPeople.length > 0 ? (
              <div className="space-y-3">
                {deliveryPeople.slice(0, 5).map((person) => (
                  <div key={person.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{person.name}</p>
                      <p className="text-xs text-gray-500">{person.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${person.active ? 'badge-success' : 'badge-danger'}`}>
                        {person.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay repartidores registrados</p>
                <Link to="/delivery-people/new" className="btn-primary mt-2">
                  Agregar repartidor
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {!statsLoading && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Resumen de Ventas</h2>
            <Link to="/statistics" className="text-sm text-primary-600 hover:text-primary-500">
              Ver estadísticas completas
            </Link>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">
                  ${stats.totalSales?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-500">Ventas Totales</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success-600">
                  {stats.completedOrders || 0}
                </p>
                <p className="text-sm text-gray-500">Pedidos Completados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning-600">
                  {stats.pendingOrders || 0}
                </p>
                <p className="text-sm text-gray-500">Pedidos Pendientes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
