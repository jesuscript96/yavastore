-- Add password column to delivery_people table
-- This allows storing the permanent password for delivery people

ALTER TABLE delivery_people ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';

-- Add comment to document the column purpose
COMMENT ON COLUMN delivery_people.password IS 'Contraseña permanente del repartidor para acceso a la aplicación';

-- Update existing records to have a default password (optional)
-- You can remove this if you don't want to set default passwords
UPDATE delivery_people 
SET password = 'password123' 
WHERE password = '' OR password IS NULL;
