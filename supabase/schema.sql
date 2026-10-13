-- ==============================================================================
-- LEASE TRACKING SOFTWARE - DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Properties / Locations Master Table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    total_units INT DEFAULT 0 CHECK (total_units >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leases & Tenants Register Table
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    shop_name VARCHAR(150) NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    tenant_mobile VARCHAR(50),
    tenant_address TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    base_rent_amount NUMERIC(12, 2) NOT NULL CHECK (base_rent_amount >= 0),
    annual_increment_percent NUMERIC(5, 2) DEFAULT 0.00 CHECK (annual_increment_percent >= 0),
    annual_increment_type VARCHAR(10) DEFAULT 'percent' CHECK (annual_increment_type IN ('percent', 'fixed')),
    annual_increment_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (annual_increment_amount >= 0),
    due_day INT DEFAULT 5 CHECK (due_day BETWEEN 1 AND 28),
    manual_status VARCHAR(50) DEFAULT NULL, -- NULL (auto-calculated) | 'Active' | 'Renewal Due' | 'Expired'
    document_name VARCHAR(255),
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_lease_dates CHECK (end_date > start_date)
);

-- 3. Monthly Rent Collection Table
CREATE TABLE IF NOT EXISTS rent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format 'YYYY-MM'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue')),
    paid_date DATE DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_lease_month UNIQUE (lease_id, month)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rent_records_lease_id ON rent_records(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_month ON rent_records(month);
CREATE INDEX IF NOT EXISTS idx_rent_records_status ON rent_records(status);

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_updated_at ON properties;
CREATE TRIGGER trg_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_leases_updated_at ON leases;
CREATE TRIGGER trg_leases_updated_at
    BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_rent_records_updated_at ON rent_records;
CREATE TRIGGER trg_rent_records_updated_at
    BEFORE UPDATE ON rent_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- Create Storage bucket for lease agreements & documents (if storage schema exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('lease-documents', 'lease-documents', true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Row Level Security (RLS) setup
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_records ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon read/write (customizable based on Auth rules)
CREATE POLICY "Allow public all access on properties" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on leases" ON leases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on rent_records" ON rent_records FOR ALL USING (true) WITH CHECK (true);
