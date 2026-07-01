// ICP-zoekwoorden voor discovery (klein-MKB, lead-intentie, geen Home & Living-maatwerk).
// De sourcing-run pakt hier elke keer een wisselende selectie uit.
export const SEED_KEYWORDS = [
  "kunstgras laten leggen",
  "airco laten installeren",
  "rioolontstopping spoed",
  "zonwering op maat",
  "warmtepomp installateur",
  "sierbestrating aanleggen",
  "gevelreiniging bedrijf",
  "autoruit vervangen",
  "traprenovatie kosten",
  "dakkapel plaatsen offerte",
  "isolatie spouwmuur",
  "funderingsherstel",
  "boekhouder zzp",
  "rijschool aanmelden",
  "personal trainer",
  "ongediertebestrijding wesp",
  "slotenmaker spoed",
  "printerinkt kopen",
  "hovenier tuinaanleg",
  "camerabeveiliging bedrijf",
  "verhuisbedrijf offerte",
  "cv ketel vervangen",
  "zonnepanelen installateur",
  "letselschade advocaat",
];

// Kies n zoekwoorden, wisselend per run (offset varieert de selectie).
export function pickKeywords(n: number, offset: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(SEED_KEYWORDS[(offset + i) % SEED_KEYWORDS.length]);
  return out;
}
