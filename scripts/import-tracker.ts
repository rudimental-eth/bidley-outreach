import * as XLSX from "xlsx";
import { db } from "@/db";
import { prospects } from "@/db/schema";

// Gebruik: npx tsx scripts/import-tracker.ts <pad-naar-xlsx>
async function main() {
  const pad = process.argv[2];
  if (!pad) throw new Error("Geef het pad naar de tracker-xlsx op.");
  const wb = XLSX.readFile(pad);
  const sheet = wb.Sheets["Prospects"] ?? wb.Sheets[wb.SheetNames[0]];
  const rijen = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  let n = 0;
  for (const r of rijen) {
    const bedrijf = r["Bedrijf"] ?? r["bedrijf"];
    if (!bedrijf) continue;
    await db.insert(prospects).values({
      bedrijf,
      website: r["Website"] ?? null,
      sector: r["Sector"] ?? null,
      contactpersoon: r["Contactpersoon"] ?? null,
      functie: r["Functie"] ?? null,
      linkedinUrl: r["LinkedIn"] ?? null,
      publiekEmail: r["E-mail (publiek)"] ?? r["E-mail"] ?? null,
      kanaal: (r["Kanaal"]?.toLowerCase() as "email" | "linkedin" | "beide") ?? "email",
      haakje: r["Haakje"] ?? null,
      bron: "import-tracker",
      status: "nieuw",
    });
    n++;
  }
  console.log(`${n} prospects geïmporteerd.`);
  process.exit(0);
}
main();
