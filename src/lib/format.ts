/** Pure helpers — no server imports, safe everywhere and unit-tested. */

export function money(cents: number, currency = "eur", locale = "en-GB") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function dateTime(iso: string, timeZone = "Europe/Paris", locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
}

/** "Annaba Kayak & Co" → "annaba-kayak-co" (matches the DB slug constraint). */
export function slugify(input: string) {
  return input
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 40).replace(/-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Same rounding as reserve_seats() in SQL, so the UI shows the exact amount charged. */
export function depositFor(priceCents: number, seats: number, depositPercent: number) {
  const total = priceCents * seats;
  return { total, deposit: Math.max(50, Math.ceil((total * depositPercent) / 100)) };
}

/** Local "YYYY-MM-DDTHH:mm" in a time zone → UTC ISO string. */
export function zonedToUtc(local: string, timeZone: string) {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) throw new Error("Invalid date");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // offset of the zone at that instant
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(guess)).reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  const asZone = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (asZone - guess)).toISOString();
}
