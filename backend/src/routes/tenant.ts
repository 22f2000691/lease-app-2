import { Hono } from 'hono';
import { Env, TenantDashboardData, RentRecord } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { authMiddleware, requireRole, AuthContext } from '../middleware/auth';
import { enrichLease, getCurrentMonthISO, getTodayISO } from '../utils/leaseCalc';

const tenantRoute = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// All tenant routes require authentication and 'tenant' role
tenantRoute.use('*', authMiddleware);
tenantRoute.use('*', requireRole(['tenant']));

// GET /api/tenant/dashboard - Comprehensive dashboard for the logged in tenant
tenantRoute.get('/dashboard', async (c) => {
  try {
    const profile = c.get('profile')!;
    const supabase = getSupabaseClient(c.env);
    const today = getTodayISO();
    const currentMonth = getCurrentMonthISO();

    // 1. Fetch tenant lease matching user ID or email
    const { data: leases, error: leaseErr } = await supabase
      .from('leases')
      .select('*, property:properties(id, name, address, landlord_id)')
      .or(`tenant_user_id.eq.${profile.id},tenant_email.ilike.${profile.email}`)
      .order('end_date', { ascending: false });

    if (leaseErr) {
      return c.json({ success: false, error: leaseErr.message }, 500);
    }

    if (!leases || leases.length === 0) {
      const emptyDashboard: TenantDashboardData = {
        profile,
        lease: null,
        rents: [],
        daysRemaining: 0,
        currentMonthInvoice: null
      };
      return c.json({ success: true, data: emptyDashboard });
    }

    // Use primary active lease
    const rawLease = leases[0];
    const enriched = enrichLease(rawLease);

    // 2. Fetch rent records for this lease
    const { data: rawRents, error: rentErr } = await supabase
      .from('rent_records')
      .select('*')
      .eq('lease_id', rawLease.id)
      .order('month', { ascending: false });

    if (rentErr) {
      return c.json({ success: false, error: rentErr.message }, 500);
    }

    const rents: RentRecord[] = (rawRents || []).map((r: any) => {
      let status = r.status;
      if (status !== 'Paid' && r.due_date < today) {
        status = 'Overdue';
      }
      return {
        ...r,
        amount: Number(r.amount),
        status,
        lease: enriched
      };
    });

    const currentMonthInvoice = rents.find((r) => r.month === currentMonth) || null;

    // 3. Optional landlord info
    let landlordContact: any = undefined;
    if (rawLease.property?.landlord_id) {
      const { data: landlord } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', rawLease.property.landlord_id)
        .single();
      if (landlord) {
        landlordContact = {
          name: landlord.full_name,
          phone: landlord.phone,
          email: landlord.email
        };
      }
    }

    const dashboardData: TenantDashboardData = {
      profile,
      lease: enriched,
      rents,
      daysRemaining: enriched.days_remaining || 0,
      currentMonthInvoice,
      landlordContact
    };

    return c.json({ success: true, data: dashboardData });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/tenant/invoices - Invoices list
tenantRoute.get('/invoices', async (c) => {
  try {
    const profile = c.get('profile')!;
    const supabase = getSupabaseClient(c.env);
    const today = getTodayISO();

    const { data: leases } = await supabase
      .from('leases')
      .select('id')
      .or(`tenant_user_id.eq.${profile.id},tenant_email.ilike.${profile.email}`);

    if (!leases || leases.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const leaseIds = leases.map((l: any) => l.id);
    const { data: rawRents, error } = await supabase
      .from('rent_records')
      .select('*, lease:leases(*, property:properties(*))')
      .in('lease_id', leaseIds)
      .order('due_date', { ascending: false });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    const rents = (rawRents || []).map((r: any) => {
      let status = r.status;
      if (status !== 'Paid' && r.due_date < today) {
        status = 'Overdue';
      }
      return { ...r, amount: Number(r.amount), status };
    });

    return c.json({ success: true, data: rents });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default tenantRoute;
