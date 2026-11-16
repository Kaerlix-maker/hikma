/**
 * Pick usable Gemini text models from the ListModels response (pure, unit-tested).
 * Order: stable before preview, Flash-Lite before Flash (faster and less
 * congested on the free tier — plenty for short support answers), newest first.
 * One older-generation model is kept at the end as a fallback when the newest
 * models are overloaded (503).
 */
export function rankModels(names: string[], max = 5): string[] {
  const version = (n: string) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const all = names
    .map((n) => n.replace(/^models\//, ""))
    .filter((n) => /^gemini-.*flash/.test(n) && !/(tts|image|live|audio|embed|vision|thinking|exp)/.test(n))
    .sort((a, b) =>
      Number(/preview/.test(a)) - Number(/preview/.test(b)) ||
      Number(!/lite/.test(a)) - Number(!/lite/.test(b)) ||
      version(b) - version(a) ||
      a.length - b.length);
  const picked = all.slice(0, max - 1);
  const oldest = [...all].filter((n) => !/preview/.test(n)).sort((a, b) => version(a) - version(b))[0];
  if (oldest && !picked.includes(oldest)) picked.push(oldest);
  return picked.slice(0, max);
}
