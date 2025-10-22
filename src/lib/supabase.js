import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export const ORDER_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_ROUTE: 'in_route',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
}

export const ORDER_SOURCE = {
  MANUAL: 'manual',
  STRIPE: 'stripe'
}
