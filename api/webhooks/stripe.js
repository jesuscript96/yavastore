/**
 * Stripe Webhook Handler
 *
 * This endpoint receives webhook events from Stripe and automatically creates orders
 * when a checkout session is completed.
 *
 * Deploy this as a serverless function (Vercel, Netlify) or as part of your backend server.
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
})

// Initialize Supabase Admin Client (bypasses RLS)
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

/**
 * Parse order data from Stripe metadata
 */
function parseOrderData(session) {
  const metadata = session.metadata || {}

  return {
    customer_name: metadata.customer_name || session.customer_details?.name || 'Cliente sin nombre',
    customer_phone: metadata.customer_phone || session.customer_details?.phone || '',
    customer_address: metadata.customer_address || session.customer_details?.address || 'Sin dirección',
    delivery_time: metadata.delivery_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default: tomorrow
    notes: metadata.notes || null
  }
}

/**
 * Parse products from Stripe line items
 */
async function parseProducts(sessionId) {
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100
    })

    return lineItems.data.map(item => ({
      name: item.description || item.price.product?.name || 'Producto',
      quantity: item.quantity || 1,
      price: (item.amount_total || 0) / 100 // Convert from cents to dollars
    }))
  } catch (error) {
    console.error('Error fetching line items:', error)
    return []
  }
}

/**
 * Create order in Supabase
 */
async function createOrder(session, businessId) {
  try {
    // Parse order data from session
    const orderData = parseOrderData(session)
    const products = await parseProducts(session.id)
    const totalAmount = session.amount_total / 100 // Convert from cents to dollars

    // Create order in database
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([{
        business_id: businessId,
        customer_name: orderData.customer_name,
        customer_address: typeof orderData.customer_address === 'string'
          ? orderData.customer_address
          : JSON.stringify(orderData.customer_address),
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
    return { success: true, orderId: data.id }
  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

/**
 * Find business by webhook secret
 */
async function findBusinessByWebhookSecret(webhookSecret) {
  try {
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id, name, stripe_webhook_secret')
      .eq('stripe_webhook_secret', webhookSecret)
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error finding business:', error)
    return null
  }
}

/**
 * Verify webhook signature with business-specific secret
 */
async function verifyWebhookSignature(rawBody, signature, webhookSecret) {
  try {
    // First, find the business by webhook secret
    const business = await findBusinessByWebhookSecret(webhookSecret)
    
    if (!business) {
      throw new Error('Business not found for webhook secret')
    }

    // Verify the signature using the business's webhook secret
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    
    return { event, business }
  } catch (error) {
    console.error('Webhook verification failed:', error.message)
    throw error
  }
}

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  let event, business

  try {
    // Get the raw body for signature verification
    const rawBody = req.body

    // Extract webhook secret from the signature header
    // The webhook secret should be passed as a query parameter or header
    const webhookSecret = req.query.secret || req.headers['x-webhook-secret']

    if (!webhookSecret) {
      console.error('Webhook secret not provided')
      return res.status(400).json({ error: 'Webhook secret required' })
    }

    // Verify webhook signature and get business info
    const verification = await verifyWebhookSignature(rawBody, sig, webhookSecret)
    event = verification.event
    business = verification.business

  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        // Create the order for the specific business
        await createOrder(session, business.id)

        console.log(`Order created for business: ${business.name} (ID: ${business.id})`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true, business: business.name })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

// Configuration for raw body parsing (required for Stripe signature verification)
export const config = {
  api: {
    bodyParser: false
  }
}
