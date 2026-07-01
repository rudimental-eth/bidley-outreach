import { describe, it, expect } from "vitest";
import { normalizeDomain, filterNew, domainFromUrl, tooBig, qualifiesForSourcing } from "@/lib/sourcing";

describe("domainFromUrl", () => {
  it("haalt het domein uit een SERP-url", () => {
    expect(domainFromUrl("https://www.acme.nl/product/x?y=1")).toBe("acme.nl");
  });
  it("geeft leeg bij lege input", () => {
    expect(domainFromUrl("")).toBe("");
  });
});

describe("tooBig / qualifiesForSourcing", () => {
  it("boven €15K = te groot", () => {
    expect(tooBig(20000)).toBe(true);
    expect(tooBig(5000)).toBe(false);
  });
  it("kwalificeert alleen bij paid-aanwezigheid en niet te groot", () => {
    expect(qualifiesForSourcing(20, 3000)).toBe(true);
    expect(qualifiesForSourcing(0, 3000)).toBe(false);
    expect(qualifiesForSourcing(50, 25000)).toBe(false);
  });
});

describe("normalizeDomain", () => {
  it("strip protocol, www, pad en hoofdletters", () => {
    expect(normalizeDomain("https://www.Acme.nl/contact")).toBe("acme.nl");
    expect(normalizeDomain("acme.nl/")).toBe("acme.nl");
  });
});

describe("filterNew", () => {
  const bestaand = { domeinen: new Set(["acme.nl", "123ruit.nl"]), namen: new Set(["acme", "mb veranda"]) };
  it("laat alleen nieuwe kandidaten door (op domein én naam)", () => {
    const kandidaten = [
      { bedrijf: "Acme", website: "https://acme.nl" },   // bestaand domein
      { bedrijf: "MB Veranda", website: "mbveranda.nl" }, // bestaande naam
      { bedrijf: "Nieuw BV", website: "https://nieuw.nl" }, // nieuw
    ];
    expect(filterNew(kandidaten, bestaand)).toEqual([{ bedrijf: "Nieuw BV", website: "https://nieuw.nl" }]);
  });
  it("ontdubbelt ook binnen de batch zelf", () => {
    const kandidaten = [
      { bedrijf: "Dubbel", website: "dubbel.nl" },
      { bedrijf: "Dubbel 2", website: "https://www.dubbel.nl" },
    ];
    expect(filterNew(kandidaten, { domeinen: new Set(), namen: new Set() })).toHaveLength(1);
  });
});
