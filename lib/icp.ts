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
