-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  stripe_webhook_secret TEXT,
  stripe_publishable_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create delivery_people table
CREATE TABLE IF NOT EXISTS delivery_people (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  schedule_config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  products JSONB NOT NULL DEFAULT '[]',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_route', 'delivered', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'stripe')),
  delivery_person_id UUID REFERENCES delivery_people(id) ON DELETE SET NULL,
  assigned_date DATE,
  notes TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_people_business_id ON delivery_people(business_id);
CREATE INDEX IF NOT EXISTS idx_delivery_people_active ON delivery_people(active);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_person_id ON orders(delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_time ON orders(delivery_time);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_date ON orders(assigned_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_people_updated_at BEFORE UPDATE ON delivery_people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses table
-- Businesses can only see their own data
CREATE POLICY "Businesses can view own data" ON businesses
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Businesses can update own data" ON businesses
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Businesses can insert own data" ON businesses
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for delivery_people table
-- Businesses can manage their own delivery people
CREATE POLICY "Businesses can view own delivery people" ON delivery_people
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

CREATE POLICY "Businesses can insert own delivery people" ON delivery_people
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

CREATE POLICY "Businesses can update own delivery people" ON delivery_people
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

CREATE POLICY "Businesses can delete own delivery people" ON delivery_people
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

-- Delivery people can view their own data
CREATE POLICY "Delivery people can view own data" ON delivery_people
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Delivery people can update own data" ON delivery_people
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for orders table
-- Businesses can manage their own orders
CREATE POLICY "Businesses can view own orders" ON orders
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

CREATE POLICY "Businesses can insert own orders" ON orders
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

CREATE POLICY "Businesses can update own orders" ON orders
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

CREATE POLICY "Businesses can delete own orders" ON orders
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE auth.uid() = id
    )
  );

-- Delivery people can view their assigned orders
CREATE POLICY "Delivery people can view assigned orders" ON orders
  FOR SELECT USING (delivery_person_id = auth.uid());

-- Delivery people can update status of their assigned orders
CREATE POLICY "Delivery people can update assigned orders status" ON orders
  FOR UPDATE USING (delivery_person_id = auth.uid())
  WITH CHECK (delivery_person_id = auth.uid());

-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a business user (has business_name in metadata)
  IF NEW.raw_user_meta_data->>'business_name' IS NOT NULL THEN
    INSERT INTO public.businesses (id, name, email)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'business_name',
      NEW.email
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
