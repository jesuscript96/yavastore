import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

const isDevelopment = import.meta.env.DEV

const AppWrapper = () => (
  <BrowserRouter>
    <App />
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#22c55e',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  isDevelopment ? (
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  ) : (
    <AppWrapper />
  )
)
