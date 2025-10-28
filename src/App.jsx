import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import CreateOrder from './pages/CreateOrder'
import DeliveryPeople from './pages/DeliveryPeople'
import CreateDeliveryPerson from './pages/CreateDeliveryPerson'
import EditDeliveryPerson from './pages/EditDeliveryPerson'
import Assignments from './pages/Assignments'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'
import StripeSetupInstructions from './pages/StripeSetupInstructions'
import StripeOrders from './pages/StripeOrders'
import toast from 'react-hot-toast'

function App() {
  const { user, loading, initialized, initialize } = useAuthStore()
  const location = useLocation()
  const [emailConfirmed, setEmailConfirmed] = useState(false)

  // 🔍 DEBUG: Log app state
  console.log('🎯 App: Current state:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    loading,
    initialized
  })

  useEffect(() => {
    console.log('🔄 App: useEffect triggered', { initialized })
    if (!initialized) {
      console.log('🚀 App: Starting initialization...')
      initialize()
    }
  }, [initialized, initialize])

  // Manejar confirmación de email desde la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const type = urlParams.get('type')
    const token = urlParams.get('token')
    
    if (type === 'signup' && token) {
      console.log('📧 App: Email confirmation detected in URL')
      setEmailConfirmed(true)
      toast.success('¡Email verificado exitosamente! Ya puedes iniciar sesión.')
      
      // Limpiar la URL después de mostrar el mensaje
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname)
        setEmailConfirmed(false)
      }, 3000)
    }
  }, [location])

  if (loading || !initialized) {
    console.log('⏳ App: Showing loading spinner')
    return <LoadingSpinner />
  }

  if (!user) {
    console.log('🚪 App: No user, showing login routes')
    return (
      <>
        {emailConfirmed && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              ¡Email verificado exitosamente! Ya puedes iniciar sesión.
            </div>
          </div>
        )}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    )
  }

  console.log('🏠 App: User authenticated, showing main app')
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/new" element={<CreateOrder />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/delivery-people" element={<DeliveryPeople />} />
        <Route path="/delivery-people/new" element={<CreateDeliveryPerson />} />
        <Route path="/delivery-people/:id/edit" element={<EditDeliveryPerson />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/stripe-instructions" element={<StripeSetupInstructions />} />
        <Route path="/stripe-orders" element={<StripeOrders />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
