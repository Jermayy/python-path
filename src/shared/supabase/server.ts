import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAuthConfigured, publicConfig } from "@/shared/config";
import type { Database } from "./database.types";

export type ServerSupabase = SupabaseClient<Database>;

/** Cookie-bound client for route handlers and server actions. Null when auth isn't configured. */
export async function getServerSupabase(): Promise<ServerSupabase | null> {
  if (!isAuthConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicConfig.supabaseUrl!,
    publicConfig.supabasePublishableKey!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a context where cookies are read-only; the proxy refreshes sessions instead.
          }
        },
      },
    },
  );
}

/** Verified user id from the session JWT, or null. Never trust a client-supplied user id. */
export async function getVerifiedUserId(
  supabase: ServerSupabase,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}
