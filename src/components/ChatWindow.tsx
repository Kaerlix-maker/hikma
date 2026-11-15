"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ask, leaveEmail } from "@/app/chat/actions";

export type PublicAssistant = { id: string; name: string; bot_name: string; welcome: string; brand_color: string };
type Msg = { role: "user" | "model"; text: string; sources?: { id: number; title: string }[]; unanswered?: boolean; error?: boolean };

/** Colours per theme: dark inside Hikma, light when embedded on a customer's site. */
const THEMES = {
  dark: {
    root: "bg-[#0c0d0f] text-[#f7f8f8]", border: "border-white/[0.08]", sub: "text-[#7c818a]",
    bot: "bg-white/[0.05] ring-1 ring-white/[0.06]", input: "bg-white/[0.05] ring-1 ring-white/[0.08] placeholder:text-[#7c818a]",
    chip: "bg-white/[0.06] text-[#b4b8bf]", sugg: "border-white/10 text-[#b4b8bf] hover:bg-white/[0.06] hover:text-white",
  },
  light: {
    root: "bg-white text-[#0b0c0e]", border: "border-black/[0.07]", sub: "text-[#6b7079]",
    bot: "bg-[#f4f5f7]", input: "bg-[#f4f5f7] placeholder:text-[#8b9099]",
    chip: "bg-black/[0.05] text-[#4b5058]", sugg: "border-black/10 text-[#4b5058] hover:bg-black/[0.04]",
  },
} as const;

export function ChatWindow({ a, suggestions = [], onClose, theme = "dark" }: {
  a: PublicAssistant; suggestions?: string[]; onClose?: () => void; theme?: keyof typeof THEMES;
}) {
  const t = THEMES[theme];
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "model", text: a.welcome }]);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [lead, setLead] = useState<{ question: string; sent: boolean } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs, pending, lead]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    const history = msgs.slice(1).filter((m) => !m.error).slice(-6).map(({ role, text }) => ({ role, text }));
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setQ("");
    start(async () => {
      const r = await ask(a.id, message, history);
      if ("error" in r) { setMsgs((m) => [...m, { role: "model", text: r.error, error: true }]); return; }
      setMsgs((m) => [...m, { role: "model", text: r.answer, sources: r.sources, unanswered: !r.answered }]);
      if (!r.answered) setLead({ question: message, sent: false });
    });
  };

  return (
    <div className={`flex h-full min-h-0 flex-col text-sm ${t.root}`} style={{ ["--brand" as string]: a.brand_color }}>
      <header className={`flex items-center gap-3 border-b px-4 py-3 ${t.border}`}>
        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white" style={{ background: "var(--brand)" }}>
          {a.bot_name.slice(0, 1).toUpperCase()}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#3ecf8e] ring-2 ring-current" style={{ color: theme === "dark" ? "#0c0d0f" : "#fff" }} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-medium">{a.bot_name}</p>
          <p className={`truncate text-xs ${t.sub}`}>{a.name}</p>
        </div>
        <span className={`hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider sm:inline ${t.chip}`}>AI</span>
        {onClose && <button onClick={onClose} aria-label="Close chat" className={`grid h-7 w-7 place-items-center rounded-md text-lg ${t.sub} hover:opacity-70`}>×</button>}
      </header>

      <div ref={list} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end">
            <p dir="auto" className="max-w-[82%] whitespace-pre-line rounded-2xl rounded-br-sm px-3.5 py-2 leading-relaxed text-white" style={{ background: "var(--brand)" }}>{m.text}</p>
          </div>
        ) : (
          <div key={i} className="flex max-w-[88%] flex-col gap-1.5">
            <p dir="auto" className={`whitespace-pre-line rounded-2xl rounded-bl-sm px-3.5 py-2 leading-relaxed ${m.error ? "bg-[#ff6b6b]/10 text-[#ff8a8a]" : t.bot}`}>{m.text}</p>
            {!!m.sources?.length && (
              <div className="flex flex-wrap gap-1">
                {m.sources.map((s) => (
                  <span key={s.id} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] ${t.chip}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 3h9l4 4v14H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                    {s.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className={`flex w-fit gap-1 rounded-2xl rounded-bl-sm px-3.5 py-3 ${t.bot}`} aria-label="Typing">
            {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-50" style={{ animationDelay: `${i * 160}ms` }} />)}
          </div>
        )}
        {lead && <LeadForm assistantId={a.id} lead={lead} t={t} onSent={() => setLead({ ...lead, sent: true })} />}
        {msgs.length === 1 && suggestions.length > 0 && (
          <div className="flex flex-col items-start gap-1.5 pt-1">
            {suggestions.map((s) => (
              <button key={s} dir="auto" onClick={() => send(s)} className={`rounded-full border px-3 py-1.5 text-[13px] transition ${t.sugg}`}>{s}</button>
            ))}
          </div>
        )}
      </div>

      <form className={`border-t p-3 ${t.border}`} onSubmit={(e) => { e.preventDefault(); send(q); }}>
        <div className={`flex items-center gap-2 rounded-xl py-1 pl-3.5 pr-1 ${t.input}`}>
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} dir="auto" aria-label="Your message"
            placeholder="Ask a question…" className="min-w-0 flex-1 bg-transparent py-1.5 outline-none" />
          <button disabled={pending || !q.trim()} aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white transition disabled:opacity-30" style={{ background: "var(--brand)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <p className={`mt-2 text-center text-[10.5px] ${t.sub}`}>Answers come from {a.name}&apos;s information · <a href="/" target="_blank" className="underline-offset-2 hover:underline">Hikma</a></p>
      </form>
    </div>
  );
}

function LeadForm({ assistantId, lead, t, onSent }: {
  assistantId: string; lead: { question: string; sent: boolean }; t: (typeof THEMES)[keyof typeof THEMES]; onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  if (lead.sent) return <p className={`text-xs ${t.sub}`}>✓ Sent — the team will reply by email.</p>;
  return (
    <form className={`rounded-xl border p-3 ${t.border}`} onSubmit={(e) => {
      e.preventDefault();
      start(async () => { const r = await leaveEmail(assistantId, email, lead.question); if (r.ok) onSent(); else setErr(r.error ?? "Error"); });
    }}>
      <p className={`text-xs ${t.sub}`}>Get a reply from the team</p>
      <div className={`mt-2 flex items-center gap-2 rounded-lg py-1 pl-3 pr-1 ${t.input}`}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Your email" className="min-w-0 flex-1 bg-transparent py-1 text-[13px] outline-none" />
        <button disabled={pending} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50" style={{ background: "var(--brand)" }}>{pending ? "…" : "Send"}</button>
      </div>
      {err && <p className="mt-1 text-xs text-[#ff8a8a]">{err}</p>}
    </form>
  );
}
