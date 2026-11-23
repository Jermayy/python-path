"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAuthConfigured, publicConfig } from "@/shared/config";
import type { Database } from "./database.types";

export type BrowserSupabase = SupabaseClient<Database>;

let client: BrowserSupabase | null = null;

/** Returns null in guest-only deployments (Supabase not configured). */
export function getBrowserSupabase(): BrowserSupabase | null {
  if (!isAuthConfigured) return null;
  client ??= createBrowserClient<Database>(
    publicConfig.supabaseUrl!,
    publicConfig.supabasePublishableKey!,
  );
  return client;
}
