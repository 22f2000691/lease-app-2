export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export type UserRole = 'landlord' | 'tenant';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  total_units: number;
  landlord_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Lease {
  id: string;
  property_id: string;
  shop_name: string;
  tenant_name: string;
  tenant_email?: string | null;
  tenant_user_id?: string | null;
  tenant_mobile?: string | null;
  tenant_address: string;
  start_date: string;
  end_date: string;
  base_rent_amount: number;
  annual_increment_percent: number;
  annual_increment_type?: 'percent' | 'fixed';
  annual_increment_amount?: number;
  due_day: number;
  manual_status?: string | null;
  document_name?: string | null;
  document_url?: string | null;
  created_at?: string;
  updated_at?: string;
  // Computed fields
  current_rent?: number;
  status?: 'Active' | 'Renewal Due' | 'Expired';
  days_remaining?: number;
  property?: Property;
}

export interface RentRecord {
  id: string;
  lease_id: string;
  month: string; // 'YYYY-MM'
  amount: number;
  due_date: string; // 'YYYY-MM-DD'
  status: 'Pending' | 'Paid' | 'Overdue';
  paid_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  lease?: Lease;
}

export interface DashboardSummary {
  activeLeasesCount: number;
  upcomingRenewalsCount: number;
  monthlyRentDue: number;
  monthlyRentCollected: number;
  currentMonth: string;
  recentLeases: Lease[];
  urgentRenewals: Lease[];
}

export interface TenantDashboardData {
  profile: UserProfile;
  lease: Lease | null;
  rents: RentRecord[];
  daysRemaining: number;
  currentMonthInvoice: RentRecord | null;
  landlordContact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}
