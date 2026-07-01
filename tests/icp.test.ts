import { describe, it, expect } from "vitest";
import { icpTotal, icpTier, scoreProspect, scoreFromPaid } from "@/lib/icp";

describe("scoreFromPaid", () => {
  it("sterke adverteerder in sweet spot → hoge ads + budget", () => {
    const s = scoreFromPaid(120, 3000);
    expect(s.ads).toBe(5);
    expect(s.budget).toBe(5);
  });
  it("te grote spend → budget 1", () => {
    expect(scoreFromPaid(300, 40000).budget).toBe(1);
  });
  it("geen paid → ads 1", () => {
    expect(scoreFromPaid(0, 0).ads).toBe(1);
  });
});

describe("icpTotal", () => {
  it("telt de 5 assen op", () => {
    expect(icpTotal({ ads: 5, budget: 5, leadwaarde: 5, bereikbaarheid: 5, geenBfOverlap: 5 })).toBe(25);
  });
  it("clampt elke as naar 1-5", () => {
    expect(icpTotal({ ads: 9, budget: 0, leadwaarde: 3, bereikbaarheid: 3, geenBfOverlap: 3 })).toBe(5 + 1 + 3 + 3 + 3);
  });
});

describe("icpTier", () => {
  it("A bij 21-25", () => expect(icpTier(21)).toBe("A"));
  it("B bij 16-20", () => expect(icpTier(20)).toBe("B"));
  it("C onder 16", () => expect(icpTier(15)).toBe("C"));
});

describe("scoreProspect", () => {
  it("geeft totaal + tier", () => {
    expect(scoreProspect({ ads: 5, budget: 4, leadwaarde: 5, bereikbaarheid: 4, geenBfOverlap: 5 })).toEqual({
      total: 23, tier: "A",
    });
  });
});
