import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOrigin, resolveAnswer, SAMPLE_KNOWLEDGE, sectionsToPrompt, splitSections } from "../src/lib/knowledge.ts";

test("headings become numbered sections", () => {
  const s = splitSections(SAMPLE_KNOWLEDGE);
  assert.equal(s.length, 6);
  assert.deepEqual(s.map((x) => x.title), ["About us", "Opening hours", "Address", "Orders and delivery", "Prices", "Allergies"]);
  assert.equal(s[1].id, 2);
  assert.match(sectionsToPrompt(s), /\[2\] Opening hours\nMonday/);
});

test("plain text without headings is split by paragraphs", () => {
  const s = splitSections("We sell bikes.\n\nRepairs take 2 days.\n\n\n");
  assert.equal(s.length, 1); // small paragraphs are merged
  assert.equal(s[0].title, "We sell bikes");
  const long = splitSections(Array.from({ length: 5 }, (_, i) => `P${i} ` + "x".repeat(500)).join("\n\n"));
  assert.ok(long.length >= 2 && long.every((x) => x.text.length <= 1200));
  assert.match(sectionsToPrompt([]), /empty/);
});

test("model output is validated", () => {
  const s = splitSections(SAMPLE_KNOWLEDGE);
  const ok = resolveAnswer({ answer: "Sunday 7:00–13:00.", answered: true, sources: [2, 2, 99] }, s);
  assert.deepEqual(ok, { answer: "Sunday 7:00–13:00.", answered: true, sources: [{ id: 2, title: "Opening hours" }] });
  // claims answered but cites nothing real → treated as unanswered
  assert.equal(resolveAnswer({ answer: "Sure!", answered: true, sources: [42] }, s).answered, false);
  assert.equal(resolveAnswer({ answer: "", answered: false, sources: [] }, s).answer.includes("email"), true);
  assert.equal(resolveAnswer("garbage", s).answered, false);
});

test("allowed domains are normalised and validated", () => {
  assert.equal(normalizeOrigin("www.shop.com/contact"), "https://www.shop.com");
  assert.equal(normalizeOrigin("https://shop.com"), "https://shop.com");
  assert.equal(normalizeOrigin("http://shop.com"), null);           // https only
  assert.equal(normalizeOrigin("javascript:alert(1)"), null);
  assert.equal(normalizeOrigin("shop.com; script-src *"), null);   // no CSP injection
  assert.equal(normalizeOrigin("http://localhost:3000"), "http://localhost:3000");
});
