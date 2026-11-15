"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeOrigin } from "@/lib/knowledge";
import { supabaseUser } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | null;

async function requireUser() {
  const sb = await supabaseUser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return { sb, user };
}

export async function createAssistant(_: FormState, form: FormData): Promise<FormState> {
  const { sb, user } = await requireUser();
  const name = z.string().trim().min(2, "Business name is too short.").max(80).safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const { data, error } = await sb.from("assistants").insert({ owner_id: user.id, name: name.data }).select("id").single();
  if (error || !data) return { error: error?.code === "42501" ? "You can create up to 3 assistants." : "Could not create the assistant." };
  redirect(`/dashboard/${data.id}`);
}

const Settings = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(80),
  bot_name: z.string().trim().min(1).max(40),
  welcome: z.string().trim().max(300),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour."),
  allowed_domains: z.string().max(1000),
});

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const { sb } = await requireUser();
  const p = Settings.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const raw = p.data.allowed_domains.split(/[\s,]+/).filter(Boolean);
  const domains = raw.map(normalizeOrigin);
  if (domains.some((d) => d === null)) return { error: "Each website must be a valid https:// address." };
  if (domains.length > 10) return { error: "Up to 10 websites." };
  const { id, allowed_domains: _ignored, ...rest } = p.data;
  void _ignored;
  // RLS makes sure this only updates the caller's own assistant.
  const { error, count } = await sb.from("assistants").update({ ...rest, allowed_domains: [...new Set(domains as string[])] }, { count: "exact" }).eq("id", id);
  if (error || !count) return { error: "Could not save." };
  revalidatePath(`/dashboard/${id}`);
  return { success: "Saved." };
}

export async function saveKnowledge(_: FormState, form: FormData): Promise<FormState> {
  const { sb } = await requireUser();
  const p = z.object({ id: z.uuid(), knowledge: z.string().max(40000, "Max 40,000 characters.") }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { error, count } = await sb.from("assistants").update({ knowledge: p.data.knowledge }, { count: "exact" }).eq("id", p.data.id);
  if (error || !count) return { error: "Could not save." };
  revalidatePath(`/dashboard/${p.data.id}`);
  return { success: "Saved — your assistant now uses this information." };
}

export async function markLead(form: FormData) {
  const { sb } = await requireUser();
  const id = z.coerce.number().int().parse(form.get("id"));
  await sb.from("leads").update({ handled: true }).eq("id", id);
  revalidatePath(`/dashboard/${String(form.get("assistant"))}`);
}

export async function deleteAssistant(form: FormData) {
  const { sb } = await requireUser();
  await sb.from("assistants").delete().eq("id", z.uuid().parse(form.get("id")));
  redirect("/dashboard");
}
