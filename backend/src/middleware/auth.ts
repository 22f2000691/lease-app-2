import { Context, Next } from 'hono';
import { Env, UserProfile } from '../types';
import { getSupabaseClient } from '../db/supabase';

export interface AuthContext {
  user: { id: string; email?: string };
  profile: UserProfile | null;
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: AuthContext }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Authorization token required' }, 401);
  }

  const token = authHeader.substring(7).trim();
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ success: false, error: 'Invalid or expired session token' }, 401);
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    c.set('user', { id: user.id, email: user.email });
    c.set('profile', profile || {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || 'User',
      role: (user.user_metadata?.role as any) || 'landlord'
    });

    await next();
  } catch (err: any) {
    return c.json({ success: false, error: 'Authentication verification failed: ' + err.message }, 401);
  }
}

export function requireRole(allowedRoles: ('landlord' | 'tenant')[]) {
  return async (c: Context<{ Bindings: Env; Variables: AuthContext }>, next: Next) => {
    const profile = c.get('profile');
    if (!profile || !allowedRoles.includes(profile.role)) {
      return c.json({ success: false, error: 'Access denied: insufficient permissions for this portal' }, 403);
    }
    await next();
  };
}
