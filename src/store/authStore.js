import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logoutService } from '../lib/logoutService'
import { logger } from '../lib/logger'

export const useAuthStore = create((set, get) => ({
  user: null,
  business: null,
  loading: true,
  initialized: false,

  // Initialize auth state
  initialize: async () => {
    logger.log('🚀 AuthStore: Starting initialization...')
    
    // Check localStorage for Supabase data
    const supabaseAuthKey = `sb-${import.meta.env.VITE_SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`
    const authData = localStorage.getItem(supabaseAuthKey)
    logger.log('🔍 AuthStore: localStorage check:', {
      hasAuthData: !!authData,
      authDataLength: authData?.length || 0,
      authKey: supabaseAuthKey
    })
    
    try {
      logger.log('🔍 AuthStore: Getting session from Supabase...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      logger.log('🔍 AuthStore: Session details:', {
        hasSession: !!session,
        sessionValid: session?.expires_at ? new Date(session.expires_at * 1000) > new Date() : false,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        accessToken: session?.access_token ? 'Present' : 'Missing'
      })
      
      logger.log('📋 AuthStore: Session data:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        error: error?.message
      })
      
      if (session?.user) {
        // Verificar si el email está confirmado
        if (!session.user.email_confirmed_at) {
          logger.log('⚠️ AuthStore: User email not confirmed, signing out...')
          await supabase.auth.signOut()
          set({ user: null, business: null, loading: false, initialized: true })
          logger.log('✅ AuthStore: Initialization complete - user signed out due to unconfirmed email')
        } else {
          logger.log('✅ AuthStore: User found, fetching business data...')
          try {
            await get().fetchBusiness(session.user.id)
            logger.log('✅ AuthStore: Business fetch completed successfully')
          } catch (businessError) {
            logger.error('❌ AuthStore: Business fetch failed during initialization:', businessError)
          }
          set({ user: session.user, loading: false, initialized: true })
          logger.log('✅ AuthStore: Initialization complete with user')
        }
      } else {
        logger.log('ℹ️ AuthStore: No user found, setting empty state')
        set({ user: null, business: null, loading: false, initialized: true })
        logger.log('✅ AuthStore: Initialization complete without user')
      }
    } catch (error) {
      logger.error('❌ AuthStore: Error initializing auth:', error)
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
          },
          emailRedirectTo: `${import.meta.env.VITE_APP_URL}/login`
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
            logger.log('Trigger may have failed, attempting manual creation...')
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
              logger.error('Failed to create business record:', createError)
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
      logger.error('SignUp error:', error)
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

      // Verificar si el email está confirmado
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        return { 
          data: null, 
          error: { 
            message: 'Por favor verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.' 
          } 
        }
      }

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
      logger.error('Error during sign out:', error)
      // Fallback: usar el servicio de logout de todas formas
      await logoutService.performLogout()
      return { error }
    }
  },

  // Fetch business data
  fetchBusiness: async (userId) => {
    logger.log('🏢 AuthStore: Fetching business for user:', userId)
    try {
      // Check current auth state before querying with timeout
      logger.log('🔍 AuthStore: About to check current user...')
      
      const userPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getUser timeout after 5 seconds')), 5000)
      )
      
      const { data: { user: currentUser } } = await Promise.race([userPromise, timeoutPromise])
      
      logger.log('🔍 AuthStore: Current authenticated user:', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        userEmail: currentUser?.email
      })
      
      logger.log('🔍 AuthStore: About to query businesses table...')
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', userId)
        .single()

      logger.log('🔍 AuthStore: Raw Supabase response:', { 
        data, 
        error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint
      })

      logger.log('📋 AuthStore: Business fetch result:', {
        hasData: !!data,
        businessName: data?.name,
        businessEmail: data?.email,
        error: error?.message
      })

      if (error) {
        logger.error('❌ AuthStore: Business fetch failed with error:', error)
        throw error
      }
      
      set({ business: data })
      logger.log('✅ AuthStore: Business data set successfully')
      return { data, error: null }
    } catch (error) {
      logger.error('❌ AuthStore: Error fetching business:', error)
      logger.error('❌ AuthStore: Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        isTimeout: error.message.includes('timeout')
      })
      
      // If it's a timeout error, log additional info
      if (error.message.includes('timeout')) {
        logger.error('⏰ AuthStore: getUser() timed out - this indicates a network or auth issue')
      }
      
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
let authListener = null

export const initializeAuthListener = () => {
  if (authListener) {
    return authListener
  }

  authListener = supabase.auth.onAuthStateChange(async (event, session) => {
    logger.log('🔄 AuthStore: Auth state change detected:', {
      event,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id
    })
    
    const { initialize, fetchBusiness } = useAuthStore.getState()
    
    if (event === 'SIGNED_IN' && session?.user) {
      // Verificar si el email está confirmado
      if (!session.user.email_confirmed_at) {
        logger.log('⚠️ AuthStore: User signed in but email not confirmed, signing out...')
        await supabase.auth.signOut()
        useAuthStore.setState({ user: null, business: null })
      } else {
        logger.log('✅ AuthStore: User signed in, fetching business...')
        try {
          await fetchBusiness(session.user.id)
          logger.log('✅ AuthStore: Business fetch completed in auth listener')
        } catch (businessError) {
          logger.error('❌ AuthStore: Business fetch failed in auth listener:', businessError)
        }
        useAuthStore.setState({ user: session.user })
        logger.log('✅ AuthStore: User state updated')
      }
    } else if (event === 'SIGNED_OUT') {
      logger.log('🚪 AuthStore: User signed out, clearing state')
      useAuthStore.setState({ user: null, business: null })
    }
  })

  return authListener
}

export const cleanupAuthListener = () => {
  if (authListener) {
    authListener.data.subscription.unsubscribe()
    authListener = null
    logger.log('🧹 AuthStore: Auth listener cleaned up')
  }
}

// Initialize the listener
initializeAuthListener()
