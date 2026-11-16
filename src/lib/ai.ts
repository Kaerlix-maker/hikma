import "server-only";
import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { rankModels } from "@/lib/models";
import { supabaseAdmin } from "@/lib/supabase/server";

export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);
let client: GoogleGenAI | null = null;
// v1beta: structured JSON output (responseJsonSchema) lives there.
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: "v1beta" }));

/**
 * Model names change often, so instead of hard-coding them we ask the API
 * which "flash" text models this key can use, newest stable first, and cache
 * the answer for an hour. GEMINI_MODEL, if set, is always tried first.
 */
let cached: { at: number; models: string[] } | null = null;
async function models(): Promise<string[]> {
  const pinned = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
  if (cached && Date.now() - cached.at < 3_600_000) return [...pinned, ...cached.models];
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY! },
      signal: AbortSignal.timeout(5000),
    });
    const body = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const usable = (body.models ?? []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name);
    const ranked = rankModels(usable).slice(0, 3);
    if (ranked.length) cached = { at: Date.now(), models: ranked };
    else console.error("No usable Gemini models", r.status, JSON.stringify(body).slice(0, 300));
  } catch (e) {
    console.error("ListModels failed", e);
  }
  return [...pinned, ...(cached?.models ?? ["gemini-2.5-flash"])];
}

export class AiUnavailable extends Error {}

export type Turn = { role: "user" | "model"; text: string };

/** JSON-mode call with model fallback and an overall 20 s budget. */
export async function generateJson(system: string, turns: Turn[], schema: object): Promise<unknown> {
  if (!aiEnabled()) throw new AiUnavailable("not configured");
  const deadline = Date.now() + 20_000;
  let last: unknown;
  for (const model of await models()) {
    // Try strict JSON-schema mode first; if the model rejects it (400), retry with plain JSON mode.
    for (const strict of [true, false]) {
      if (Date.now() > deadline) break;
      try {
        const res = await ai().models.generateContent({
          model,
          contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
          config: {
            systemInstruction: strict ? system : `${system}\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(schema)}`,
            temperature: 0.2,
            maxOutputTokens: 700,
            responseMimeType: "application/json",
            ...(strict ? { responseJsonSchema: schema } : {}),
            abortSignal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
          },
        });
        return JSON.parse(res.text ?? "");
      } catch (e) {
        last = e;
        if ((e as { status?: number }).status !== 400) break; // 404/429/5xx → next model
      }
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
