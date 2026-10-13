import { Hono } from 'hono';
import { Env, Lease } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { enrichLease } from '../utils/leaseCalc';
import { authMiddleware, AuthContext } from '../middleware/auth';

const leasesRoute = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// All lease operations require authenticated landlord
leasesRoute.use('*', authMiddleware);

// GET /api/leases - List all leases with calculated metrics and search/filter for this landlord
leasesRoute.get('/', async (c) => {
  try {
    const user = c.get('user');
    const supabase = getSupabaseClient(c.env);
    const search = c.req.query('search')?.toLowerCase();
    const statusFilter = c.req.query('status'); // 'Active' | 'Renewal Due' | 'Expired'
    const propertyId = c.req.query('property_id');

    // 1. Fetch properties belonging to this landlord
    const { data: userProps, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id);

    if (propErr) {
      return c.json({ success: false, error: propErr.message }, 500);
    }

    const propIds = (userProps || []).map((p: any) => p.id);
    if (propIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    // 2. Fetch leases under these properties
    let query = supabase
      .from('leases')
      .select('*, property:properties(id, name, address)')
      .in('property_id', propIds)
      .order('end_date', { ascending: true });

    if (propertyId) {
      if (!propIds.includes(propertyId)) {
        return c.json({ success: true, data: [] });
      }
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    let enriched: Lease[] = (data || []).map((l: any) => enrichLease(l));

    // Filter by search keyword
    if (search) {
      enriched = enriched.filter((l) => {
        const text = `${l.tenant_name} ${l.shop_name} ${l.property?.name || ''} ${l.tenant_mobile || ''}`.toLowerCase();
        return text.includes(search);
      });
    }

    // Filter by computed status
    if (statusFilter) {
      enriched = enriched.filter((l) => l.status === statusFilter);
    }

    return c.json({ success: true, data: enriched });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/leases/:id - Get single lease with details
leasesRoute.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from('leases')
      .select('*, property:properties(id, name, address, landlord_id)')
      .eq('id', id)
      .single();

    if (error || !data || (data.property as any)?.landlord_id !== user.id) {
      return c.json({ success: false, error: 'Lease not found or access denied' }, 404);
    }

    return c.json({ success: true, data: enrichLease(data) });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/leases - Create new lease under landlord's property
leasesRoute.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const {
      property_id,
      shop_name,
      tenant_name,
      tenant_email,
      tenant_mobile,
      tenant_address,
      start_date,
      end_date,
      base_rent_amount,
      annual_increment_percent,
      annual_increment_type,
      annual_increment_amount,
      due_day,
      manual_status,
      document_name,
      document_url
    } = body;

    if (!property_id || !shop_name || !tenant_name || !tenant_address || !start_date || !end_date) {
      return c.json({ success: false, error: 'All required lease fields must be filled.' }, 400);
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return c.json({ success: false, error: 'Rental end date must be after rental start date.' }, 400);
    }

    const supabase = getSupabaseClient(c.env);

    // Verify the target property belongs to this landlord
    const { data: prop } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('landlord_id', user.id)
      .maybeSingle();

    if (!prop) {
      return c.json({ success: false, error: 'Property not found or you do not have permission to attach leases to it.' }, 403);
    }

    let tenant_user_id: string | null = null;
    if (tenant_email) {
      const { data: matchedProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', tenant_email.trim())
        .maybeSingle();
      if (matchedProfile) {
        tenant_user_id = matchedProfile.id;
      }
    }

    const incType = annual_increment_type === 'fixed' ? 'fixed' : 'percent';
    const incAmount = Number(annual_increment_amount || 0);
    const incPercent = Number(annual_increment_percent || 0);

    const insertPayload: any = {
      property_id,
      shop_name: shop_name.trim(),
      tenant_name: tenant_name.trim(),
      tenant_email: tenant_email ? tenant_email.trim() : null,
      tenant_user_id: tenant_user_id,
      tenant_mobile: tenant_mobile ? tenant_mobile.trim() : null,
      tenant_address: tenant_address.trim(),
      start_date,
      end_date,
      base_rent_amount: Number(base_rent_amount),
      annual_increment_percent: incPercent,
      annual_increment_type: incType,
      annual_increment_amount: incAmount,
      due_day: Number(due_day || 5),
      manual_status: manual_status || null,
      document_name: document_name || null,
      document_url: document_url || null
    };

    let { data, error } = await supabase
      .from('leases')
      .insert([insertPayload])
      .select('*, property:properties(id, name, address)')
      .single();

    // Graceful fallback if columns have not yet been migrated in Supabase
    if (error && (error.code === '42703' || error.message.includes('annual_increment_'))) {
      delete insertPayload.annual_increment_type;
      delete insertPayload.annual_increment_amount;
      const retry = await supabase
        .from('leases')
        .insert([insertPayload])
        .select('*, property:properties(id, name, address)')
        .single();
      data = retry.data ? { ...retry.data, annual_increment_type: incType, annual_increment_amount: incAmount } : null;
      error = retry.error;
    }

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: enrichLease(data) }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/leases/:id - Update lease owned by this landlord
leasesRoute.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();
    const {
      property_id,
      shop_name,
      tenant_name,
      tenant_email,
      tenant_mobile,
      tenant_address,
      start_date,
      end_date,
      base_rent_amount,
      annual_increment_percent,
      annual_increment_type,
      annual_increment_amount,
      due_day,
      manual_status,
      document_name,
      document_url
    } = body;

    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      return c.json({ success: false, error: 'Rental end date must be after start date.' }, 400);
    }

    const supabase = getSupabaseClient(c.env);

    // Verify existing lease belongs to landlord
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id, property_id, property:properties(landlord_id)')
      .eq('id', id)
      .single();

    if (!existingLease || (existingLease.property as any)?.landlord_id !== user.id) {
      return c.json({ success: false, error: 'Lease not found or access denied' }, 403);
    }

    // If changing property_id, verify new property belongs to landlord
    if (property_id && property_id !== existingLease.property_id) {
      const { data: targetProp } = await supabase
        .from('properties')
        .select('id')
        .eq('id', property_id)
        .eq('landlord_id', user.id)
        .maybeSingle();

      if (!targetProp) {
        return c.json({ success: false, error: 'Selected property does not belong to your account.' }, 403);
      }
    }

    let tenant_user_id: string | null = undefined as any;
    if (tenant_email !== undefined) {
      if (tenant_email) {
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', tenant_email.trim())
          .maybeSingle();
        tenant_user_id = matchedProfile ? matchedProfile.id : null;
      } else {
        tenant_user_id = null;
      }
    }

    const updatePayload: any = {
      ...(property_id && { property_id }),
      ...(shop_name && { shop_name: shop_name.trim() }),
      ...(tenant_name && { tenant_name: tenant_name.trim() }),
      ...(tenant_email !== undefined && { tenant_email: tenant_email ? tenant_email.trim() : null }),
      ...(tenant_user_id !== undefined && { tenant_user_id }),
      ...(tenant_mobile !== undefined && { tenant_mobile: tenant_mobile ? tenant_mobile.trim() : null }),
      ...(tenant_address && { tenant_address: tenant_address.trim() }),
      ...(start_date && { start_date }),
      ...(end_date && { end_date }),
      ...(base_rent_amount !== undefined && { base_rent_amount: Number(base_rent_amount) }),
      ...(annual_increment_percent !== undefined && { annual_increment_percent: Number(annual_increment_percent) }),
      ...(annual_increment_type !== undefined && { annual_increment_type }),
      ...(annual_increment_amount !== undefined && { annual_increment_amount: Number(annual_increment_amount) }),
      ...(due_day !== undefined && { due_day: Number(due_day) }),
      manual_status: manual_status || null,
      ...(document_name !== undefined && { document_name: document_name || null }),
      ...(document_url !== undefined && { document_url: document_url || null })
    };

    let { data, error } = await supabase
      .from('leases')
      .update(updatePayload)
      .eq('id', id)
      .select('*, property:properties(id, name, address)')
      .single();

    if (error && (error.code === '42703' || error.message.includes('annual_increment_'))) {
      delete updatePayload.annual_increment_type;
      delete updatePayload.annual_increment_amount;
      const retry = await supabase
        .from('leases')
        .update(updatePayload)
        .eq('id', id)
        .select('*, property:properties(id, name, address)')
        .single();
      data = retry.data ? { ...retry.data, annual_increment_type, annual_increment_amount } : null;
      error = retry.error;
    }

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: enrichLease(data) });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/leases/:id - Delete lease owned by this landlord
leasesRoute.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);

    // Verify ownership before deleting
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id, property_id, property:properties(landlord_id)')
      .eq('id', id)
      .single();

    if (!existingLease || (existingLease.property as any)?.landlord_id !== user.id) {
      return c.json({ success: false, error: 'Lease not found or access denied' }, 403);
    }

    const { error } = await supabase
      .from('leases')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Lease deleted successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default leasesRoute;
