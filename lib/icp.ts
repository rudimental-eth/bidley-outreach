// ICP-scoremodel (Bidley): 5 assen × 1-5 (max 25). Tier A=21-25, B=16-20, C<16.
// Bron: assets/icp-scoremodel.md uit de bidley-lead-machine plugin.
export type IcpScores = {
  ads: number;            // Draait Google Ads
  budget: number;         // Budget-fit €1-10K
  leadwaarde: number;     // Lead-/conversiewaarde van de klik
  bereikbaarheid: number; // Beslisser bereikbaar
  geenBfOverlap: number;  // Geen bestaande Blue Flamingos-klant
};

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

export function icpTotal(s: IcpScores): number {
  return clamp(s.ads) + clamp(s.budget) + clamp(s.leadwaarde) + clamp(s.bereikbaarheid) + clamp(s.geenBfOverlap);
}

export function icpTier(total: number): "A" | "B" | "C" {
  if (total >= 21) return "A";
  if (total >= 16) return "B";
  return "C";
}

export function scoreProspect(s: IcpScores): { total: number; tier: "A" | "B" | "C" } {
  const total = icpTotal(s);
  return { total, tier: icpTier(total) };
}

// Eerste-pass automatische score uit Ahrefs paid-data. paidCostUsd = proxy voor budget.
// Lead-/conversiewaarde en bereikbaarheid kunnen we niet auto-afleiden → mid-defaults;
// de mens verfijnt bij goedkeuring.
export function scoreFromPaid(paidKw: number, paidCostUsd: number): IcpScores {
  const ads = paidKw <= 0 ? 1 : paidKw >= 20 ? 5 : paidKw >= 5 ? 4 : 3;
  let budget: number;
  if (paidCostUsd >= 1000 && paidCostUsd <= 10000) budget = 5;
  else if (paidCostUsd > 10000 && paidCostUsd <= 15000) budget = 3;
  else if (paidCostUsd > 15000) budget = 1;
  else if (paidCostUsd >= 100) budget = 4;
  else budget = 3;
  return { ads, budget, leadwaarde: 4, bereikbaarheid: 3, geenBfOverlap: 5 };
}
