import { createClient } from '@supabase/supabase-js';

// Publishable key: safe to ship in the page. Access is limited by row-level security (see supabase/schema.sql).
export const supabase = createClient(
  'https://csdigcxpjqopjglfyhnn.supabase.co',
  'sb_publishable_sHn1oQA_0GSYLMK8XeWmAg_LPKz4psp',
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bloom-auth' } },
);
