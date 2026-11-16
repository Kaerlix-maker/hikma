import "server-only";
import { createHash } from "node:crypto";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
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
    const ranked = rankModels(usable, 5);
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
/**
 * "Thinking" makes Flash models slow (and eats the output budget); a support
 * chat needs fast, short answers, so we turn it down to the minimum.
 * Gemini 2.x uses a token budget, Gemini 3+ uses a level.
 */
const lowThinking = (model: string) =>
  /gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.LOW };

/**
 * JSON-mode call with fallbacks. Per model, up to three tries — each drops an
 * option the model may reject (400): low thinking → strict schema → plain JSON.
 * Overloaded (503), rate-limited (429) or slow models are skipped quickly.
 */
export async function generateJson(system: string, turns: Turn[], schema: object): Promise<unknown> {
  if (!aiEnabled()) throw new AiUnavailable("not configured");
  const deadline = Date.now() + 28_000;
  let last: unknown;
  const variants = [
    { schema: true, thinking: true },
    { schema: true, thinking: false },
    { schema: false, thinking: false },
  ];
  for (const model of await models()) {
    for (const v of variants) {
      const left = deadline - Date.now();
      if (left < 2000) break;
      const started = Date.now();
      try {
        const res = await ai().models.generateContent({
          model,
          contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
          config: {
            systemInstruction: v.schema ? system : `${system}\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(schema)}`,
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            ...(v.schema ? { responseJsonSchema: schema } : {}),
            ...(v.thinking ? { thinkingConfig: lowThinking(model) } : {}),
            abortSignal: AbortSignal.timeout(Math.min(9_000, left)),
          },
        });
        return JSON.parse(res.text ?? "");
      } catch (e) {
        last = e;
        const status = (e as { status?: number }).status;
        console.warn(`Gemini attempt failed: model=${model} schema=${v.schema} thinking=${v.thinking} status=${status ?? "-"} after ${Date.now() - started}ms: ${String((e as Error).message ?? e).slice(0, 160)}`);
        if (status !== 400) break; // 404 / 429 / 503 / timeout → next model
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
