/**
 * Express Server for Stripe Webhooks (Development & Production)
 *
 * This file provides a simple Express server to handle Stripe webhooks.
 * You can run this locally or deploy it to any Node.js hosting service.
 *
 * Usage:
 *   Development: node api/server.js
 *   Production: Set up as a Node.js service on your hosting platform
 */

import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
})

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Enable CORS
app.use(cors())

// Stripe webhook endpoint - must use raw body
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']

    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object

          // Get business ID from metadata
          const businessId = session.metadata?.business_id

          if (!businessId) {
            console.error('Business ID not found in session metadata')
            return res.status(400).json({ error: 'Business ID not found' })
          }

          // Parse order data
          const orderData = {
            customer_name: session.metadata?.customer_name || session.customer_details?.name || 'Cliente sin nombre',
            customer_phone: session.metadata?.customer_phone || session.customer_details?.phone || '',
            customer_address: session.metadata?.customer_address || 'Sin dirección',
            delivery_time: session.metadata?.delivery_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            notes: session.metadata?.notes || null
          }

          // Fetch line items
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100
          })

          const products = lineItems.data.map(item => ({
            name: item.description || 'Producto',
            quantity: item.quantity || 1,
            price: (item.amount_total || 0) / 100
          }))

          const totalAmount = session.amount_total / 100

          // Create order in database
          const { data, error } = await supabaseAdmin
            .from('orders')
            .insert([{
              business_id: businessId,
              customer_name: orderData.customer_name,
              customer_address: orderData.customer_address,
              customer_phone: orderData.customer_phone,
              products: products,
              total_amount: totalAmount,
              delivery_time: orderData.delivery_time,
              status: 'pending',
              source: 'stripe',
              notes: orderData.notes,
              stripe_session_id: session.id
            }])
            .select()
            .single()

          if (error) {
            throw error
          }

          console.log('Order created successfully:', data.id)
          break
        }

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      res.json({ received: true })
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  }
)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`)
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/api/webhooks/stripe`)
  console.log(`💚 Health check: http://localhost:${PORT}/health`)
})
