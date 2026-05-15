import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS. Use only in server code.
// Untyped: hand-written Database types don't support Supabase's
// select-query parser. Use the generated types when available.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
