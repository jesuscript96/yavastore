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
  apiVersion: '2025-09-30.clover' // Actualizar a la versión más reciente
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
 * Parse products from Stripe invoice line items
 */
function parseInvoiceProducts(invoice) {
  try {
    const lineItems = invoice.lines?.data || []
    
    if (lineItems.length === 0) {
      console.log('No line items found in invoice')
      return []
    }

    return lineItems.map(item => {
      const unitPrice = (item.amount || 0) / 100 // Convert from cents to dollars
      const quantity = item.quantity || 1
      const name = item.description || 'Producto de Suscripción'
      
      console.log(`Invoice line item: ${name} - quantity: ${quantity}, amount: ${item.amount} cents, unit price: $${unitPrice}`)
      
      return {
        name,
        quantity,
        unitPrice,
        totalAmount: item.amount || 0
      }
    })
  } catch (error) {
    console.error('Error parsing invoice products:', error)
    return []
  }
}

/**
 * Get customer information from Stripe
 */
async function getCustomerInfo(customerId) {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    
    // Extraer información del cliente
    const customerName = customer.name || customer.email || 'Cliente sin nombre'
    const customerPhone = customer.phone || ''
    
    // Formatear dirección completa
    let customerAddress = 'Sin dirección'
    if (customer.address) {
      const addressParts = [
        customer.address.line1,
        customer.address.line2,
        customer.address.city,
        customer.address.state,
        customer.address.postal_code
      ].filter(Boolean)
      
      customerAddress = addressParts.join(', ')
    }
    
    console.log('Customer info retrieved:', {
      name: customerName,
      phone: customerPhone,
      address: customerAddress
    })
    
    return {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress
    }
  } catch (error) {
    console.error('Error retrieving customer info:', error)
    return {
      customer_name: 'Cliente sin nombre',
      customer_phone: '',
      customer_address: 'Sin dirección'
    }
  }
}

/**
 * Create multiple orders from invoice (one per product unit)
 */
async function createOrdersFromInvoice(invoice, businessId = null) {
  try {
    console.log('=== CREATING ORDERS FROM INVOICE ===')
    console.log('Invoice ID:', invoice.id)
    console.log('Customer ID:', invoice.customer)
    
    // Parse products from invoice
    const invoiceProducts = parseInvoiceProducts(invoice)
    
    if (invoiceProducts.length === 0) {
      console.log('No products found in invoice, skipping order creation')
      return { success: true, ordersCreated: 0 }
    }
    
    // Get customer information
    const customerInfo = await getCustomerInfo(invoice.customer)
    
    // Get or create default business
    let finalBusinessId = businessId
    if (!finalBusinessId) {
      finalBusinessId = await getDefaultBusiness()
      console.log('Using default business_id:', finalBusinessId)
    }
    
    const ordersCreated = []
    
    // Create individual orders for each product unit
    for (const product of invoiceProducts) {
      // Create one order per unit of the product
      for (let i = 0; i < product.quantity; i++) {
        const orderData = {
          business_id: finalBusinessId,
          customer_name: customerInfo.customer_name,
          customer_address: customerInfo.customer_address,
          customer_phone: customerInfo.customer_phone,
          products: [{
            name: product.name,
            quantity: 1,
            price: product.unitPrice
          }],
          total_amount: product.unitPrice,
          delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default: tomorrow
          status: 'pending',
          source: 'stripe',
          notes: `Suscripción - Invoice: ${invoice.id}`,
          stripe_session_id: null // No session for invoice-based orders
        }
        
        const { data, error } = await supabaseAdmin
          .from('orders')
          .insert([orderData])
          .select()
          .single()
        
        if (error) {
          console.error('Error creating order from invoice:', error)
          throw error
        }
        
        ordersCreated.push(data.id)
        console.log(`✅ Order created from invoice: ${data.id} - ${product.name} ($${product.unitPrice})`)
      }
    }
    
    console.log(`=== INVOICE PROCESSING COMPLETE ===`)
    console.log(`Total orders created: ${ordersCreated.length}`)
    console.log('Order IDs:', ordersCreated)
    
    return { success: true, ordersCreated: ordersCreated.length, orderIds: ordersCreated }
  } catch (error) {
    console.error('Error creating orders from invoice:', error)
    throw error
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
 * Create order from subscription checkout session
 */
async function createOrderFromSubscription(session, businessId = null) {
  try {
    console.log('=== CREATING ORDER FROM SUBSCRIPTION ===')
    console.log('Session ID:', session.id)
    console.log('Subscription ID:', session.subscription)
    console.log('Customer ID:', session.customer)
    
    // Extraer información del cliente de la sesión
    const customerDetails = session.customer_details || {}
    const collectedInfo = session.collected_information || {}
    
    const customerName = collectedInfo.individual_name || 
                        customerDetails.name || 
                        customerDetails.individual_name || 
                        'Cliente Suscripción'
    
    const customerPhone = customerDetails.phone || ''
    
    // Extraer dirección de shipping
    const shippingDetails = collectedInfo.shipping_details || {}
    const shippingAddress = shippingDetails.address || {}
    
    let customerAddress = 'Sin dirección'
    if (shippingAddress.line1) {
      const addressParts = [
        shippingAddress.line1,
        shippingAddress.line2,
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.postal_code
      ].filter(Boolean)
      
      customerAddress = addressParts.join(', ')
    }
    
    // Obtener o crear business por defecto
    let finalBusinessId = businessId
    if (!finalBusinessId) {
      finalBusinessId = await getDefaultBusiness()
      console.log('Using default business_id for subscription:', finalBusinessId)
    }
    
    // Crear orden con información de la suscripción
    const orderData = {
      business_id: finalBusinessId,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_phone: customerPhone,
      products: [{
        name: 'Suscripción Stripe',
        quantity: 1,
        price: (session.amount_total || 0) / 100
      }],
      total_amount: (session.amount_total || 0) / 100,
      delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      source: 'stripe_subscription',
      notes: `Suscripción inicial - Session: ${session.id}, Subscription: ${session.subscription}`,
      stripe_session_id: session.id,
      stripe_subscription_id: session.subscription
    }
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating subscription order:', error)
      throw error
    }
    
    console.log(`✅ Subscription order created: ${data.id}`)
    return { success: true, orderId: data.id }
  } catch (error) {
    console.error('Error creating order from subscription:', error)
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
    console.log('=== WEBHOOK PROCESSING START ===')
    console.log('Event Type:', eventData.type)
    console.log('Event ID:', eventData.id)
    console.log('Business Found:', business ? `${business.name} (ID: ${business.id})` : 'No business found - will use fallback')
    console.log('Environment Variables Check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
    })
    console.log('===============================')

    switch (eventData.type) {
      case 'checkout.session.completed': {
        const session = eventData.data.object

        // Log completo del webhook para debugging
        console.log('=== STRIPE WEBHOOK RECEIVED ===')
        console.log('Event Type:', eventData.type)
        console.log('Business:', business ? `${business.name} (ID: ${business.id})` : 'No business found - using fallback')
        console.log('Session ID:', session.id)
        console.log('Session Mode:', session.mode)
        console.log('Full Session Object:', JSON.stringify(session, null, 2))
        console.log('Customer Details:', JSON.stringify(session.customer_details, null, 2))
        console.log('Metadata:', JSON.stringify(session.metadata, null, 2))
        console.log('Line Items:', JSON.stringify(session.display_items || session.line_items, null, 2))
        console.log('Amount Total:', session.amount_total)
        console.log('Currency:', session.currency)
        console.log('Payment Status:', session.payment_status)
        console.log('================================')

        // Check if this is a subscription checkout
        if (session.mode === 'subscription') {
          console.log('📋 Subscription checkout completed - orders will be created when invoice.paid event arrives')
          console.log(`Subscription ID: ${session.subscription}`)
          
          // Para suscripciones, crear una orden inicial con la información de la sesión
          try {
            const businessId = business ? business.id : null
            await createOrderFromSubscription(session, businessId)
            console.log(`✅ Initial subscription order created${business ? ` for business: ${business.name} (ID: ${business.id})` : ' (using fallback business_id)'}`)
          } catch (subscriptionError) {
            console.error('⚠️ Error creating initial subscription order (this is not critical):', subscriptionError.message)
            // No lanzamos el error porque las suscripciones se manejan principalmente con invoice.paid
          }
          break
        }

        // Create the order for regular payments (con o sin business específico)
        const businessId = business ? business.id : null
        await createOrder(session, businessId)

        console.log(`✅ Order created successfully${business ? ` for business: ${business.name} (ID: ${business.id})` : ' (using fallback business_id)'}`)
        break
      }

      case 'invoice.paid': {
        const invoice = eventData.data.object

        // Log completo del webhook para debugging
        console.log('=== STRIPE INVOICE.PAID WEBHOOK RECEIVED ===')
        console.log('Event Type:', eventData.type)
        console.log('Business:', business ? `${business.name} (ID: ${business.id})` : 'No business found - using fallback')
        console.log('Invoice ID:', invoice.id)
        console.log('Customer ID:', invoice.customer)
        console.log('Subscription ID:', invoice.subscription)
        console.log('Amount Paid:', invoice.amount_paid)
        console.log('Currency:', invoice.currency)
        console.log('Full Invoice Object:', JSON.stringify(invoice, null, 2))
        console.log('============================================')

        // Create orders from invoice (con o sin business específico)
        const businessId = business ? business.id : null
        const result = await createOrdersFromInvoice(invoice, businessId)

        console.log(`✅ Invoice processed successfully - ${result.ordersCreated} orders created${business ? ` for business: ${business.name} (ID: ${business.id})` : ' (using fallback business_id)'}`)
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
    console.error('=== WEBHOOK PROCESSING ERROR ===')
    console.error('Error Type:', error.constructor.name)
    console.error('Error Message:', error.message)
    console.error('Error Stack:', error.stack)
    console.error('Event Data:', JSON.stringify(eventData, null, 2))
    console.error('Business Data:', JSON.stringify(business, null, 2))
    console.error('================================')
    
    // Intentar devolver una respuesta más específica basada en el tipo de error
    let statusCode = 500
    let errorMessage = 'Webhook processing failed'
    
    if (error.message.includes('database') || error.message.includes('supabase')) {
      statusCode = 503
      errorMessage = 'Database connection error'
    } else if (error.message.includes('stripe') || error.message.includes('webhook')) {
      statusCode = 400
      errorMessage = 'Stripe webhook error'
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        eventId: eventData?.id
      })
    }
  }
}
