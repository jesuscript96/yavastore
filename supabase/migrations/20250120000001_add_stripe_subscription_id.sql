-- Migration: Add stripe_subscription_id to orders table
-- This allows tracking subscription orders separately from regular orders

ALTER TABLE orders 
ADD COLUMN stripe_subscription_id TEXT;

-- Add index for better performance when querying by subscription
CREATE INDEX IF NOT EXISTS idx_orders_stripe_subscription_id 
ON orders(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN orders.stripe_subscription_id IS 'Stripe subscription ID for subscription-based orders';
