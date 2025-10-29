import { create } from 'zustand'
import { supabase, ORDER_STATUS, ORDER_SOURCE } from '../lib/supabase'
import { logger } from '../lib/logger'

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
  assignOrder: async (orderId, deliveryPersonId, assignedDate, startTime = null, endTime = null) => {
    logger.log('🚀 Starting order assignment process...')
    logger.log('📋 Assignment data:', {
      orderId,
      deliveryPersonId,
      assignedDate,
      startTime,
      endTime
    })

    try {
      const updateData = {
        delivery_person_id: deliveryPersonId,
        assigned_date: assignedDate,
        status: ORDER_STATUS.ASSIGNED
      }

      // Add time range if provided
      if (startTime && endTime) {
        updateData.assigned_delivery_start_time = startTime
        updateData.assigned_delivery_end_time = endTime
        logger.log('⏰ Adding time range:', { startTime, endTime })
      } else {
        logger.log('⏰ No time range provided - using default "anytime"')
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
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

      if (error) {
        logger.error('❌ Order assignment failed:', error)
        throw error
      }

      logger.log('✅ Order assigned successfully:', {
        orderId: data.id,
        deliveryPerson: data.delivery_people?.name,
        assignedDate: data.assigned_date,
        timeRange: data.assigned_delivery_start_time && data.assigned_delivery_end_time 
          ? `${data.assigned_delivery_start_time} - ${data.assigned_delivery_end_time}`
          : 'Cualquiera'
      })
      
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? data : order
        )
      }))
      
      return { data, error: null }
    } catch (error) {
      logger.error('💥 Order assignment failed:', error)
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

  // Unassign order
  unassignOrder: async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          delivery_person_id: null,
          assigned_date: null,
          assigned_delivery_start_time: null,
          assigned_delivery_end_time: null,
          status: ORDER_STATUS.PENDING
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

  // Get unassigned orders
  getUnassignedOrders: () => {
    return get().orders.filter(order => !order.delivery_person_id)
  }
}))
