import { Hono } from 'hono';
import { Env, RentRecord } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { buildDueDate, calculateCurrentRent, getCurrentMonthISO, getTodayISO } from '../utils/leaseCalc';
import { authMiddleware, AuthContext } from '../middleware/auth';

const rentsRoute = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// All rent operations require authenticated landlord
rentsRoute.use('*', authMiddleware);

// GET /api/rents - List rent records for a month for this landlord's leases
rentsRoute.get('/', async (c) => {
  try {
    const user = c.get('user');
    const month = c.req.query('month') || getCurrentMonthISO();
    const supabase = getSupabaseClient(c.env);

    // 1. Fetch properties belonging to landlord
    const { data: userProps, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id);

    if (propErr) {
      return c.json({ success: false, error: propErr.message }, 500);
    }

    const propIds = (userProps || []).map((p: any) => p.id);
    if (propIds.length === 0) {
      return c.json({ success: true, data: [], month });
    }

    // 2. Fetch leases under these properties
    const { data: userLeases, error: leaseErr } = await supabase
      .from('leases')
      .select('id')
      .in('property_id', propIds);

    if (leaseErr) {
      return c.json({ success: false, error: leaseErr.message }, 500);
    }

    const leaseIds = (userLeases || []).map((l: any) => l.id);
    if (leaseIds.length === 0) {
      return c.json({ success: true, data: [], month });
    }

    // 3. Fetch rent records for these leases
    const { data, error } = await supabase
      .from('rent_records')
      .select('*, lease:leases(*, property:properties(*))')
      .eq('month', month)
      .in('lease_id', leaseIds)
      .order('due_date', { ascending: true });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    const today = getTodayISO();
    const records: RentRecord[] = (data || []).map((r: any) => {
      let status = r.status;
      if (status !== 'Paid' && r.due_date < today) {
        status = 'Overdue';
      }
      return {
        ...r,
        amount: Number(r.amount),
        status
      };
    });

    return c.json({ success: true, data: records, month });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/rents/generate - Generate rent records for all active leases belonging to this landlord
rentsRoute.post('/generate', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const month = body.month || getCurrentMonthISO();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return c.json({ success: false, error: 'Month must be in YYYY-MM format' }, 400);
    }

    const supabase = getSupabaseClient(c.env);

    // Fetch properties for this landlord
    const { data: userProps } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id);

    const propIds = (userProps || []).map((p: any) => p.id);
    if (propIds.length === 0) {
      return c.json({
        success: true,
        message: 'No properties found for your account. Please register a property and tenant lease first.',
        generatedCount: 0
      });
    }

    // Fetch leases belonging to this landlord
    const { data: leases, error: leaseErr } = await supabase
      .from('leases')
      .select('*')
      .in('property_id', propIds);

    if (leaseErr) {
      return c.json({ success: false, error: leaseErr.message }, 500);
    }

    if (!leases || leases.length === 0) {
      return c.json({
        success: true,
        message: 'No active leases found for your properties.',
        generatedCount: 0
      });
    }

    const leaseIds = leases.map((l: any) => l.id);

    // Fetch existing records for this month to avoid duplicates
    const { data: existingRents, error: rentErr } = await supabase
      .from('rent_records')
      .select('lease_id')
      .eq('month', month)
      .in('lease_id', leaseIds);

    if (rentErr) {
      return c.json({ success: false, error: rentErr.message }, 500);
    }

    const existingLeaseIds = new Set((existingRents || []).map((r: any) => r.lease_id));
    const targetDate = new Date(`${month}-15T00:00:00Z`);

    const newRecordsToInsert: any[] = [];

    for (const lease of leases) {
      const leaseStartMonth = lease.start_date.slice(0, 7);
      const leaseEndMonth = lease.end_date.slice(0, 7);

      // Check if lease was active during this month
      if (month < leaseStartMonth || month > leaseEndMonth) {
        continue;
      }

      // Check if already generated
      if (existingLeaseIds.has(lease.id)) {
        continue;
      }

      const rentAmount = calculateCurrentRent({
        start_date: lease.start_date,
        base_rent_amount: Number(lease.base_rent_amount),
        annual_increment_percent: Number(lease.annual_increment_percent || 0),
        annual_increment_type: lease.annual_increment_type,
        annual_increment_amount: Number(lease.annual_increment_amount || 0)
      }, targetDate);

      const dueDate = buildDueDate(month, lease.due_day || 5);

      newRecordsToInsert.push({
        lease_id: lease.id,
        month,
        amount: rentAmount,
        due_date: dueDate,
        status: 'Pending',
        paid_date: null
      });
    }

    if (newRecordsToInsert.length === 0) {
      return c.json({
        success: true,
        message: 'No new rent records needed for this month. All active leases are already generated or outside term.',
        generatedCount: 0
      });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('rent_records')
      .insert(newRecordsToInsert)
      .select('*, lease:leases(*, property:properties(*))');

    if (insertErr) {
      return c.json({ success: false, error: insertErr.message }, 500);
    }

    return c.json({
      success: true,
      message: `Successfully generated ${inserted?.length || 0} rent records for ${month}.`,
      generatedCount: inserted?.length || 0,
      data: inserted
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PATCH /api/rents/:id/status - Toggle Paid / Pending status
rentsRoute.patch('/:id/status', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, notes } = body; // 'Paid' | 'Pending'

    if (!['Paid', 'Pending'].includes(status)) {
      return c.json({ success: false, error: "Status must be 'Paid' or 'Pending'" }, 400);
    }

    const supabase = getSupabaseClient(c.env);

    // Verify ownership through lease and property
    const { data: existingRent, error: fetchErr } = await supabase
      .from('rent_records')
      .select('id, lease:leases(id, property:properties(landlord_id))')
      .eq('id', id)
      .single();

    if (fetchErr || !existingRent || (existingRent.lease as any)?.property?.landlord_id !== user.id) {
      return c.json({ success: false, error: 'Rent invoice not found or access denied' }, 403);
    }

    const today = getTodayISO();
    const paidDate = status === 'Paid' ? (body.paid_date || today) : null;

    const { data, error } = await supabase
      .from('rent_records')
      .update({
        status,
        paid_date: paidDate,
        ...(notes !== undefined && { notes })
      })
      .eq('id', id)
      .select('*, lease:leases(*, property:properties(*))')
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/rents/:id - Delete a rent record
rentsRoute.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);

    // Verify ownership through lease and property
    const { data: existingRent, error: fetchErr } = await supabase
      .from('rent_records')
      .select('id, lease:leases(id, property:properties(landlord_id))')
      .eq('id', id)
      .single();

    if (fetchErr || !existingRent || (existingRent.lease as any)?.property?.landlord_id !== user.id) {
      return c.json({ success: false, error: 'Rent invoice not found or access denied' }, 403);
    }

    const { error } = await supabase
      .from('rent_records')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Rent record deleted' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default rentsRoute;
