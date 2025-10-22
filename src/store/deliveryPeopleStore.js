import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
    try {
      // First create auth user for delivery person
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: deliveryPersonData.email,
        password: deliveryPersonData.temp_password,
        email_confirm: true
      })

      if (authError) throw authError

      // Then create delivery person record
      const { data, error } = await supabase
        .from('delivery_people')
        .insert([{
          ...deliveryPersonData,
          id: authData.user.id
        }])
        .select()
        .single()

      if (error) throw error
      
      set(state => ({
        deliveryPeople: [data, ...state.deliveryPeople]
      }))
      
      return { data, error: null }
    } catch (error) {
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
