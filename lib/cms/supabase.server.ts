import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/cms/env";

export function createSupabaseAdminClient() {
  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
