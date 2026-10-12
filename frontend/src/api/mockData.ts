import { Property, Lease, RentRecord } from '../types';
import { getTodayISO, getCurrentMonthISO } from '../utils/formatters';

const today = getTodayISO();
const currentMonth = getCurrentMonthISO();

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    name: 'City Centre Complex',
    address: 'GS Road, Dispur, Guwahati - 781005',
    total_units: 12
  },
  {
    id: 'prop-2',
    name: 'Fancy Bazar Commercial Hub',
    address: 'Hem Baruah Rd, Fancy Bazar, Guwahati - 781001',
    total_units: 8
  },
  {
    id: 'prop-3',
    name: 'Metro Heights Tower',
    address: 'Zoo Road, Near Central Mall, Guwahati - 781024',
    total_units: 15
  }
];

// Calculate future date ~18 days from today for Renewal Due demo
const renewalDate = new Date();
renewalDate.setDate(renewalDate.getDate() + 18);
const renewalDateISO = renewalDate.toISOString().slice(0, 10);

// Calculate expired date ~14 days ago
const expiredDate = new Date();
expiredDate.setDate(expiredDate.getDate() - 14);
const expiredDateISO = expiredDate.toISOString().slice(0, 10);

export const INITIAL_LEASES: Lease[] = [
  {
    id: 'lease-1',
    property_id: 'prop-1',
    shop_name: 'Shop 101 - Apex Electronics',
    tenant_name: 'Rajesh Sharma',
    tenant_mobile: '+91 98765 43210',
    tenant_address: 'House 42, Christian Basti, Guwahati',
    start_date: '2024-01-01',
    end_date: '2027-12-31',
    base_rent_amount: 35000,
    annual_increment_percent: 10,
    due_day: 5,
    manual_status: null,
    document_name: 'Apex_Lease_Agreement_2024.pdf',
    document_url: null
  },
  {
    id: 'lease-2',
    property_id: 'prop-1',
    shop_name: 'Unit 204 - Cafe Mocha',
    tenant_name: 'Priyanka Das',
    tenant_mobile: '+91 98540 12345',
    tenant_address: 'Boruah Enclave, Ulubari, Guwahati',
    start_date: '2023-11-01',
    end_date: renewalDateISO, // Ends in 18 days!
    base_rent_amount: 28000,
    annual_increment_percent: 5,
    due_day: 7,
    manual_status: null,
    document_name: 'Cafe_Mocha_Agreement.pdf',
    document_url: null
  },
  {
    id: 'lease-3',
    property_id: 'prop-2',
    shop_name: 'G-02 - Royal Silks & Sarees',
    tenant_name: 'Bikash Agarwal',
    tenant_mobile: '+91 94350 99887',
    tenant_address: 'SS Road, Lakhtokia, Guwahati',
    start_date: '2022-04-01',
    end_date: '2028-03-31',
    base_rent_amount: 65000,
    annual_increment_percent: 7,
    due_day: 10,
    manual_status: null,
    document_name: 'RoyalSilks_Lease_Deed.pdf',
    document_url: null
  },
  {
    id: 'lease-4',
    property_id: 'prop-3',
    shop_name: 'Office 301 - CloudTech Solutions',
    tenant_name: 'Anupam Barman',
    tenant_mobile: '+91 97060 55443',
    tenant_address: 'Beltola Survey, Guwahati',
    start_date: '2023-01-01',
    end_date: expiredDateISO, // Expired
    base_rent_amount: 42000,
    annual_increment_percent: 8,
    due_day: 5,
    manual_status: null,
    document_name: 'CloudTech_OfficeLease.pdf',
    document_url: null
  }
];

export const INITIAL_RENTS: RentRecord[] = [
  {
    id: 'rent-1',
    lease_id: 'lease-1',
    month: currentMonth,
    amount: 42350,
    due_date: `${currentMonth}-05`,
    status: 'Paid',
    paid_date: today,
    notes: 'Paid via NEFT Ref# 92837492'
  },
  {
    id: 'rent-2',
    lease_id: 'lease-2',
    month: currentMonth,
    amount: 30870,
    due_date: `${currentMonth}-07`,
    status: 'Pending',
    paid_date: null,
    notes: 'Automated SMS reminder dispatched'
  },
  {
    id: 'rent-3',
    lease_id: 'lease-3',
    month: currentMonth,
    amount: 79658,
    due_date: `${currentMonth}-10`,
    status: 'Paid',
    paid_date: today,
    notes: 'Cheque #881923 cleared'
  }
];
