import { createClient } from "@supabase/supabase-js";

let supabase;
export const getSupabase = () => {
  // Live API polling remains available when browser Realtime credentials are
  // not configured. Server credentials must never be exposed to the client.
  if (!process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  return supabase;
};
