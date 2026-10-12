import { Hono } from 'hono';
import { Env, RentRecord } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { buildDueDate, calculateCurrentRent, getCurrentMonthISO, getTodayISO } from '../utils/leaseCalc';

const rentsRoute = new Hono<{ Bindings: Env }>();

// GET /api/rents - List rent records for a month (default current month)
rentsRoute.get('/', async (c) => {
  try {
    const month = c.req.query('month') || getCurrentMonthISO();
    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from('rent_records')
      .select('*, lease:leases(*, property:properties(*))')
      .eq('month', month)
      .order('due_date', { ascending: true });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    const today = getTodayISO();
    // Compute dynamic overdue state if not paid and due_date < today
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

// POST /api/rents/generate - Generate rent records for all active leases for a given month
rentsRoute.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const month = body.month || getCurrentMonthISO();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return c.json({ success: false, error: 'Month must be in YYYY-MM format' }, 400);
    }

    const supabase = getSupabaseClient(c.env);

    // Fetch all leases
    const { data: leases, error: leaseErr } = await supabase
      .from('leases')
      .select('*');

    if (leaseErr) {
      return c.json({ success: false, error: leaseErr.message }, 500);
    }

    // Fetch existing records for this month to avoid duplicates
    const { data: existingRents, error: rentErr } = await supabase
      .from('rent_records')
      .select('lease_id')
      .eq('month', month);

    if (rentErr) {
      return c.json({ success: false, error: rentErr.message }, 500);
    }

    const existingLeaseIds = new Set((existingRents || []).map((r: any) => r.lease_id));
    const targetDate = new Date(`${month}-15T00:00:00Z`);

    const newRecordsToInsert: any[] = [];

    for (const lease of (leases || [])) {
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
        annual_increment_percent: Number(lease.annual_increment_percent || 0)
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
        message: 'No new rent records needed for this month. All active leases are already generated or no leases active.',
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
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, notes } = body; // 'Paid' | 'Pending'

    if (!['Paid', 'Pending'].includes(status)) {
      return c.json({ success: false, error: "Status must be 'Paid' or 'Pending'" }, 400);
    }

    const today = getTodayISO();
    const paidDate = status === 'Paid' ? (body.paid_date || today) : null;

    const supabase = getSupabaseClient(c.env);
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
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);

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
