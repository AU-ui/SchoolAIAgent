-- Fix script for missing columns
-- Run this if you get "column is_active does not exist" error

-- Add is_active column to tenants table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add email_verified column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add last_login_at column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    END IF;
END $$;

-- Update existing records to have is_active = true
UPDATE tenants SET is_active = true WHERE is_active IS NULL;

-- Update existing users to have email_verified = false
UPDATE users SET email_verified = false WHERE email_verified IS NULL;

-- Verify the fix
SELECT 'Tenants table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

SELECT 'Users table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position; 