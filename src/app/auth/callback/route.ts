import { NextResponse, type NextRequest } from "next/server";
import { supabaseUser } from "@/lib/supabase/server";

/** Email-confirmation link lands here; exchange the code for a session. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const sb = await supabaseUser();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=confirm", request.url));
}
