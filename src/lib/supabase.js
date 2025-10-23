import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// 🔍 DEBUG: Log environment variables
console.log('🔧 Supabase Configuration:')
console.log('  URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('  Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
console.log('  Service Role Key:', supabaseServiceRoleKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

// Cliente normal para operaciones del usuario autenticado
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 🔍 DEBUG: Log Supabase client creation
console.log('✅ Supabase client created successfully')

// Cliente admin para operaciones que requieren permisos de administrador
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 🔍 DEBUG: Log Admin client creation
console.log('✅ Supabase Admin client created successfully')

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
