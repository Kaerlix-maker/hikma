"use client";
import { useActionState, useRef, useState } from "react";
import { saveKnowledge, saveSettings } from "../actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { SAMPLE_KNOWLEDGE } from "@/lib/knowledge";
import type { Assistant } from "@/lib/types";

export function KnowledgeForm({ id, initial }: { id: string; initial: string }) {
  const [state, action] = useActionState(saveKnowledge, null);
  const [text, setText] = useState(initial);
  const file = useRef<HTMLInputElement>(null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <textarea name="knowledge" value={text} onChange={(e) => setText(e.target.value)} rows={14} maxLength={40000} dir="auto"
        className="input font-mono text-[13px] leading-relaxed" placeholder={"# Opening hours\nMonday–Friday 9:00–18:00…\n\n# Delivery\n…"} aria-label="Knowledge" />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton className="btn-primary" pendingText="Saving…">Save</SubmitButton>
        <button type="button" className="btn-secondary" onClick={() => file.current?.click()}>Import .txt / .md</button>
        {!text && <button type="button" className="btn-ghost" onClick={() => setText(SAMPLE_KNOWLEDGE)}>Use sample (bakery)</button>}
        <span className="ml-auto font-mono text-xs text-muted">{text.length.toLocaleString("en")} / 40,000</span>
        <input ref={file} type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            const content = (await f.text()).slice(0, 40000);
            setText((t) => ((t ? `${t}\n\n` : "") + content).slice(0, 40000));
          }
          e.target.value = "";
        }} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
    </form>
  );
}

export function SettingsForm({ a }: { a: Assistant }) {
  const [state, action] = useActionState(saveSettings, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={a.id} />
      <label className="block"><span className="label">Business name</span><input name="name" defaultValue={a.name} required className="input" /></label>
      <label className="block"><span className="label">Assistant name</span><input name="bot_name" defaultValue={a.bot_name} required maxLength={40} className="input" /></label>
      <label className="block sm:col-span-2"><span className="label">Welcome message</span><input name="welcome" defaultValue={a.welcome} maxLength={300} dir="auto" className="input" /></label>
      <ColorField initial={a.brand_color} />
      <label className="block"><span className="label">Allowed websites (optional)</span>
        <input name="allowed_domains" defaultValue={a.allowed_domains.join(", ")} placeholder="https://myshop.com" className="input" />
        <span className="mt-1 block text-xs text-muted">If set, the widget only works on these sites.</span>
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton className="btn-primary" pendingText="Saving…">Save</SubmitButton>
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    </form>
  );
}

export function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-border-strong bg-bg">
      <code className="flex-1 overflow-x-auto whitespace-nowrap px-4 py-3 font-mono text-xs text-fg-2">{text}</code>
      <button type="button" className="border-l border-border-strong px-4 text-xs font-medium text-fg hover:bg-white/[0.06]"
        onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

const PRESETS = ["#4f8cff", "#0a0a0a", "#16a34a", "#e11d48", "#f59e0b", "#0ea5e9"];

function ColorField({ initial }: { initial: string }) {
  const [c, setC] = useState(initial);
  return (
    <div>
      <span className="label">Brand colour</span>
      <div className="flex h-[38px] items-center gap-2 rounded-lg border border-border-strong bg-bg px-2">
        <input type="color" name="brand_color" value={c} onChange={(e) => setC(e.target.value)} aria-label="Brand colour"
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0" />
        <span className="font-mono text-xs text-fg-2">{c}</span>
        <div className="ml-auto flex gap-1">
          {PRESETS.map((p) => (
            <button key={p} type="button" aria-label={`Use ${p}`} onClick={() => setC(p)}
              className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-bg ${p === c ? "ring-2 ring-fg/70" : "ring-1 ring-white/15"}`} style={{ background: p }} />
          ))}
        </div>
      </div>
    </div>
  );
}
