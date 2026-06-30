import "./load-env";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { scoreProspect } from "@/lib/icp";

// Importeert onderzochte kandidaten uit prospect-kandidaten.md (Cowork-vault) als
// status 'kandidaat'. Slaat afvallers/Tier C over, ontdubbelt op bedrijfsnaam.
// Gebruik: npx tsx scripts/import-candidates.ts "<pad naar prospect-kandidaten.md>"

type Row = Record<string, string>;

function norm(h: string) {
  return h.trim().toLowerCase();
}

function cleanCell(c: string) {
  return c.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*]/g, "").trim();
}

function cleanWebsite(c: string) {
  const t = cleanCell(c).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return t || null;
}

// Runs die genegeerd worden (pre-tweak, te grote adverteerders / Home & Living-maatwerk).
const SKIP_RUNS = new Set(["2026-06-15"]);

function parseTables(md: string): { section: string; runDate: string; rows: Row[] }[] {
  const lines = md.split("\n");
  const out: { section: string; runDate: string; rows: Row[] }[] = [];
  let section = "";
  let runDate = "onbekend";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const dateMatch = line.match(/^##\s+(2026-\d{2}-\d{2})/);
    if (dateMatch) runDate = dateMatch[1];
    if (/^#{1,6}\s/.test(line) || /^\*\*.+\*\*/.test(line.trim())) section = line.replace(/[#*]/g, "").trim();
    const isTableRow = line.trim().startsWith("|");
    const next = lines[i + 1] ?? "";
    if (isTableRow && /^\s*\|?[\s:|-]+\|?\s*$/.test(next)) {
      const headers = line.split("|").slice(1, -1).map(norm);
      const rows: Row[] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        const cells = lines[j].split("|").slice(1, -1);
        const row: Row = {};
        headers.forEach((h, k) => (row[h] = cells[k] ?? ""));
        rows.push(row);
        j++;
      }
      out.push({ section, runDate, rows });
      i = j;
    } else i++;
  }
  return out;
}

function num(v: string | undefined): number | null {
  const n = Number(cleanCell(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const pad = process.argv[2];
  if (!pad) throw new Error("Geef het pad naar prospect-kandidaten.md op.");
  const md = readFileSync(pad, "utf8");
  const tables = parseTables(md);

  const bestaand = await db.select({ bedrijf: prospects.bedrijf }).from(prospects);
  const seen = new Set(bestaand.map((b) => b.bedrijf.toLowerCase()));

  let toegevoegd = 0, overgeslagen = 0;
  const perRun: Record<string, number> = {};
  for (const { section, runDate, rows } of tables) {
    if (/afvaller|niet benaderen|tier c/i.test(section)) continue; // diskwalificaties overslaan
    if (SKIP_RUNS.has(runDate)) continue;                          // pre-tweak runs overslaan
    for (const r of rows) {
      const bedrijf = cleanCell(r["bedrijf"] ?? "");
      if (!bedrijf || bedrijf.toLowerCase() === "bedrijf") continue;
      if (seen.has(bedrijf.toLowerCase())) { overgeslagen++; continue; }
      seen.add(bedrijf.toLowerCase());

      const ads = num(r["gads"]), budget = num(r["budget"]), waarde = num(r["waarde"]);
      const bereik = num(r["bereik"]), geen = num(r["geen-overlap"]);
      let scoreFields = {};
      let icpTotaal: number | null = num(r["icp"]);
      let tier = (cleanCell(r["tier"] ?? "") || null) as "A" | "B" | "C" | null;
      if (ads && budget && waarde && bereik && geen) {
        const s = scoreProspect({ ads, budget, leadwaarde: waarde, bereikbaarheid: bereik, geenBfOverlap: geen });
        scoreFields = {
          scoreAds: ads, scoreBudget: budget, scoreLeadwaarde: waarde,
          scoreBereikbaarheid: bereik, scoreGeenBfOverlap: geen,
        };
        icpTotaal = s.total; tier = s.tier;
      }

      await db.insert(prospects).values({
        bedrijf,
        website: cleanWebsite(r["website"] ?? ""),
        sector: cleanCell(r["sector"] ?? "") || null,
        haakje: cleanCell(r["haakje"] ?? r["status"] ?? "") || null,
        lookalikeCluster: cleanCell(r["look-alike cluster"] ?? "") || null,
        icpTotaal, tier,
        ...scoreFields,
        kanaal: "email",
        bron: `kandidaten-${runDate}`,
        status: "kandidaat",
      });
      perRun[runDate] = (perRun[runDate] ?? 0) + 1;
      toegevoegd++;
    }
  }
  console.log(`Klaar: ${toegevoegd} kandidaten toegevoegd, ${overgeslagen} overgeslagen (al aanwezig/dubbel).`);
  console.log("Per run:", Object.entries(perRun).map(([d, n]) => `${d}: ${n}`).join(" · "));
  process.exit(0);
}
main();
