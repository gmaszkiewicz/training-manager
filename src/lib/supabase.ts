import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";
import type { Database } from "@/db/database.types";

export function createClient(requestHeaders: Headers, cookies: AstroCookies): SupabaseClient<Database> | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(requestHeaders.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}

export function createCookieFreeClient(): SupabaseClient<Database> | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
    },
  });
}
