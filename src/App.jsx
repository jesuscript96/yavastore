import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  const { user, loading, initialized, initialize } = useAuthStore()

  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  if (loading || !initialized) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
