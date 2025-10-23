-- Add assignment time fields to orders table
-- This allows storing the assigned delivery time range separately from the original delivery_time

ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_delivery_start_time TIME;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_delivery_end_time TIME;

-- Add comments to document the columns
COMMENT ON COLUMN orders.assigned_delivery_start_time IS 'Hora de inicio del rango de entrega asignado (ej: 09:00)';
COMMENT ON COLUMN orders.assigned_delivery_end_time IS 'Hora de fin del rango de entrega asignado (ej: 11:00)';

-- Update existing assigned orders to have default time range if they don't have one
UPDATE orders 
SET 
  assigned_delivery_start_time = '09:00',
  assigned_delivery_end_time = '21:00'
WHERE 
  status = 'assigned' 
  AND delivery_person_id IS NOT NULL 
  AND (assigned_delivery_start_time IS NULL OR assigned_delivery_end_time IS NULL);
