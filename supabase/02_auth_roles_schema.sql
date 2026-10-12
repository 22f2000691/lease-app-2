-- ==============================================================================
-- LEASE TRACKING SOFTWARE - AUTH & ROLE-BASED ACCESS CONTROL (SUPABASE)
-- ==============================================================================

-- 1. Profiles Table linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role VARCHAR(20) NOT NULL CHECK (role IN ('landlord', 'tenant')) DEFAULT 'landlord',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow public insert on profiles during registration" 
    ON profiles FOR INSERT 
    WITH CHECK (true);

-- 2. Add landlord ownership to properties
ALTER TABLE properties 
    ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);

-- 3. Add tenant email & user linking to leases
ALTER TABLE leases 
    ADD COLUMN IF NOT EXISTS tenant_email TEXT,
    ADD COLUMN IF NOT EXISTS tenant_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leases_tenant_email ON leases(tenant_email);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_user ON leases(tenant_user_id);

-- 4. Function & Trigger: Automatically create profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'role', 'landlord')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role;

    -- If this new user is a tenant, auto-link any existing leases matching their email
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'landlord') = 'tenant' THEN
        UPDATE public.leases
        SET tenant_user_id = NEW.id
        WHERE LOWER(tenant_email) = LOWER(NEW.email) AND tenant_user_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Updated RLS Policies for Landlords and Tenants
DROP POLICY IF EXISTS "Allow public all access on properties" ON properties;
DROP POLICY IF EXISTS "Allow public all access on leases" ON leases;
DROP POLICY IF EXISTS "Allow public all access on rent_records" ON rent_records;

-- Properties Policies: Landlords can manage their own properties
CREATE POLICY "Landlords can manage properties" ON properties
    FOR ALL
    USING (landlord_id IS NULL OR landlord_id = auth.uid())
    WITH CHECK (landlord_id IS NULL OR landlord_id = auth.uid());

-- Leases Policies: Landlords can manage; Tenants can view their own
CREATE POLICY "Landlords can manage leases" ON leases
    FOR ALL
    USING (
        property_id IN (SELECT id FROM properties WHERE landlord_id IS NULL OR landlord_id = auth.uid())
    )
    WITH CHECK (
        property_id IN (SELECT id FROM properties WHERE landlord_id IS NULL OR landlord_id = auth.uid())
    );

CREATE POLICY "Tenants can view their own lease" ON leases
    FOR SELECT
    USING (
        tenant_user_id = auth.uid() OR LOWER(tenant_email) = LOWER(auth.jwt()->>'email')
    );

-- Rent Records Policies: Landlords can manage; Tenants can view
CREATE POLICY "Landlords can manage rent records" ON rent_records
    FOR ALL
    USING (
        lease_id IN (
            SELECT l.id FROM leases l 
            JOIN properties p ON l.property_id = p.id 
            WHERE p.landlord_id IS NULL OR p.landlord_id = auth.uid()
        )
    )
    WITH CHECK (
        lease_id IN (
            SELECT l.id FROM leases l 
            JOIN properties p ON l.property_id = p.id 
            WHERE p.landlord_id IS NULL OR p.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Tenants can view their own rent records" ON rent_records
    FOR SELECT
    USING (
        lease_id IN (
            SELECT id FROM leases 
            WHERE tenant_user_id = auth.uid() OR LOWER(tenant_email) = LOWER(auth.jwt()->>'email')
        )
    );
