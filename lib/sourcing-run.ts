import { db } from "@/db";
import { prospects } from "@/db/schema";
import { serpAdvertiserDomains, ahrefsMetrics, hasAhrefsKey } from "./ahrefs";
import { pickKeywords } from "./seed-keywords";
import { filterNew, normalizeDomain, qualifiesForSourcing } from "./sourcing";
import { scoreFromPaid, scoreProspect } from "./icp";

export type SourcingResult = { added: number; gecheckt: number; message: string };

// Volledige sourcing-run: vindt adverteerders via Ahrefs, verrijkt + scoort,
// ontdubbelt tegen de DB en zet gekwalificeerde bedrijven als kandidaat weg.
export async function runSourcing(opts?: { keywords?: number }): Promise<SourcingResult> {
  if (!hasAhrefsKey()) {
    return { added: 0, gecheckt: 0, message: "Ahrefs-key nog niet gekoppeld — voeg AHREFS_API_KEY toe in Vercel en probeer opnieuw." };
  }

  const ex = await db.select({ w: prospects.website, b: prospects.bedrijf }).from(prospects);
  const domeinen = new Set(ex.map((r) => normalizeDomain(r.w ?? "")).filter(Boolean));
  const namen = new Set(ex.map((r) => r.b.toLowerCase()));

  const kws = pickKeywords(opts?.keywords ?? 5, ex.length);
  const gevonden = new Set<string>();
  for (const kw of kws) {
    try {
      (await serpAdvertiserDomains(kw)).forEach((d) => gevonden.add(d));
    } catch { /* zoekwoord overslaan bij fout */ }
  }

  const nieuw = filterNew([...gevonden].map((d) => ({ bedrijf: d, website: d })), { domeinen, namen });
  const date = new Date().toISOString().slice(0, 10);

  let added = 0, gecheckt = 0;
  for (const c of nieuw) {
    gecheckt++;
    let m;
    try { m = await ahrefsMetrics(c.website, date); } catch { continue; }
    const paidKw = m.paid_keywords ?? 0;
    const paidUsd = (m.paid_cost ?? 0) / 100;
    if (!qualifiesForSourcing(paidKw, paidUsd)) continue;

    const sc = scoreFromPaid(paidKw, paidUsd);
    const { total, tier } = scoreProspect(sc);
    await db.insert(prospects).values({
      bedrijf: c.bedrijf, website: c.website, kanaal: "email",
      scoreAds: sc.ads, scoreBudget: sc.budget, scoreLeadwaarde: sc.leadwaarde,
      scoreBereikbaarheid: sc.bereikbaarheid, scoreGeenBfOverlap: sc.geenBfOverlap,
      icpTotaal: total, tier,
      haakje: `Adverteert op Google (${paidKw} paid kw, ~$${Math.round(paidUsd)}/mnd volgens Ahrefs-proxy). Automatisch gevonden — verifieer bij goedkeuring.`,
      bron: `auto-${date}`, status: "kandidaat",
    });
    added++;
  }
  return { added, gecheckt, message: `${added} nieuwe kandidaten toegevoegd (${nieuw.length} nieuwe domeinen gecheckt).` };
}
