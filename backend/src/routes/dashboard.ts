import { Hono } from 'hono';
import { Env, DashboardSummary } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { enrichLease, getCurrentMonthISO } from '../utils/leaseCalc';

const dashboardRoute = new Hono<{ Bindings: Env }>();

// GET /api/dashboard/summary - Key statistics and alerts
dashboardRoute.get('/summary', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const currentMonth = getCurrentMonthISO();

    // 1. Fetch all leases with property
    const { data: rawLeases, error: leaseErr } = await supabase
      .from('leases')
      .select('*, property:properties(id, name, address)')
      .order('end_date', { ascending: true });

    if (leaseErr) {
      return c.json({ success: false, error: leaseErr.message }, 500);
    }

    const enrichedLeases = (rawLeases || []).map((l: any) => enrichLease(l));

    const activeLeases = enrichedLeases.filter((l) => l.status === 'Active');
    const renewalLeases = enrichedLeases.filter((l) => l.status === 'Renewal Due');

    // 2. Fetch current month rent records
    const { data: rents, error: rentErr } = await supabase
      .from('rent_records')
      .select('amount, status')
      .eq('month', currentMonth);

    if (rentErr) {
      return c.json({ success: false, error: rentErr.message }, 500);
    }

    const monthlyRentDue = (rents || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const monthlyRentCollected = (rents || [])
      .filter((r: any) => r.status === 'Paid')
      .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

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
