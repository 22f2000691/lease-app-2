import { Hono } from 'hono';
import { Env, Lease } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { enrichLease } from '../utils/leaseCalc';
import { authMiddleware, AuthContext } from '../middleware/auth';

const renewalsRoute = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// All renewals operations require authenticated landlord
renewalsRoute.use('*', authMiddleware);

// GET /api/renewals - List all leases with renewals due (within 60 days) for this landlord
renewalsRoute.get('/', async (c) => {
  try {
    const user = c.get('user');
    const supabase = getSupabaseClient(c.env);

    // Fetch properties for this landlord
    const { data: userProps, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id);

    if (propErr) {
      return c.json({ success: false, error: propErr.message }, 500);
    }

    const propIds = (userProps || []).map((p: any) => p.id);
    if (propIds.length === 0) {
      return c.json({
        success: true,
        count: 0,
        data: []
      });
    }

    const { data, error } = await supabase
      .from('leases')
      .select('*, property:properties(id, name, address)')
      .in('property_id', propIds)
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
