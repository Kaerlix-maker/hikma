import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChatWindow } from "@/components/ChatWindow";
import { supabasePublic } from "@/lib/supabase/server";
import { CloseButton } from "./CloseButton";

async function load(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { data } = await supabasePublic().from("assistants").select("id, name, bot_name, welcome, brand_color").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/chat/[id]">): Promise<Metadata> {
  const a = await load((await params).id);
  return { title: a ? `Chat with ${a.name}` : "Not found", robots: { index: false } };
}

/** Full-page chat. Also loaded inside the widget's iframe with ?embed=1. */
export default async function ChatPage({ params, searchParams }: PageProps<"/chat/[id]">) {
  const a = await load((await params).id);
  if (!a) notFound();
  const embed = (await searchParams).embed === "1";
  if (embed) {
    return <div className="h-dvh"><EmbedChat a={a} /></div>;
  }
  return (
    <div className="relative flex flex-1 items-center justify-center p-4">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative h-[min(720px,90dvh)] w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/60">
        <ChatWindow a={a} />
      </div>
    </div>
  );
}

function EmbedChat({ a }: { a: NonNullable<Awaited<ReturnType<typeof load>>> }) {
  return <CloseButton a={a} />;
}
