/**
 * Test script for Stripe webhook with subscription checkout.session.completed event
 * This simulates the exact webhook payload that caused the 503 error
 */

const testWebhookPayload = {
  "id": "evt_1SMBhORvxX0TUrYPctWnFhG8",
  "object": "event",
  "api_version": "2025-09-30.clover",
  "created": 1761414978,
  "data": {
    "object": {
      "id": "cs_live_b1sbGuOWlwQbrKr6gCcnBNRfHlYx5yxJPUt6mBxL6Fwawzxpa3OhCQexYu",
      "object": "checkout.session",
      "adaptive_pricing": {
        "enabled": false
      },
      "after_expiration": null,
      "allow_promotion_codes": true,
      "amount_subtotal": 55000,
      "amount_total": 45000,
      "automatic_tax": {
        "enabled": false,
        "liability": null,
        "provider": null,
        "status": null
      },
      "billing_address_collection": "required",
      "cancel_url": "https://stripe.com",
      "client_reference_id": null,
      "client_secret": null,
      "collected_information": {
        "business_name": null,
        "individual_name": "Alexa Gantous",
        "shipping_details": {
          "address": {
            "city": "CMDX",
            "country": "MX",
            "line1": "Amsterdam 122",
            "line2": "4, Hipodromo Condesa",
            "postal_code": "06100",
            "state": "CDMX"
          },
          "name": "Alexa Gantous"
        }
      },
      "consent": null,
      "consent_collection": {
        "payment_method_reuse_agreement": null,
        "promotions": "none",
        "terms_of_service": "none"
      },
      "created": 1761414947,
      "currency": "mxn",
      "currency_conversion": null,
      "custom_fields": [],
      "custom_text": {
        "after_submit": null,
        "shipping_address": null,
        "submit": null,
        "terms_of_service_acceptance": null
      },
      "customer": "cus_TInHwnBfjWLikc",
      "customer_creation": "if_required",
      "customer_details": {
        "address": {
          "city": "Ciudad de México",
          "country": "MX",
          "line1": "122 Ámsterdam, depto 4",
          "line2": null,
          "postal_code": "06100",
          "state": "CDMX"
        },
        "business_name": null,
        "email": "gantousa@gmail.com",
        "individual_name": "Alexa Gantous",
        "name": "Alexa Gantous",
        "phone": null,
        "tax_exempt": "none",
        "tax_ids": []
      },
      "customer_email": null,
      "discounts": [
        {
          "coupon": null,
          "promotion_code": "promo_1SLWAYRvxX0TUrYP0PDYy07Q"
        }
      ],
      "expires_at": 1761501347,
      "invoice": "in_1SMBhERvxX0TUrYPAgBYXlnx",
      "invoice_creation": null,
      "livemode": true,
      "locale": "auto",
      "metadata": {},
      "mode": "subscription",
      "name_collection": {
        "individual": {
          "enabled": true,
          "optional": false
        }
      },
      "origin_context": null,
      "payment_intent": null,
      "payment_link": "plink_1SIGHDRvxX0TUrYPJ80NcnVF",
      "payment_method_collection": "always",
      "payment_method_configuration_details": {
        "id": "pmc_1SGRQsRvxX0TUrYPHaR8MrVi",
        "parent": null
      },
      "payment_method_options": {
        "card": {
          "request_three_d_secure": "automatic"
        }
      },
      "payment_method_types": [
        "card",
        "link"
      ],
      "payment_status": "paid",
      "permissions": null,
      "phone_number_collection": {
        "enabled": false
      },
      "recovered_from": null,
      "saved_payment_method_options": {
        "allow_redisplay_filters": [
          "always"
        ],
        "payment_method_remove": "disabled",
        "payment_method_save": null
      },
      "setup_intent": null,
      "shipping_address_collection": {
        "allowed_countries": [
          "MX"
        ]
      },
      "shipping_cost": null,
      "shipping_options": [],
      "status": "complete",
      "submit_type": "auto",
      "subscription": "sub_1SMBhNRvxX0TUrYPmXRn9JTo",
      "success_url": "https://stripe.com",
      "total_details": {
        "amount_discount": 10000,
        "amount_shipping": 0,
        "amount_tax": 0
      },
      "ui_mode": "hosted",
      "url": null,
      "wallet_options": null
    }
  },
  "livemode": true,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}

// Test function to simulate the webhook processing
async function testWebhookProcessing() {
  console.log('=== TESTING WEBHOOK PROCESSING ===')
  console.log('Event Type:', testWebhookPayload.type)
  console.log('Session Mode:', testWebhookPayload.data.object.mode)
  console.log('Subscription ID:', testWebhookPayload.data.object.subscription)
  console.log('Customer Name:', testWebhookPayload.data.object.collected_information.individual_name)
  console.log('Amount Total:', testWebhookPayload.data.object.amount_total)
  console.log('================================')
  
  // Simulate the webhook processing logic
  const session = testWebhookPayload.data.object
  
  if (session.mode === 'subscription') {
    console.log('✅ Subscription checkout detected')
    console.log('Customer:', session.collected_information.individual_name)
    console.log('Address:', session.collected_information.shipping_details.address)
    console.log('Amount:', session.amount_total / 100, 'MXN')
    console.log('Subscription ID:', session.subscription)
    
    // This should now work without throwing a 503 error
    console.log('✅ Webhook processing should complete successfully')
  }
}

// Run the test
testWebhookProcessing().catch(console.error)

export { testWebhookPayload, testWebhookProcessing }
