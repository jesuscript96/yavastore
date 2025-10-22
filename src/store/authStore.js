import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logoutService } from '../lib/logoutService'

export const useAuthStore = create((set, get) => ({
  user: null,
  business: null,
  loading: true,
  initialized: false,

  // Initialize auth state
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await get().fetchBusiness(session.user.id)
        set({ user: session.user, loading: false, initialized: true })
      } else {
        set({ user: null, business: null, loading: false, initialized: true })
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ user: null, business: null, loading: false, initialized: true })
    }
  },

  // Sign up new business
  signUp: async (email, password, businessName) => {
    try {
      // Step 1: Create auth user with business_name in metadata
      // This triggers the database function to automatically create the business record
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            business_name: businessName
          }
        }
      })

      if (error) throw error

      if (data.user) {
        set({ user: data.user })

        // Step 2: Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Step 3: Try to fetch the business record created by the trigger
        let business = null
        let retries = 3

        while (retries > 0 && !business) {
          const { data: fetchedBusiness, error: fetchError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (fetchedBusiness) {
            business = fetchedBusiness
            break
          }

          // If not found, wait and retry
          if (fetchError && retries > 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
            retries--
          } else if (fetchError && retries === 1) {
            // Last attempt: try to create manually as fallback
            console.log('Trigger may have failed, attempting manual creation...')
            const { data: createdBusiness, error: createError } = await supabase
              .from('businesses')
              .insert({
                id: data.user.id,
                name: businessName,
                email: email
              })
              .select()
              .single()

            if (createError) {
              console.error('Failed to create business record:', createError)
              throw createError
            }

            business = createdBusiness
            break
          }
        }

        if (business) {
          set({ business })
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('SignUp error:', error)
      return { data: null, error }
    }
  },

  // Sign in
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        set({ user: data.user })
        await get().fetchBusiness(data.user.id)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign out - Enhanced to prevent cache issues
  signOut: async () => {
    try {
      // Usar el servicio centralizado de logout
      const result = await logoutService.performLogout()
      return { error: result.error }
    } catch (error) {
      console.error('Error during sign out:', error)
      // Fallback: usar el servicio de logout de todas formas
      await logoutService.performLogout()
      return { error }
    }
  },

  // Fetch business data
  fetchBusiness: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      set({ business: data })
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching business:', error)
      return { data: null, error }
    }
  },

  // Update business
  updateBusiness: async (updates) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', get().user.id)
        .select()
        .single()

      if (error) throw error
      
      set({ business: data })
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}))

// Listen to auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const { initialize, fetchBusiness } = useAuthStore.getState()
  
  if (event === 'SIGNED_IN' && session?.user) {
    await fetchBusiness(session.user.id)
    useAuthStore.setState({ user: session.user })
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, business: null })
  }
})
