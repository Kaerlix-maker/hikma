/**
 * Knowledge-base helpers (pure, unit-tested).
 * The owner's text is split into numbered sections; the model must cite the
 * sections it used, and everything it returns is validated here.
 */

export type Section = { id: number; title: string; text: string };

const MAX_SECTION = 1200;

/** Split on markdown headings or blank lines, then merge small paragraphs. */
export function splitSections(input: string): Section[] {
  const blocks: { title: string; body: string[] }[] = [];
  let cur: { title: string; body: string[] } | null = null;
  for (const raw of input.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const h = line.match(/^#{1,6}\s+(.+)/);
    if (h) { cur = { title: h[1].trim(), body: [] }; blocks.push(cur); continue; }
    if (!cur) { cur = { title: "", body: [] }; blocks.push(cur); }
    cur.body.push(line);
  }
  const out: Section[] = [];
  for (const b of blocks) {
    const paras = b.body.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    let chunk = "";
    const flush = () => {
      if (!chunk) return;
      const title = b.title || chunk.split("\n")[0].replace(/[:.?!]+$/, "").slice(0, 60);
      out.push({ id: out.length + 1, title, text: chunk });
      chunk = "";
    };
    for (const p of paras) {
      if (chunk && chunk.length + p.length + 2 > MAX_SECTION) flush();
      chunk = chunk ? `${chunk}\n\n${p}` : p.slice(0, MAX_SECTION * 2);
    }
    flush();
  }
  return out;
}

export function sectionsToPrompt(sections: Section[]) {
  return sections.map((s) => `[${s.id}] ${s.title}\n${s.text}`).join("\n\n---\n\n") || "(empty — the owner has not added any information yet)";
}

export const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string", description: "Reply to the visitor in their language. Max 4 short sentences." },
    answered: { type: "boolean", description: "true only if the answer is fully supported by the sections." },
    sources: { type: "array", items: { type: "integer" }, description: "Numbers of the sections used, e.g. [2, 5]. Empty if none." },
  },
  required: ["answer", "answered", "sources"],
} as const;

export type Answer = { answer: string; answered: boolean; sources: { id: number; title: string }[] };

const FALLBACK = "I'm not sure about that one. Leave your email and the team will get back to you.";

/** Validate model output: real section ids only; no sources ⇒ not answered. */
export function resolveAnswer(raw: unknown, sections: Section[]): Answer {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const byId = new Map(sections.map((s) => [s.id, s]));
  const ids = Array.isArray(o.sources) ? [...new Set(o.sources.filter((n): n is number => Number.isInteger(n) && byId.has(n as number)))].slice(0, 4) : [];
  const answer = typeof o.answer === "string" && o.answer.trim() ? o.answer.trim().slice(0, 1200) : FALLBACK;
  const answered = o.answered === true && ids.length > 0;
  return { answer, answered, sources: answered ? ids.map((id) => ({ id, title: byId.get(id)!.title })) : [] };
}

/** Normalise "https://www.shop.com/path" → "https://www.shop.com" for frame-ancestors. */
export function normalizeOrigin(input: string): string | null {
  try {
    const u = new URL(input.trim().includes("://") ? input.trim() : `https://${input.trim()}`);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && u.hostname === "localhost")) return null;
    if (!/^[a-z0-9.-]+$/i.test(u.hostname) || !u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export const SAMPLE_KNOWLEDGE = `# About us
Le Fournil d'Annaba is a family bakery opened in 2009. We bake bread, pastries and traditional cakes every morning with local flour.

# Opening hours
Monday to Saturday: 6:30 to 20:00. Sunday: 7:00 to 13:00. Closed on public holidays.

# Address
12 rue Ibn Khaldoun, Annaba centre, next to the central post office. Free parking behind the shop.

# Orders and delivery
Custom cakes must be ordered at least 48 hours in advance, by phone or in the shop. Delivery is available in Annaba for orders over 3000 DA, with a 300 DA fee.

# Prices
Baguette: 30 DA. Croissant: 60 DA. Birthday cake (8 people): from 2500 DA.

# Allergies
All products may contain traces of nuts, gluten, eggs and milk. Gluten-free bread is available on Fridays only.`;
