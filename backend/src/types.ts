export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  total_units: number;
  created_at?: string;
  updated_at?: string;
}

export interface Lease {
  id: string;
  property_id: string;
  shop_name: string;
  tenant_name: string;
  tenant_mobile?: string | null;
  tenant_address: string;
  start_date: string;
  end_date: string;
  base_rent_amount: number;
  annual_increment_percent: number;
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
