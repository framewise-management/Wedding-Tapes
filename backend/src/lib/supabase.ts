import { createClient } from '@supabase/supabase-js';

// persistSession/autoRefreshToken/detectSessionInUrl must stay disabled --
// without them the Supabase client assumes a browser environment (touches
// localStorage, sets up refresh timers) and crashes the Node process. This
// was a hard-won fix on the previous NestJS deploy; do not remove it.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
