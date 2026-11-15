import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types";

/** Client acting as the signed-in user (RLS applies). */
export async function supabaseUser() {
  const store = await cookies();
  return createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}

/**
 * Anonymous client with no session — used on public chat pages, so a
 * logged-in operator browsing someone else's page still only gets public data.
 */
export function supabasePublic() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client. Bypasses RLS — only for reserve/confirm and Stripe webhooks. */
export function supabaseAdmin() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The signed-in user and their operator (or null). */
export async function getSession() {
  const sb = await supabaseUser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, operator: null };
  const { data: operator } = await sb.from("operators").select("*").eq("owner_id", user.id).maybeSingle();
  return { sb, user, operator };
}
