import { Hono } from 'hono';
import { Env, Property } from '../types';
import { getSupabaseClient } from '../db/supabase';

const propertiesRoute = new Hono<{ Bindings: Env }>();

// GET /api/properties - List all properties
propertiesRoute.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/properties/:id - Get single property
propertiesRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return c.json({ success: false, error: error?.message || 'Property not found' }, 404);
    }

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/properties - Create property
propertiesRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, address, total_units } = body;

    if (!name || !address) {
      return c.json({ success: false, error: 'Name and address are required' }, 400);
    }

    const supabase = getSupabaseClient(c.env);
    const { data, error } = await supabase
      .from('properties')
      .insert([{
        name: name.trim(),
        address: address.trim(),
        total_units: Number(total_units || 0)
      }])
      .select()
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/properties/:id - Update property
propertiesRoute.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, address, total_units } = body;

    const supabase = getSupabaseClient(c.env);
    const { data, error } = await supabase
      .from('properties')
      .update({
        name: name?.trim(),
        address: address?.trim(),
        total_units: Number(total_units || 0)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/properties/:id - Delete property (with dependency check)
propertiesRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);

    // Check if property is currently referenced by any leases
    const { count, error: countErr } = await supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', id);

    if (countErr) {
      return c.json({ success: false, error: countErr.message }, 500);
    }

    if (count && count > 0) {
      return c.json({
        success: false,
        error: `Cannot delete property: ${count} lease(s) are currently attached to it. Please reassign or delete the leases first.`
      }, 400);
    }

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Property deleted successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default propertiesRoute;
