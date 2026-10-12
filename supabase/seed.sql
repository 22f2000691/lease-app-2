-- ==============================================================================
-- SAMPLE SEED DATA FOR LEASE TRACKING SOFTWARE
-- ==============================================================================

-- Clear existing data if re-seeding
TRUNCATE TABLE rent_records, leases, properties CASCADE;

-- Insert Properties
INSERT INTO properties (id, name, address, total_units) VALUES
('a0000000-0000-0000-0000-000000000001', 'City Centre Complex', 'GS Road, Dispur, Guwahati - 781005', 12),
('a0000000-0000-0000-0000-000000000002', 'Fancy Bazar Commercial Hub', 'Hem Baruah Rd, Fancy Bazar, Guwahati - 781001', 8),
('a0000000-0000-0000-0000-000000000003', 'Metro Heights Tower', 'Zoo Road, Near Central Mall, Guwahati - 781024', 15);

-- Insert Leases
-- 1. Active lease (started last year, 10% annual escalation)
INSERT INTO leases (
    id, property_id, shop_name, tenant_name, tenant_mobile, tenant_address,
    start_date, end_date, base_rent_amount, annual_increment_percent, due_day, manual_status, document_name
) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Shop 101 - Apex Electronics', 'Rajesh Sharma', '+91 98765 43210', 'House 42, Christian Basti, Guwahati', '2024-01-01', '2027-12-31', 35000.00, 10.00, 5, NULL, 'Apex_Lease_Agreement_2024.pdf');

-- 2. Renewal Due lease (ending in ~20 days from current date)
INSERT INTO leases (
    id, property_id, shop_name, tenant_name, tenant_mobile, tenant_address,
    start_date, end_date, base_rent_amount, annual_increment_percent, due_day, manual_status, document_name
) VALUES
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Unit 204 - Cafe Mocha', 'Priyanka Das', '+91 98540 12345', 'Boruah Enclave, Ulubari, Guwahati', '2023-11-01', (CURRENT_DATE + INTERVAL '18 days')::date, 28000.00, 5.00, 7, NULL, 'Cafe_Mocha_Agreement.pdf');

-- 3. Another Active lease (multi-year, 7% annual escalation)
INSERT INTO leases (
    id, property_id, shop_name, tenant_name, tenant_mobile, tenant_address,
    start_date, end_date, base_rent_amount, annual_increment_percent, due_day, manual_status, document_name
) VALUES
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'G-02 - Royal Silks & Sarees', 'Bikash Agarwal', '+91 94350 99887', 'SS Road, Lakhtokia, Guwahati', '2022-04-01', '2028-03-31', 65000.00, 7.00, 10, NULL, 'RoyalSilks_Lease_Deed.pdf');

-- 4. Expired lease
INSERT INTO leases (
    id, property_id, shop_name, tenant_name, tenant_mobile, tenant_address,
    start_date, end_date, base_rent_amount, annual_increment_percent, due_day, manual_status, document_name
) VALUES
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Office 301 - CloudTech Solutions', 'Anupam Barman', '+91 97060 55443', 'Beltola Survey, Guwahati', '2023-01-01', (CURRENT_DATE - INTERVAL '15 days')::date, 42000.00, 8.00, 5, NULL, 'CloudTech_OfficeLease.pdf');

-- Insert Sample Rent Records for the current month
INSERT INTO rent_records (
    id, lease_id, month, amount, due_date, status, paid_date, notes
) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 42350.00, (TO_CHAR(CURRENT_DATE, 'YYYY-MM') || '-05')::date, 'Paid', CURRENT_DATE, 'Paid via NEFT Ref# 92837492'),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 30870.00, (TO_CHAR(CURRENT_DATE, 'YYYY-MM') || '-07')::date, 'Pending', NULL, 'Reminder SMS sent on 1st'),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 79658.00, (TO_CHAR(CURRENT_DATE, 'YYYY-MM') || '-10')::date, 'Paid', CURRENT_DATE, 'Cheque #881923 cleared');
