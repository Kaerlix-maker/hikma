import "server-only";
import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Tried in order; aliases keep working as Google ships new versions. Override with GEMINI_MODEL. */
const MODELS = () => [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-flash-lite-latest"].filter(Boolean) as string[];

export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);
let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }));

export class AiUnavailable extends Error {}

export type Turn = { role: "user" | "model"; text: string };

/** JSON-mode call with model fallback and an overall 20 s budget. */
export async function generateJson(system: string, turns: Turn[], schema: object): Promise<unknown> {
  if (!aiEnabled()) throw new AiUnavailable("not configured");
  const deadline = Date.now() + 20_000;
  let last: unknown;
  for (const model of MODELS()) {
    if (Date.now() > deadline) break;
    try {
      const res = await ai().models.generateContent({
        model,
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        config: {
          systemInstruction: system,
          temperature: 0.2,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          abortSignal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
        },
      });
      return JSON.parse(res.text ?? "");
    } catch (e) {
      last = e;
    }
  }
  console.error("Gemini failed", last);
  throw new AiUnavailable("busy");
}

/** Salted hash of the visitor — raw IPs are never stored. */
export async function visitorKey(identity?: string) {
  const h = await headers();
  const who = identity ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return createHash("sha256").update(`${env.supabaseServiceKey().slice(-16)}:${who}`).digest("hex").slice(0, 32);
}

export async function allowAi(assistantId: string, identity?: string) {
  const { data, error } = await supabaseAdmin().rpc("ai_allow", { p_key: await visitorKey(identity), p_assistant: assistantId });
  return !error && data === true;
}
