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

    let user: any = null;

    // 1. Attempt creating pre-confirmed user via Supabase admin API
    try {
      const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          phone: phone ? phone.trim() : null,
          role: assignedRole
        }
      });

      if (adminData?.user) {
        user = adminData.user;
      } else if (adminErr) {
        if (
          adminErr.message?.toLowerCase().includes('already') ||
          adminErr.message?.toLowerCase().includes('exists')
        ) {
          // If already registered, make sure email is confirmed so user can log in
          try {
            const { data: userList } = await supabase.auth.admin.listUsers();
            const existing = userList?.users?.find(
              (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
            );
            if (existing) {
              await supabase.auth.admin.updateUserById(existing.id, { email_confirm: true });
            }
          } catch {}
          return c.json(
            { success: false, error: 'An account with this email already exists. Please sign in.' },
            400
          );
        }
        console.warn('admin.createUser note:', adminErr.message);
      }
    } catch (adminEx: any) {
      console.warn('admin.createUser exception:', adminEx.message);
    }

    // 2. Fallback to standard signUp if admin API was not available
    if (!user) {
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

      user = authData.user;
      if (!user) {
        return c.json({ success: false, error: 'Failed to create user account' }, 500);
      }

      // Try auto-confirming newly created user
      try {
        await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
      } catch {}
    }

    // 3. Upsert into profiles table
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

    // 4. If tenant, auto-link any existing lease with matching email
    if (assignedRole === 'tenant') {
      await supabase
        .from('leases')
        .update({ tenant_user_id: user.id })
        .ilike('tenant_email', email.trim());
    }

    // 5. Sign in automatically to obtain an active session for the frontend
    let session = null;
    try {
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      session = loginData?.session || null;
    } catch (loginEx) {
      console.warn('Auto sign-in error:', loginEx);
    }

    return c.json(
      {
        success: true,
        message: 'Account registered successfully',
        data: {
          user: { id: user.id, email: user.email },
          profile,
          session: session
            ? {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at
              }
            : null
        }
      },
      201
    );
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
    let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    // Auto-heal if unconfirmed email error occurs
    if (authErr && authErr.message && authErr.message.toLowerCase().includes('not confirmed')) {
      try {
        const { data: userList } = await supabase.auth.admin.listUsers();
        const existingUser = userList?.users?.find(
          (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
        );
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
          // Retry sign-in now that user is confirmed
          const retry = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });
          if (retry.data?.session && retry.data?.user) {
            authData = retry.data;
            authErr = null;
          }
        }
      } catch (confirmEx) {
        console.warn('Auto-confirm attempt error:', confirmEx);
      }
    }

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
