-- Add unique stripe_webhook_secret field to businesses table
-- This allows each business to have their own webhook configuration

-- Add the stripe_webhook_secret column with unique constraint
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT UNIQUE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_webhook_secret ON businesses(stripe_webhook_secret);

-- Add comment to explain the purpose
COMMENT ON COLUMN businesses.stripe_webhook_secret IS 'Unique webhook secret for Stripe integration, allows each business to receive orders from their own Stripe store';
