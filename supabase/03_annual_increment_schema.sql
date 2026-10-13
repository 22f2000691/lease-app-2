-- ==============================================================================
-- LEASE TRACKING SOFTWARE - ANNUAL INCREMENT FLEXIBILITY MIGRATION
-- ==============================================================================
-- Adds support for fixed-amount annual increments in addition to percentages.

ALTER TABLE leases 
    ADD COLUMN IF NOT EXISTS annual_increment_type VARCHAR(10) DEFAULT 'percent' CHECK (annual_increment_type IN ('percent', 'fixed')),
    ADD COLUMN IF NOT EXISTS annual_increment_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (annual_increment_amount >= 0);

-- Update existing leases to have default values
UPDATE leases 
SET annual_increment_type = 'percent' 
WHERE annual_increment_type IS NULL;

UPDATE leases 
SET annual_increment_amount = 0.00 
WHERE annual_increment_amount IS NULL;
