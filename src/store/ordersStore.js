import { create } from 'zustand'
import { supabase, ORDER_STATUS, ORDER_SOURCE } from '../lib/supabase'

export const useOrdersStore = create((set, get) => ({
  orders: [],
  loading: false,
  filters: {
    status: null,
    date: null,
    deliveryPersonId: null
  },

  // Fetch orders
  fetchOrders: async (businessId) => {
    set({ loading: true })
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          delivery_people (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      // Apply filters
      const { filters } = get()
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.date) {
        const startOfDay = new Date(filters.date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(filters.date)
        endOfDay.setHours(23, 59, 59, 999)
        
        query = query
          .gte('delivery_time', startOfDay.toISOString())
          .lte('delivery_time', endOfDay.toISOString())
      }
      if (filters.deliveryPersonId) {
        query = query.eq('delivery_person_id', filters.deliveryPersonId)
      }

      const { data, error } = await query

      if (error) throw error
      set({ orders: data || [], loading: false })
      return { data: data || [], error: null }
    } catch (error) {
      set({ loading: false })
      return { data: null, error }
    }
  },

  // Create order
  createOrder: async (orderData) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select(`
          *,
          delivery_people (
            id,
            name,
            email,
            phone
          )
        `)
        .single()

      if (error) throw error
      
      set(state => ({
        orders: [data, ...state.orders]
      }))
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Update order
  updateOrder: async (orderId, updates) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select(`
          *,
          delivery_people (
            id,
            name,
            email,
            phone
          )
        `)
        .single()

      if (error) throw error
      
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? data : order
        )
      }))
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Assign order to delivery person
  assignOrder: async (orderId, deliveryPersonId, assignedDate) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          delivery_person_id: deliveryPersonId,
          assigned_date: assignedDate,
          status: ORDER_STATUS.ASSIGNED
        })
        .eq('id', orderId)
        .select(`
          *,
          delivery_people (
            id,
            name,
            email,
            phone
          )
        `)
        .single()

      if (error) throw error
      
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? data : order
        )
      }))
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select(`
          *,
          delivery_people (
            id,
            name,
            email,
            phone
          )
        `)
        .single()

      if (error) throw error
      
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? data : order
        )
      }))
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } })
  },

  // Clear filters
  clearFilters: () => {
    set({ filters: { status: null, date: null, deliveryPersonId: null } })
  },

  // Get orders by status
  getOrdersByStatus: (status) => {
    return get().orders.filter(order => order.status === status)
  },

  // Get unassigned orders
  getUnassignedOrders: () => {
    return get().orders.filter(order => !order.delivery_person_id)
  }
}))
