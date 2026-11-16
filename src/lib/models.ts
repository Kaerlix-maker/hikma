/** Pick usable Gemini text models from the ListModels response (pure, unit-tested). */
export function rankModels(names: string[]): string[] {
  const version = (n: string) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  return names
    .map((n) => n.replace(/^models\//, ""))
    .filter((n) => /^gemini-.*flash/.test(n) && !/(tts|image|live|audio|embed|vision|thinking|exp)/.test(n))
    .sort((a, b) =>
      Number(/preview/.test(a)) - Number(/preview/.test(b)) ||   // stable first
      Number(/lite/.test(a)) - Number(/lite/.test(b)) ||         // full flash before lite
      version(b) - version(a) ||                                 // newest first
      a.length - b.length);
}
