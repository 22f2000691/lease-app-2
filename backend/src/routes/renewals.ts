import { Hono } from 'hono';
import { Env, Lease } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { enrichLease } from '../utils/leaseCalc';

const renewalsRoute = new Hono<{ Bindings: Env }>();

// GET /api/renewals - List all leases with renewals due (within 60 days)
renewalsRoute.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from('leases')
      .select('*, property:properties(id, name, address)')
      .order('end_date', { ascending: true });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    const enriched: Lease[] = (data || []).map((l: any) => enrichLease(l));
    const renewalDueLeases = enriched.filter((l) => l.status === 'Renewal Due');

    return c.json({
      success: true,
      count: renewalDueLeases.length,
      data: renewalDueLeases
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default renewalsRoute;
