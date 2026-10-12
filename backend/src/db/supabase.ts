import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from '../types';

export function getSupabaseClient(env: Env): SupabaseClient {
  const url = env.SUPABASE_URL || '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';

  if (!url || !key || url.includes('your-project') || key.includes('your-supabase')) {
    // If credentials are not configured, throw a clear descriptive error
    throw new Error('Supabase credentials not configured in Cloudflare Worker environment. Please set SUPABASE_URL and SUPABASE_ANON_KEY (or use Mock Mode).');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
