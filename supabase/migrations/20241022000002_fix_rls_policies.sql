-- Migration to fix RLS policies for business self-registration
-- This allows businesses to register themselves securely

-- Drop existing policies for businesses table
DROP POLICY IF EXISTS "Businesses can view own data" ON businesses;
DROP POLICY IF EXISTS "Businesses can update own data" ON businesses;
DROP POLICY IF EXISTS "Businesses can insert own data" ON businesses;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with proper error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create business record if business_name is provided in metadata
  IF NEW.raw_user_meta_data->>'business_name' IS NOT NULL THEN
    -- Insert into businesses table (bypasses RLS because of SECURITY DEFINER)
    INSERT INTO public.businesses (id, name, email)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'business_name',
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicates
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating business record: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate RLS policies for businesses table
-- Allow users to view their own business data
CREATE POLICY "Businesses can view own data"
  ON businesses
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own business data
CREATE POLICY "Businesses can update own data"
  ON businesses
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own business record during registration
-- This is a backup in case the trigger fails
CREATE POLICY "Businesses can insert own data"
  ON businesses
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Add unique constraint on email if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'businesses_email_key'
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_email_key UNIQUE (email);
  END IF;
END $$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Ensure proper permissions are set
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a business record when a new user signs up with business_name in metadata. Uses SECURITY DEFINER to bypass RLS.';

COMMENT ON POLICY "Businesses can insert own data" ON businesses IS
  'Backup policy allowing users to create their own business record if trigger fails. Ensures auth.uid() matches the business id.';
