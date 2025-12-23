import { createClient } from "@supabase/supabase-js";

let supabase;
export const getSupabase = () => {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  return supabase;
};
