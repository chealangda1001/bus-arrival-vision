// Service role client for super admin operations that bypass RLS
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://eguoekxuwnerumhehheo.supabase.co";

// This will be available in Edge Functions as process.env.SUPABASE_SERVICE_ROLE_KEY
// For frontend usage, we'll handle this differently
export const createServiceRoleClient = (serviceRoleKey: string) => {
  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};