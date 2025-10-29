import { create } from 'zustand'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { logger } from '../lib/logger'

export const useDeliveryPeopleStore = create((set, get) => ({
  deliveryPeople: [],
  loading: false,

  // Fetch delivery people
  fetchDeliveryPeople: async (businessId) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('delivery_people')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ deliveryPeople: data || [], loading: false })
      return { data: data || [], error: null }
    } catch (error) {
      set({ loading: false })
      return { data: null, error }
    }
  },

  // Create delivery person
  createDeliveryPerson: async (deliveryPersonData) => {
    logger.log('🚀 Starting delivery person creation process...')
    logger.log('📋 Delivery person data:', {
      name: deliveryPersonData.name,
      email: deliveryPersonData.email,
      phone: deliveryPersonData.phone,
      business_id: deliveryPersonData.business_id,
      has_password: !!deliveryPersonData.password
    })

    try {
      // Check if we have service role key
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      logger.log('🔑 Service role key available:', !!serviceRoleKey)
      
      if (!serviceRoleKey) {
        logger.error('❌ No service role key found! Using anon key will cause 403 error.')
        throw new Error('Service role key not configured. Cannot create users.')
      }

      // First create auth user for delivery person using admin client
      logger.log('👤 Creating auth user for delivery person...')
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: deliveryPersonData.email,
        password: deliveryPersonData.password,
        email_confirm: true
      })

      if (authError) {
        logger.error('❌ Auth user creation failed:', authError)
        throw authError
      }

      logger.log('✅ Auth user created successfully:', {
        user_id: authData.user.id,
        email: authData.user.email
      })

      // Then create delivery person record
      logger.log('📝 Creating delivery person record...')
      const { data, error } = await supabase
        .from('delivery_people')
        .insert([{
          id: authData.user.id,
          business_id: deliveryPersonData.business_id,
          name: deliveryPersonData.name,
          email: deliveryPersonData.email,
          phone: deliveryPersonData.phone,
          password: deliveryPersonData.password,
          schedule_config: deliveryPersonData.schedule_config,
          active: deliveryPersonData.active
        }])
        .select()
        .single()

      if (error) {
        logger.error('❌ Delivery person record creation failed:', error)
        throw error
      }

      logger.log('✅ Delivery person record created successfully:', {
        id: data.id,
        name: data.name,
        email: data.email
      })
      
      set(state => ({
        deliveryPeople: [data, ...state.deliveryPeople]
      }))
      
      return { data, error: null }
    } catch (error) {
      logger.error('💥 Delivery person creation failed:', error)
      logger.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return { data: null, error }
    }
  },

  // Update delivery person
  updateDeliveryPerson: async (deliveryPersonId, updates) => {
    try {
      const { data, error } = await supabase
        .from('delivery_people')
        .update(updates)
        .eq('id', deliveryPersonId)
        .select()
        .single()

      if (error) throw error
      
      set(state => ({
        deliveryPeople: state.deliveryPeople.map(person => 
          person.id === deliveryPersonId ? data : person
        )
      }))
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Toggle active status
  toggleActive: async (deliveryPersonId) => {
    try {
      const person = get().deliveryPeople.find(p => p.id === deliveryPersonId)
      if (!person) throw new Error('Delivery person not found')

      const { data, error } = await supabase
        .from('delivery_people')
        .update({ active: !person.active })
        .eq('id', deliveryPersonId)
        .select()
        .single()

      if (error) throw error
      
      set(state => ({
        deliveryPeople: state.deliveryPeople.map(p => 
          p.id === deliveryPersonId ? data : p
        )
      }))
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Get active delivery people
  getActiveDeliveryPeople: () => {
    return get().deliveryPeople.filter(person => person.active)
  },

  // Get delivery people available for specific date/time
  getAvailableDeliveryPeople: (date, time) => {
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const targetTime = new Date(`1970-01-01T${time}`)
    
    return get().deliveryPeople.filter(person => {
      if (!person.active) return false
      
      const schedule = person.schedule_config
      if (!schedule || !schedule[dayOfWeek]) return false
      
      const daySchedule = schedule[dayOfWeek]
      if (!daySchedule.enabled) return false
      
      const startTime = new Date(`1970-01-01T${daySchedule.start_time}`)
      const endTime = new Date(`1970-01-01T${daySchedule.end_time}`)
      
      return targetTime >= startTime && targetTime <= endTime
    })
  }
}))
