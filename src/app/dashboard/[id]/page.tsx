import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChatWindow } from "@/components/ChatWindow";
import { env } from "@/lib/env";
import { splitSections } from "@/lib/knowledge";
import { supabaseUser } from "@/lib/supabase/server";
import { deleteAssistant, markLead } from "../actions";
import { CopyBox, KnowledgeForm, SettingsForm } from "./forms";

export const metadata: Metadata = { title: "Assistant" };

export default async function AssistantPage({ params }: PageProps<"/dashboard/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const sb = await supabaseUser();
  const { data: a } = await sb.from("assistants").select("*").eq("id", id).maybeSingle(); // RLS: own only
  if (!a) notFound();

  const [{ data: stats }, { data: leads }, { data: questions }] = await Promise.all([
    sb.rpc("assistant_stats", { a: id }).single(),
    sb.from("leads").select("*").eq("assistant_id", id).order("created_at", { ascending: false }).limit(20),
    sb.from("questions").select("*").eq("assistant_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  const unanswered = questions?.filter((q) => !q.answered) ?? [];
  const site = env.siteUrl();
  const snippet = `<script src="${site}/widget.js" data-assistant="${a.id}" data-color="${a.brand_color}" async></script>`;
  const sections = splitSections(a.knowledge).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="font-mono text-xs text-muted hover:text-fg">← Assistants</Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold text-white" style={{ background: a.brand_color }}>{a.bot_name.slice(0, 1)}</span>
            <h1 className="text-2xl font-semibold tracking-tight">{a.name}</h1>
          </div>
        </div>
        <Link href={`/chat/${a.id}`} target="_blank" className="btn-secondary">Public chat page ↗</Link>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3" style={{ gap: 1 }}>
        <Stat label="Questions · 30d" value={String(stats?.questions_30d ?? 0)} />
        <Stat label="Answered from your info" value={`${stats?.answered_pct ?? 0}%`} />
        <Stat label="Emails to reply to" value={String(stats?.leads_open ?? 0)} dot={(stats?.leads_open ?? 0) > 0} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <Section n="01" title="Knowledge" hint={`What the assistant knows. It answers only from this. Start a line with “#” to create a section — ${sections} section${sections === 1 ? "" : "s"} detected.`}>
            <KnowledgeForm id={a.id} initial={a.knowledge} />
          </Section>
          <Section n="02" title="Appearance & security">
            <SettingsForm a={a} />
          </Section>
          <Section n="03" title="Install" hint="Paste before </body> on your website — WordPress, Shopify, Wix or plain HTML.">
            <CopyBox text={snippet} />
          </Section>
          <Section n="04" title="Inbox" hint="Visitors who want a human reply, and questions your knowledge didn't cover.">
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {leads?.map((l) => (
                <div key={l.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${l.handled ? "opacity-40" : ""}`}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent">Lead</span>{l.email}</p>
                    <p className="mt-0.5 truncate text-muted">“{l.question}”</p>
                  </div>
                  {!l.handled ? (
                    <div className="flex gap-1.5">
                      <a href={`mailto:${l.email}?subject=${encodeURIComponent(`Your question to ${a.name}`)}`} className="btn-secondary h-8 px-3">Reply</a>
                      <form action={markLead}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="assistant" value={a.id} /><button className="btn-ghost h-8 px-3">Mark done</button></form>
                    </div>
                  ) : <span className="font-mono text-xs text-muted">done</span>}
                </div>
              ))}
              {unanswered.slice(0, 8).map((q) => (
                <div key={q.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                  <span className="rounded bg-warn/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-warn">Gap</span>
                  <span className="truncate text-fg-2">“{q.question}”</span>
                </div>
              ))}
              {!leads?.length && !unanswered.length && <p className="px-4 py-6 text-center text-sm text-muted">Nothing yet — try the live test →</p>}
            </div>
          </Section>
          <form action={deleteAssistant} className="border-t border-border pt-6">
            <input type="hidden" name="id" value={a.id} />
            <button className="text-xs text-muted hover:text-danger">Delete this assistant</button>
          </form>
        </div>
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <p className="eyebrow mb-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> Live test</p>
          <div className="h-[600px] overflow-hidden rounded-xl border border-border shadow-2xl shadow-black/50">
            <ChatWindow key={a.updated_at} a={{ id: a.id, name: a.name, bot_name: a.bot_name, welcome: a.welcome, brand_color: a.brand_color }} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted">{n}</span>
        <div>
          <h2 className="font-medium">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      <div className="card p-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, dot }: { label: string; value: string; dot?: boolean }) {
  return (
    <div className="bg-surface p-5">
      <p className="flex items-center gap-2 text-xs text-muted">{dot && <span className="h-1.5 w-1.5 rounded-full bg-warn" />}{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
