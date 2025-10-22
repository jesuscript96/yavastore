import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStatsStore = create((set, get) => ({
  stats: {
    totalSales: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    topProducts: [],
    deliveryPerformance: []
  },
  loading: false,
  dateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  },

  // Fetch statistics
  fetchStats: async (businessId, dateRange = null) => {
    set({ loading: true })
    try {
      const range = dateRange || get().dateRange
      const startDate = range.start.toISOString()
      const endDate = range.end.toISOString()

      // Fetch basic stats
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status, products')
        .eq('business_id', businessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (ordersError) throw ordersError

      // Calculate basic stats
      const totalSales = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const totalOrders = ordersData.length
      const completedOrders = ordersData.filter(order => order.status === 'delivered').length
      const pendingOrders = ordersData.filter(order => ['pending', 'assigned', 'in_route'].includes(order.status)).length

      // Calculate top products
      const productCounts = {}
      ordersData.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
          order.products.forEach(product => {
            const key = product.name || 'Producto sin nombre'
            productCounts[key] = (productCounts[key] || 0) + (product.quantity || 1)
          })
        }
      })

      const topProducts = Object.entries(productCounts)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      // Fetch delivery performance
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('orders')
        .select(`
          delivery_person_id,
          status,
          delivery_people (
            id,
            name
          )
        `)
        .eq('business_id', businessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('delivery_person_id', 'is', null)

      if (deliveryError) throw deliveryError

      const deliveryPerformance = {}
      deliveryData.forEach(order => {
        if (order.delivery_people) {
          const personId = order.delivery_person_id
          const personName = order.delivery_people.name
          
          if (!deliveryPerformance[personId]) {
            deliveryPerformance[personId] = {
              id: personId,
              name: personName,
              total: 0,
              delivered: 0
            }
          }
          
          deliveryPerformance[personId].total++
          if (order.status === 'delivered') {
            deliveryPerformance[personId].delivered++
          }
        }
      })

      const deliveryPerformanceArray = Object.values(deliveryPerformance)
        .map(person => ({
          ...person,
          successRate: person.total > 0 ? (person.delivered / person.total) * 100 : 0
        }))
        .sort((a, b) => b.delivered - a.delivered)

      set({
        stats: {
          totalSales,
          totalOrders,
          completedOrders,
          pendingOrders,
          topProducts,
          deliveryPerformance: deliveryPerformanceArray
        },
        loading: false
      })

      return { data: get().stats, error: null }
    } catch (error) {
      set({ loading: false })
      return { data: null, error }
    }
  },

  // Set date range
  setDateRange: (dateRange) => {
    set({ dateRange })
  },

  // Get stats for specific period
  getStatsForPeriod: async (businessId, period) => {
    const now = new Date()
    let start, end

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'week':
        start = new Date(now.setDate(now.getDate() - now.getDay()))
        end = new Date()
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date()
        break
      default:
        start = new Date(now.setDate(now.getDate() - 30))
        end = new Date()
    }

    return await get().fetchStats(businessId, { start, end })
  }
}))
