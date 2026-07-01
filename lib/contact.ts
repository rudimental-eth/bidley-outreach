// Contact-verrijking: haal het PUBLIEKE zakelijke e-mailadres van de eigen
// website van een prospect. Compliant: alleen openbaar getoonde adressen, geen
// patroon-gokken, geen e-mailfinder-tools.

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const RUIS = /(sentry|wixpress|example\.com|example\.nl|yourdomain|domain\.com|\.(png|jpg|jpeg|webp|gif|svg)$|@2x|@3x)/i;

export function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? [];
  const uniq: string[] = [];
  for (const raw of found) {
    const e = raw.toLowerCase();
    if (RUIS.test(e)) continue;
    if (!uniq.includes(e)) uniq.push(e);
  }
  return uniq;
}

const VOORKEUR = ["info@", "contact@", "mail@", "hallo@", "welkom@", "office@", "klantenservice@", "sales@", "verkoop@", "receptie@"];

export function pickBusinessEmail(emails: string[], siteDomain: string): string | null {
  const dom = siteDomain.toLowerCase().replace(/^www\./, "");
  const onDomain = emails.filter((e) => e.split("@")[1]?.endsWith(dom));
  const pool = onDomain.length ? onDomain : emails;
  if (pool.length === 0) return null;
  for (const p of VOORKEUR) {
    const hit = pool.find((e) => e.startsWith(p));
    if (hit) return hit;
  }
  return pool[0];
}

function toUrl(website: string): { origin: string; domain: string } | null {
  try {
    const u = new URL(website.startsWith("http") ? website : `https://${website}`);
    return { origin: u.origin, domain: u.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BidleyLeadMachine/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

// I/O: probeer homepage + veelvoorkomende contactpagina's, kies het beste adres.
export async function findPublicEmail(website: string): Promise<string | null> {
  const parsed = toUrl(website);
  if (!parsed) return null;
  const paths = ["", "/contact", "/contact.html", "/contact-us", "/over-ons", "/colofon"];
  const emails: string[] = [];
  for (const p of paths) {
    const html = await fetchText(parsed.origin + p);
    if (html) emails.push(...extractEmails(html));
    if (pickBusinessEmail(emails, parsed.domain)) break; // genoeg zodra we iets goeds hebben
  }
  return pickBusinessEmail(emails, parsed.domain);
}
