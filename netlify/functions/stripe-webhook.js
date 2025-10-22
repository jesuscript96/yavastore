/**
 * Netlify Function: Stripe Webhook Handler
 * 
 * Esta función maneja los webhooks de Stripe para crear órdenes automáticamente
 * cuando se completa un checkout session.
 * 
 * URL: https://tu-dominio.netlify.app/.netlify/functions/stripe-webhook
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
 * Find business by webhook secret
 */
async function findBusinessByWebhookSecret(webhookSecret) {
  try {
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id, name, stripe_webhook_secret, stripe_signing_secret')
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

    if (!business.stripe_signing_secret) {
      throw new Error('Business has no Stripe signing secret configured')
    }

    // Verify the signature using the business's Stripe signing secret
    const event = stripe.webhooks.constructEvent(rawBody, signature, business.stripe_signing_secret)
    
    return { event, business }
  } catch (error) {
    console.error('Webhook verification failed:', error.message)
    throw error
  }
}

/**
 * Parse order data from Stripe metadata
 */
function parseOrderData(session) {
  const metadata = session.metadata || {}

  return {
    customer_name: metadata.customer_name || session.customer_details?.name || 'Cliente sin nombre',
    customer_phone: metadata.customer_phone || session.customer_details?.phone || '',
    customer_address: metadata.customer_address || session.customer_details?.address || 'Sin dirección',
    delivery_time: metadata.delivery_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
      price: (item.amount_total || 0) / 100
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
    const orderData = parseOrderData(session)
    const products = await parseProducts(session.id)
    const totalAmount = session.amount_total / 100

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
 * Netlify Function Handler
 */
export async function handler(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const signature = event.headers['stripe-signature']
  let eventData, business

  try {
    // Get the raw body for signature verification
    const rawBody = event.body

    // Extract webhook secret from query parameters
    const webhookSecret = event.queryStringParameters?.secret

    if (!webhookSecret) {
      console.error('Webhook secret not provided')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Webhook secret required' })
      }
    }

    // Verify webhook signature and get business info
    const verification = await verifyWebhookSignature(rawBody, signature, webhookSecret)
    eventData = verification.event
    business = verification.business

  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    }
  }

  // Handle the event
  try {
    switch (eventData.type) {
      case 'checkout.session.completed': {
        const session = eventData.data.object

        // Log completo del webhook para debugging
        console.log('=== STRIPE WEBHOOK RECEIVED ===')
        console.log('Event Type:', eventData.type)
        console.log('Business:', business.name, '(ID:', business.id + ')')
        console.log('Session ID:', session.id)
        console.log('Full Session Object:', JSON.stringify(session, null, 2))
        console.log('Customer Details:', JSON.stringify(session.customer_details, null, 2))
        console.log('Metadata:', JSON.stringify(session.metadata, null, 2))
        console.log('Line Items:', JSON.stringify(session.display_items || session.line_items, null, 2))
        console.log('Amount Total:', session.amount_total)
        console.log('Currency:', session.currency)
        console.log('Payment Status:', session.payment_status)
        console.log('================================')

        // Create the order for the specific business
        await createOrder(session, business.id)

        console.log(`✅ Order created successfully for business: ${business.name} (ID: ${business.id})`)
        break
      }

      default:
        console.log(`Unhandled event type: ${eventData.type}`)
        console.log('Event data:', JSON.stringify(eventData, null, 2))
    }

    // Return a response to acknowledge receipt of the event
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, business: business.name })
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    }
  }
}
