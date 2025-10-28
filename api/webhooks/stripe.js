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

        console.log('=== STRIPE WEBHOOK RECEIVED ===')
        console.log('Event Type:', event.type)
        console.log('Business:', business ? `${business.name} (ID: ${business.id})` : 'No business found')
        console.log('Session ID:', session.id)
        console.log('Session Mode:', session.mode)
        console.log('Amount Total:', session.amount_total)
        console.log('Currency:', session.currency)
        console.log('Payment Status:', session.payment_status)
        console.log('================================')

        // Check if this is a subscription checkout
        if (session.mode === 'subscription') {
          console.log('📋 Subscription checkout completed - orders will be created when invoice.paid event arrives')
          console.log(`Subscription ID: ${session.subscription}`)
          break
        }

        // Create the order for regular payments
        await createOrder(session, business.id)

        console.log(`Order created for business: ${business.name} (ID: ${business.id})`)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object

        console.log('=== STRIPE INVOICE.PAID WEBHOOK RECEIVED ===')
        console.log('Event Type:', event.type)
        console.log('Business:', business ? `${business.name} (ID: ${business.id})` : 'No business found')
        console.log('Invoice ID:', invoice.id)
        console.log('Customer ID:', invoice.customer)
        console.log('Subscription ID:', invoice.subscription)
        console.log('Amount Paid:', invoice.amount_paid)
        console.log('Currency:', invoice.currency)
        console.log('============================================')

        // Create orders from invoice
        const result = await createOrdersFromInvoice(invoice, business.id)

        console.log(`✅ Invoice processed successfully - ${result.ordersCreated} orders created for business: ${business.name} (ID: ${business.id})`)
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
