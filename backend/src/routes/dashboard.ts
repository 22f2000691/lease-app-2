import { Hono } from 'hono';
import { Env, DashboardSummary } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { enrichLease, getCurrentMonthISO } from '../utils/leaseCalc';
import { authMiddleware, AuthContext } from '../middleware/auth';

const dashboardRoute = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// Dashboard metrics must be strictly scoped to the authenticated landlord
dashboardRoute.use('*', authMiddleware);

// GET /api/dashboard/summary - Key statistics and alerts for this landlord
dashboardRoute.get('/summary', async (c) => {
  try {
    const user = c.get('user');
    const supabase = getSupabaseClient(c.env);
    const currentMonth = getCurrentMonthISO();

    // 1. Fetch properties for this landlord
    const { data: userProps, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id);

    if (propErr) {
      return c.json({ success: false, error: propErr.message }, 500);
    }

    const propIds = (userProps || []).map((p: any) => p.id);
    if (propIds.length === 0) {
      const emptySummary: DashboardSummary = {
        activeLeasesCount: 0,
        upcomingRenewalsCount: 0,
        monthlyRentDue: 0,
        monthlyRentCollected: 0,
        currentMonth,
        recentLeases: [],
        urgentRenewals: []
      };
      return c.json({ success: true, data: emptySummary });
    }

    // 2. Fetch leases under this landlord's properties
    const { data: rawLeases, error: leaseErr } = await supabase
      .from('leases')
      .select('*, property:properties(id, name, address)')
      .in('property_id', propIds)
      .order('end_date', { ascending: true });

    if (leaseErr) {
      return c.json({ success: false, error: leaseErr.message }, 500);
    }

    const enrichedLeases = (rawLeases || []).map((l: any) => enrichLease(l));
    const activeLeases = enrichedLeases.filter((l) => l.status === 'Active');
    const renewalLeases = enrichedLeases.filter((l) => l.status === 'Renewal Due');

    // 3. Fetch current month rent records for this landlord's leases
    const leaseIds = enrichedLeases.map((l) => l.id);
    let monthlyRentDue = 0;
    let monthlyRentCollected = 0;

    if (leaseIds.length > 0) {
      const { data: rents, error: rentErr } = await supabase
        .from('rent_records')
        .select('amount, status')
        .eq('month', currentMonth)
        .in('lease_id', leaseIds);

      if (!rentErr && rents) {
        monthlyRentDue = rents.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
        monthlyRentCollected = rents
          .filter((r: any) => r.status === 'Paid')
          .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
      }
    }

    const summary: DashboardSummary = {
      activeLeasesCount: activeLeases.length,
      upcomingRenewalsCount: renewalLeases.length,
      monthlyRentDue: Math.round(monthlyRentDue * 100) / 100,
      monthlyRentCollected: Math.round(monthlyRentCollected * 100) / 100,
      currentMonth,
      recentLeases: enrichedLeases.slice(0, 8),
      urgentRenewals: renewalLeases.slice(0, 5)
    };

    return c.json({ success: true, data: summary });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default dashboardRoute;
