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
      console.error('Database error finding business:', error)
      return null
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
      console.error('Business not found for webhook secret:', webhookSecret)
      // En lugar de fallar, vamos a intentar con un secreto por defecto
      console.log('Attempting to verify with default Stripe secret...')
      
      // Usar el secreto de Stripe por defecto si no encontramos el negocio
      const defaultSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!defaultSecret) {
        throw new Error('No default Stripe webhook secret configured')
      }
      
      const event = stripe.webhooks.constructEvent(rawBody, signature, defaultSecret)
      return { event, business: null } // business será null pero el evento será válido
    }

    if (!business.stripe_signing_secret) {
      console.error('Business has no Stripe signing secret configured')
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
  const customerDetails = session.customer_details || {}
  const collectedInfo = session.collected_information || {}
  
  // Priorizar collected_information.shipping_details (API 2025-09-30+)
  // Fallback a session.shipping para compatibilidad con versiones anteriores
  const shippingDetails = collectedInfo.shipping_details || session.shipping || {}
  const shippingAddress = shippingDetails.address || {}

  // Extraer nombre del cliente
  const customerName = collectedInfo.individual_name || 
                      customerDetails.name || 
                      customerDetails.individual_name || 
                      'Cliente sin nombre'

  // Extraer teléfono del cliente
  const customerPhone = customerDetails.phone || ''

  // Formatear dirección completa
  let customerAddress = 'Sin dirección'
  if (shippingAddress.line1) {
    const addressParts = [
      shippingAddress.line1,
      shippingAddress.line2,
      shippingAddress.city,
      shippingAddress.state,
      shippingAddress.postal_code
    ].filter(Boolean) // Remover valores vacíos
    
    customerAddress = addressParts.join(', ')
  }

  // Log detallado para debugging
  console.log('=== PARSING ORDER DATA ===')
  console.log('Customer Name:', customerName)
  console.log('Customer Phone:', customerPhone)
  console.log('Customer Address:', customerAddress)
  console.log('Shipping Details:', JSON.stringify(shippingDetails, null, 2))
  console.log('Collected Info:', JSON.stringify(collectedInfo, null, 2))
  console.log('==========================')

  return {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
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

    if (lineItems.data.length === 0) {
      // Si no hay line items, crear un producto genérico
      return [{
        name: 'Producto de Stripe',
        quantity: 1,
        price: 0 // Se calculará desde amount_total
      }]
    }

    return lineItems.data.map(item => ({
      name: item.description || item.price.product?.name || 'Producto',
      quantity: item.quantity || 1,
      price: (item.amount_total || 0) / 100
    }))
  } catch (error) {
    console.error('Error fetching line items:', error)
    // Fallback: crear un producto genérico
    return [{
      name: 'Producto de Stripe',
      quantity: 1,
      price: 0
    }]
  }
}

/**
 * Get or create default business for Stripe orders
 */
async function getDefaultBusiness() {
  try {
    // Primero intentar obtener cualquier negocio existente
    const { data: existingBusiness, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id, name')
      .limit(1)
      .single()

    if (existingBusiness && !fetchError) {
      console.log('Using existing business:', existingBusiness.name, '(ID:', existingBusiness.id + ')')
      return existingBusiness.id
    }

    // Si no hay negocios existentes, crear uno por defecto
    console.log('No existing businesses found, creating default business...')
    
    // Crear un usuario por defecto primero (necesario para la relación)
    const { data: defaultUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'stripe-default@yava.com',
      password: 'stripe-default-password-123',
      email_confirm: true
    })

    if (userError) {
      console.error('Error creating default user:', userError)
      throw new Error('Could not create default business user')
    }

    // Crear el negocio por defecto
    const { data: defaultBusiness, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert([{
        id: defaultUser.user.id,
        name: 'Negocio por Defecto (Stripe)',
        email: 'stripe-default@yava.com'
      }])
      .select()
      .single()

    if (businessError) {
      console.error('Error creating default business:', businessError)
      throw new Error('Could not create default business')
    }

    console.log('Created default business:', defaultBusiness.name, '(ID:', defaultBusiness.id + ')')
    return defaultBusiness.id
  } catch (error) {
    console.error('Error getting default business:', error)
    throw error
  }
}

/**
 * Create order in Supabase
 */
async function createOrder(session, businessId = null) {
  try {
    const orderData = parseOrderData(session)
    const products = await parseProducts(session.id)
    const totalAmount = session.amount_total / 100

    // Si no tenemos business_id, intentamos obtenerlo del metadata o usar un valor por defecto
    let finalBusinessId = businessId
    if (!finalBusinessId) {
      // Intentar obtener el business_id del metadata de Stripe
      const metadataBusinessId = session.metadata?.business_id
      if (metadataBusinessId) {
        finalBusinessId = metadataBusinessId
        console.log('Using business_id from metadata:', finalBusinessId)
      } else {
        // Obtener o crear un negocio por defecto
        finalBusinessId = await getDefaultBusiness()
        console.log('Using default business_id:', finalBusinessId)
      }
    }

    // Si no hay productos o el precio es 0, usar el total de la sesión
    if (products.length === 0 || products[0].price === 0) {
      products[0] = {
        name: 'Producto de Stripe',
        quantity: 1,
        price: totalAmount
      }
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([{
        business_id: finalBusinessId,
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
      console.error('Supabase error:', error)
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
        console.log('Business:', business ? `${business.name} (ID: ${business.id})` : 'No business found - using fallback')
        console.log('Session ID:', session.id)
        console.log('Full Session Object:', JSON.stringify(session, null, 2))
        console.log('Customer Details:', JSON.stringify(session.customer_details, null, 2))
        console.log('Metadata:', JSON.stringify(session.metadata, null, 2))
        console.log('Line Items:', JSON.stringify(session.display_items || session.line_items, null, 2))
        console.log('Amount Total:', session.amount_total)
        console.log('Currency:', session.currency)
        console.log('Payment Status:', session.payment_status)
        console.log('================================')

        // Create the order (con o sin business específico)
        const businessId = business ? business.id : null
        await createOrder(session, businessId)

        console.log(`✅ Order created successfully${business ? ` for business: ${business.name} (ID: ${business.id})` : ' (using fallback business_id)'}`)
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
      body: JSON.stringify({ 
        received: true, 
        business: business ? business.name : 'Fallback processing',
        message: 'Webhook processed successfully'
      })
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
