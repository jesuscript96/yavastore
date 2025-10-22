import { useEffect, useState } from 'react'
import { 
  TrendingUp, 
  Package, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useStatsStore } from '../store/statsStore'
import LoadingSpinner from '../components/LoadingSpinner'
import { format, subDays, subWeeks, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Statistics() {
  const { business } = useAuthStore()
  const { stats, loading, dateRange, setDateRange, fetchStats, getStatsForPeriod } = useStatsStore()
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  useEffect(() => {
    if (business?.id) {
      fetchStats(business.id)
    }
  }, [business?.id, fetchStats])

  const handlePeriodChange = async (period) => {
    setSelectedPeriod(period)
    if (business?.id) {
      await getStatsForPeriod(business.id, period)
    }
  }

  const handleDateRangeChange = (startDate, endDate) => {
    setDateRange({ start: startDate, end: endDate })
    if (business?.id) {
      fetchStats(business.id, { start: startDate, end: endDate })
    }
  }

  const periodOptions = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mes' },
    { value: 'custom', label: 'Personalizado' }
  ]

  const statsCards = [
    {
      name: 'Ventas Totales',
      value: `$${stats.totalSales?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100'
    },
    {
      name: 'Total Pedidos',
      value: stats.totalOrders || 0,
      icon: Package,
      color: 'text-info-600',
      bgColor: 'bg-primary-100'
    },
    {
      name: 'Pedidos Completados',
      value: stats.completedOrders || 0,
      icon: CheckCircle,
      color: 'text-success-600',
      bgColor: 'bg-success-100'
    },
    {
      name: 'Pedidos Pendientes',
      value: stats.pendingOrders || 0,
      icon: Clock,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100'
    }
  ]

  const deliveryPerformanceData = stats.deliveryPerformance?.map((person, index) => ({
    name: person.name,
    delivered: person.delivered,
    total: person.total,
    successRate: Math.round(person.successRate),
    fill: COLORS[index % COLORS.length]
  })) || []

  const topProductsData = stats.topProducts?.map((product, index) => ({
    name: product.name,
    quantity: product.quantity,
    fill: COLORS[index % COLORS.length]
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-gray-600">Análisis de rendimiento y ventas de tu negocio</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                selectedPeriod === option.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      {selectedPeriod === 'custom' && (
        <div className="card">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={format(dateRange.start, 'yyyy-MM-dd')}
                  onChange={(e) => handleDateRangeChange(new Date(e.target.value), dateRange.end)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={format(dateRange.end, 'yyyy-MM-dd')}
                  onChange={(e) => handleDateRangeChange(dateRange.start, new Date(e.target.value))}
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
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

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Productos Más Vendidos</h2>
            </div>
            <div className="card-body">
              {topProductsData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay datos de productos</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Performance */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Rendimiento de Repartidores</h2>
            </div>
            <div className="card-body">
              {deliveryPerformanceData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryPerformanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, delivered }) => `${name}: ${delivered}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="delivered"
                      >
                        {deliveryPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay datos de repartidores</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Tables */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Top 5 Productos</h2>
            </div>
            <div className="card-body">
              {stats.topProducts?.length > 0 ? (
                <div className="space-y-3">
                  {stats.topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-600">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{product.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{product.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Package className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay datos de productos</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Performance Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Rendimiento de Repartidores</h2>
            </div>
            <div className="card-body">
              {stats.deliveryPerformance?.length > 0 ? (
                <div className="space-y-3">
                  {stats.deliveryPerformance.map((person) => (
                    <div key={person.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{person.name}</p>
                        <p className="text-xs text-gray-500">
                          {person.delivered} de {person.total} pedidos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {Math.round(person.successRate)}%
                        </p>
                        <p className="text-xs text-gray-500">Éxito</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TrendingUp className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay datos de repartidores</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
