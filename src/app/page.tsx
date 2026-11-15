import Link from "next/link";
import { ChatWindow, type PublicAssistant } from "@/components/ChatWindow";
import { Logo } from "@/components/Logo";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FEATURES = [
  { k: "01", t: "Grounded in your facts", d: "Every answer cites the section of your information it came from. No source, no answer." },
  { k: "02", t: "Hands off to a human", d: "When it doesn't know, it asks for the visitor's email. Leads land in your inbox." },
  { k: "03", t: "Shows you the gaps", d: "See which questions your information didn't cover, and fix them in one edit." },
  { k: "04", t: "Speaks their language", d: "French, English, Arabic, Darija — visitors write how they talk." },
  { k: "05", t: "Locked to your domain", d: "Only your websites can embed your assistant. Your knowledge base is never exposed." },
  { k: "06", t: "One line to install", d: "WordPress, Shopify, Wix or plain HTML. Paste a script tag, done." },
];

const SNIPPET = `<script src="https://hikma-kaerlix.vercel.app/widget.js"
        data-assistant="6f1c…5e6f" async></script>`;

async function demo(): Promise<PublicAssistant | null> {
  const id = process.env.NEXT_PUBLIC_DEMO_ASSISTANT_ID;
  if (!id || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const { data } = await supabasePublic().from("assistants").select("id, name, bot_name, welcome, brand_color").eq("id", id).maybeSingle();
  return data;
}

export default async function Home() {
  const a = await demo();
  return (
    <div className="relative flex-1 overflow-x-hidden">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <a href="https://github.com/kaerlix-maker/hikma" className="btn-ghost hidden sm:inline-flex">GitHub</a>
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/login?mode=signup" className="btn-primary ml-1">Get started</Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1fr_400px] lg:pt-24">
        <div>
          <Link href="/login?mode=signup" className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-white/[0.03] py-1 pl-1 pr-3 text-xs text-fg-2 transition hover:border-white/25">
            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">New</span> Free AI assistant for your website →
          </Link>
          <h1 className="mt-6 text-[clamp(2.6rem,6vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
            Your website,<br />
            <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">now answers back.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-fg-2">
            Hikma turns your prices, hours and FAQ into an assistant that replies to customers instantly — in their language,
            from your facts only. When it doesn&apos;t know, it hands the conversation to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login?mode=signup" className="btn-primary h-10 px-5">Create your assistant</Link>
            <a href="#how" className="btn-secondary h-10 px-5">How it works</a>
          </div>
          <p className="mt-6 font-mono text-xs text-muted">Free · No card · 2-minute setup</p>
        </div>

        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/20 to-white/0" />
          <div className="relative h-[540px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/70">
            {a ? (
              <ChatWindow a={a} suggestions={["Are you open on Sunday?", "Vous livrez à domicile ?", "واش عندكم خبز بلا غلوتين؟"]} />
            ) : (
              <StaticDemo />
            )}
          </div>
          {a && <p className="mt-3 text-center font-mono text-[11px] text-muted">↑ Live demo — a real assistant for a sample bakery</p>}
        </div>
      </section>

      <section id="how" className="relative z-10 border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Three steps. No training.</h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Paste what you know", "Prices, hours, delivery, policies. Or import a .txt / .md file."],
                ["Copy one line", "Add the script to your site. Restrict it to your domain if you like."],
                ["Read the gaps", "Your dashboard shows what customers asked that your info didn't cover."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border-strong font-mono text-xs text-fg-2">{i + 1}</span>
                  <div><p className="font-medium">{t}</p><p className="mt-1 text-sm text-muted">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="card self-center overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 font-mono text-xs text-muted">index.html</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-fg-2"><code>
              <span className="text-muted">{"<!-- your website -->\n"}</span>
              {"<body>\n  ...\n  "}<span className="text-accent">{SNIPPET.replace("\n", "\n  ")}</span>{"\n</body>"}
            </code></pre>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">Why it&apos;s different</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight">An assistant your customers can trust.</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.k} className="bg-bg p-6 transition hover:bg-surface">
                <p className="font-mono text-xs text-muted">{f.k}</p>
                <h3 className="mt-4 font-medium">{f.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">Ready in two minutes.</h2>
          <p className="mt-3 text-fg-2">Free while in beta. Up to three assistants per account.</p>
          <Link href="/login?mode=signup" className="btn-primary mt-8 h-10 px-6">Create your assistant</Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-muted">
          <Logo />
          <span>A portfolio project by <a className="text-fg-2 hover:text-fg" href="https://kaerlix-maker.github.io">Kaerlix</a> · Powered by Google Gemini</span>
        </div>
      </footer>
    </div>
  );
}

/** Shown when no demo assistant is configured: a static example conversation. */
function StaticDemo() {
  const bubble = "w-fit max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed";
  return (
    <div className="flex h-full flex-col bg-[#0c0d0f] text-sm">
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white">A</span>
        <div className="leading-tight"><p className="font-medium">Amina</p><p className="text-xs text-muted">Le Fournil d&apos;Annaba</p></div>
      </div>
      <div className="flex-1 space-y-4 p-4">
        <p className={`${bubble} rounded-bl-sm bg-white/[0.05]`}>Bonjour ! Posez-moi vos questions sur la boulangerie.</p>
        <p className={`${bubble} ml-auto rounded-br-sm bg-accent text-white`}>Vous livrez à domicile ?</p>
        <div className="space-y-1.5">
          <p className={`${bubble} rounded-bl-sm bg-white/[0.05]`}>Oui ! Nous livrons dans Annaba pour toute commande de plus de 3000 DA, avec 300 DA de frais.</p>
          <span className="inline-block rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] text-fg-2">📄 Orders and delivery</span>
        </div>
        <p dir="rtl" className={`${bubble} ml-auto rounded-br-sm bg-accent text-white`}>واش تحلو نهار الجمعة؟</p>
        <p dir="rtl" className={`${bubble} rounded-bl-sm bg-white/[0.05]`}>نعم، من الإثنين إلى السبت من 6:30 إلى 20:00.</p>
      </div>
    </div>
  );
}
