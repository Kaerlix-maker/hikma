import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 1. /dashboard: refresh the Supabase session; send signed-out visitors to /login.
 * 2. /chat/:id: set `Content-Security-Policy: frame-ancestors` from the
 *    assistant's allowed domains, so the widget can only be embedded on the
 *    owner's own websites (none listed = embeddable anywhere).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  if (!url || !key) return NextResponse.next({ request });

  const chat = path.match(/^\/chat\/([0-9a-f-]{36})$/i);
  if (chat) {
    const response = NextResponse.next({ request });
    let ancestors = "*";
    try {
      const r = await fetch(`${url}/rest/v1/assistants?id=eq.${chat[1]}&select=allowed_domains`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(3000),
      });
      const rows = (await r.json()) as { allowed_domains: string[] }[];
      const list = (rows[0]?.allowed_domains ?? []).filter((d) => /^https?:\/\/[a-z0-9.:-]+$/i.test(d));
      if (list.length) ancestors = `'self' ${list.join(" ")}`;
    } catch {
      ancestors = "'self'"; // fail closed
    }
    response.headers.set("Content-Security-Policy", `frame-ancestors ${ancestors}`);
    return response;
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && path.startsWith("/dashboard")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/chat/:id"],
};
