import { Hono } from 'hono';
import { Env, Lease } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { enrichLease } from '../utils/leaseCalc';

const leasesRoute = new Hono<{ Bindings: Env }>();

// GET /api/leases - List all leases with calculated metrics and search/filter
leasesRoute.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const search = c.req.query('search')?.toLowerCase();
    const statusFilter = c.req.query('status'); // 'Active' | 'Renewal Due' | 'Expired'
    const propertyId = c.req.query('property_id');

    let query = supabase
      .from('leases')
      .select('*, property:properties(id, name, address)')
      .order('end_date', { ascending: true });

    if (propertyId) {
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
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from('leases')
      .select('*, property:properties(id, name, address)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return c.json({ success: false, error: error?.message || 'Lease not found' }, 404);
    }

    return c.json({ success: true, data: enrichLease(data) });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/leases - Create new lease
leasesRoute.post('/', async (c) => {
  try {
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

    const { data, error } = await supabase
      .from('leases')
      .insert([{
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
        annual_increment_percent: Number(annual_increment_percent || 0),
        due_day: Number(due_day || 5),
        manual_status: manual_status || null,
        document_name: document_name || null,
        document_url: document_url || null
      }])
      .select('*, property:properties(id, name, address)')
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: enrichLease(data) }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/leases/:id - Update lease
leasesRoute.put('/:id', async (c) => {
  try {
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
      due_day,
      manual_status,
      document_name,
      document_url
    } = body;

    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      return c.json({ success: false, error: 'Rental end date must be after start date.' }, 400);
    }

    const supabase = getSupabaseClient(c.env);

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

    const { data, error } = await supabase
      .from('leases')
      .update({
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
        ...(due_day !== undefined && { due_day: Number(due_day) }),
        manual_status: manual_status || null,
        ...(document_name !== undefined && { document_name: document_name || null }),
        ...(document_url !== undefined && { document_url: document_url || null })
      })
      .eq('id', id)
      .select('*, property:properties(id, name, address)')
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: enrichLease(data) });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/leases/:id - Delete lease
leasesRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);

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

// POST /api/leases/upload-signed-url - Generate presigned upload URL for Supabase storage
leasesRoute.post('/upload-signed-url', async (c) => {
  try {
    const body = await c.req.json();
    const { filename } = body;
    if (!filename) {
      return c.json({ success: false, error: 'Filename is required' }, 400);
    }

    const supabase = getSupabaseClient(c.env);
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `agreements/${Date.now()}_${cleanName}`;

    const { data, error } = await supabase.storage
      .from('lease-documents')
      .createSignedUploadUrl(storagePath);

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    // Also get public URL
    const { data: pubUrl } = supabase.storage
      .from('lease-documents')
      .getPublicUrl(storagePath);

    return c.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        path: storagePath,
        token: data.token,
        publicUrl: pubUrl.publicUrl
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default leasesRoute;
