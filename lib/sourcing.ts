// Dedup-garantie voor sourcing: geen enkel bestaand bedrijf/domein opnieuw ophalen.

export function normalizeDomain(website: string): string {
  return website
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

export type Kandidaat = { bedrijf: string; website: string };
export type Bestaand = { domeinen: Set<string>; namen: Set<string> };

// Houdt alleen kandidaten over die (a) nog niet in de DB staan (op domein of naam)
// en (b) nog niet eerder in dezelfde batch voorkwamen.
export function filterNew(kandidaten: Kandidaat[], bestaand: Bestaand): Kandidaat[] {
  const gezienDom = new Set(bestaand.domeinen);
  const gezienNaam = new Set(bestaand.namen);
  const uit: Kandidaat[] = [];
  for (const k of kandidaten) {
    const dom = normalizeDomain(k.website);
    const naam = k.bedrijf.trim().toLowerCase();
    if (gezienDom.has(dom) || gezienNaam.has(naam)) continue;
    gezienDom.add(dom);
    gezienNaam.add(naam);
    uit.push(k);
  }
  return uit;
}
