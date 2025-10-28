import { useAuthStore } from '../store/authStore'
import { useDeliveryPeopleStore } from '../store/deliveryPeopleStore'
import { useOrdersStore } from '../store/ordersStore'
import { useStatsStore } from '../store/statsStore'
import { supabase } from './supabase'

/**
 * Servicio centralizado para cerrar sesión y limpiar completamente el caché
 * Evita problemas de persistencia de datos entre sesiones
 */
export const logoutService = {
  /**
   * Limpia todos los stores de Zustand
   */
  clearAllStores: () => {
    try {
      // Limpiar auth store
      useAuthStore.setState({
        user: null,
        business: null,
        loading: false,
        initialized: false
      })

      // Limpiar delivery people store
      useDeliveryPeopleStore.setState({
        deliveryPeople: [],
        loading: false
      })

      // Limpiar orders store
      useOrdersStore.setState({
        orders: [],
        loading: false,
        filters: {
          status: null,
          date: null,
          deliveryPersonId: null
        }
      })

      // Limpiar stats store
      useStatsStore.setState({
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
        }
      })

      console.log('✅ Todos los stores de Zustand han sido limpiados')
    } catch (error) {
      console.error('❌ Error limpiando stores:', error)
    }
  },

  /**
   * Limpia todo el almacenamiento local del navegador
   */
  clearBrowserStorage: () => {
    try {
      // Limpiar localStorage
      localStorage.clear()
      
      // Limpiar sessionStorage
      sessionStorage.clear()
      
      // Limpiar IndexedDB si existe
      if ('indexedDB' in window) {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            indexedDB.deleteDatabase(db.name)
          })
        }).catch(() => {
          // Ignorar errores de IndexedDB
        })
      }
      
      // Limpiar cookies relacionadas con la aplicación
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
      })

      console.log('✅ Almacenamiento del navegador limpiado')
    } catch (error) {
      console.error('❌ Error limpiando almacenamiento:', error)
    }
  },

  /**
   * Cierra sesión en Supabase con scope global
   */
  signOutFromSupabase: async () => {
    try {
      // Cerrar sesión con scope global para limpiar todas las sesiones
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        console.warn('⚠️ Error en signOut de Supabase:', error)
        // Intentar con scope local como fallback
        await supabase.auth.signOut({ scope: 'local' })
      }

      // Verificar que la sesión se haya cerrado
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.warn('⚠️ La sesión aún persiste, forzando limpieza')
        // Forzar limpieza del estado de auth
        await supabase.auth.getUser()
      }

      console.log('✅ Sesión de Supabase cerrada correctamente')
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error cerrando sesión en Supabase:', error)
      return { success: false, error }
    }
  },

  /**
   * Limpia el caché del navegador y fuerza recarga
   */
  clearCacheAndReload: () => {
    try {
      // Limpiar caché del navegador si es posible
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name)
          })
        }).catch(() => {
          // Ignorar errores de caché
        })
      }

      // Forzar recarga completa de la página
      window.location.href = '/login'
      
      console.log('✅ Caché limpiado y redirigiendo a login')
    } catch (error) {
      console.error('❌ Error limpiando caché:', error)
      // Fallback: redirigir de todas formas
      window.location.href = '/login'
    }
  },

  /**
   * Función principal de cierre de sesión
   * Ejecuta todos los pasos de limpieza en orden
   */
  performLogout: async () => {
    try {
      console.log('🚀 Iniciando proceso de cierre de sesión...')

      // 1. Limpiar todos los stores de Zustand
      logoutService.clearAllStores()

      // 2. Limpiar almacenamiento del navegador
      logoutService.clearBrowserStorage()

      // 3. Cerrar sesión en Supabase
      const supabaseResult = await logoutService.signOutFromSupabase()
      
      // 4. Limpiar caché y recargar
      logoutService.clearCacheAndReload()

      console.log('✅ Proceso de cierre de sesión completado')
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error en el proceso de cierre de sesión:', error)
      
      // En caso de error, intentar limpieza básica y redirigir
      logoutService.clearAllStores()
      logoutService.clearBrowserStorage()
      logoutService.clearCacheAndReload()
      
      return { success: false, error }
    }
  }
}

export default logoutService


