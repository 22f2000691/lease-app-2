import { Hono } from 'hono';
import { Env, UserProfile } from '../types';
import { getSupabaseClient } from '../db/supabase';
import { authMiddleware, AuthContext } from '../middleware/auth';

const authRoute = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// POST /api/auth/register
authRoute.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, full_name, phone, role } = body;

    if (!email || !password || !full_name) {
      return c.json({ success: false, error: 'Email, password, and full name are required' }, 400);
    }

    const assignedRole = role === 'tenant' ? 'tenant' : 'landlord';
    const supabase = getSupabaseClient(c.env);

    // Register user with Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: full_name.trim(),
          phone: phone ? phone.trim() : null,
          role: assignedRole
        }
      }
    });

    if (authErr) {
      return c.json({ success: false, error: authErr.message }, 400);
    }

    const user = authData.user;
    if (!user) {
      return c.json({ success: false, error: 'Failed to create user account' }, 500);
    }

    // Upsert into profiles table
    const profile: UserProfile = {
      id: user.id,
      email: user.email || email.trim(),
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      role: assignedRole
    };

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert([profile]);

    if (profileErr) {
      console.warn('Profile upsert note:', profileErr.message);
    }

    // If tenant, auto-link any existing lease with matching email
    if (assignedRole === 'tenant') {
      await supabase
        .from('leases')
        .update({ tenant_user_id: user.id })
        .ilike('tenant_email', email.trim());
    }

    return c.json({
      success: true,
      message: 'Account registered successfully',
      data: {
        user: { id: user.id, email: user.email },
        profile,
        session: authData.session
      }
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/auth/login
authRoute.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    const supabase = getSupabaseClient(c.env);
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (authErr || !authData.user || !authData.session) {
      return c.json({ success: false, error: authErr?.message || 'Invalid email or password' }, 401);
    }

    // Retrieve profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (!profile) {
      // Fallback create profile if missing
      profile = {
        id: authData.user.id,
        email: authData.user.email || email.trim(),
        full_name: authData.user.user_metadata?.full_name || 'User',
        phone: authData.user.user_metadata?.phone || null,
        role: (authData.user.user_metadata?.role as any) || 'landlord'
      };
      await supabase.from('profiles').upsert([profile]);
    }

    // Auto-link tenant leases on login if tenant
    if (profile.role === 'tenant') {
      await supabase
        .from('leases')
        .update({ tenant_user_id: profile.id })
        .ilike('tenant_email', profile.email)
        .is('tenant_user_id', null);
    }

    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: authData.user.id, email: authData.user.email },
        profile,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at
        }
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/auth/me
authRoute.get('/me', authMiddleware, async (c) => {
  const profile = c.get('profile');
  return c.json({ success: true, data: profile });
});

export default authRoute;
