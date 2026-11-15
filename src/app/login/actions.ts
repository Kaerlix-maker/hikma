"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { supabaseUser } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string } | null;

const Creds = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

/** Only allow redirects to our own pages (prevents open-redirect phishing). */
const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Creds.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const sb = await supabaseUser();
  const { error } = await sb.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: "Wrong email or password." };
  redirect(safeNext(parsed.data.next));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Creds.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const sb = await supabaseUser();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${env.siteUrl()}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/dashboard"); // email confirmation disabled
  return { success: "Check your inbox to confirm your email, then sign in." };
}

export async function signOut() {
  const sb = await supabaseUser();
  await sb.auth.signOut();
  redirect("/");
}
