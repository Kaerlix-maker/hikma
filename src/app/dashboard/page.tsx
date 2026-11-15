import type { Metadata } from "next";
import Link from "next/link";
import { supabaseUser } from "@/lib/supabase/server";
import { NewAssistant } from "./NewAssistant";

export const metadata: Metadata = { title: "Assistants" };

export default async function Dashboard() {
  const sb = await supabaseUser();
  const { data: list } = await sb.from("assistants").select("id, name, bot_name, brand_color, knowledge, updated_at").order("created_at");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistants</h1>
        <p className="mt-1 text-sm text-muted">One assistant per website or business · {list?.length ?? 0} / 3</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list?.map((a) => (
          <Link key={a.id} href={`/dashboard/${a.id}`} className="card group p-5 transition hover:border-border-strong hover:bg-raised">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold text-white" style={{ background: a.brand_color }}>{a.bot_name.slice(0, 1)}</span>
              <span className="text-muted transition group-hover:translate-x-0.5 group-hover:text-fg">→</span>
            </div>
            <h2 className="mt-4 font-medium">{a.name}</h2>
            <p className="mt-0.5 font-mono text-xs text-muted">
              {a.knowledge.length ? `${a.knowledge.length.toLocaleString("en")} chars of knowledge` : "no knowledge yet"}
            </p>
          </Link>
        ))}
        {(list?.length ?? 0) < 3 && <NewAssistant first={!list?.length} />}
      </div>
    </div>
  );
}
