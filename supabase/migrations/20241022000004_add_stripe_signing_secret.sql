-- Add stripe_signing_secret field to businesses table
-- This stores the signing secret from Stripe for webhook verification

-- Add the stripe_signing_secret column
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_signing_secret TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_signing_secret ON businesses(stripe_signing_secret);

-- Add comment to explain the purpose
COMMENT ON COLUMN businesses.stripe_signing_secret IS 'Signing secret from Stripe for webhook verification, obtained when creating webhook in Stripe dashboard';
