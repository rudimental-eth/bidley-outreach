import { describe, it, expect } from "vitest";
import { mergeFields, requiredFieldsPresent } from "@/lib/personalize";

const velden = {
  voornaam: "Jan", bedrijf: "Acme", zoekwoord: "dakkapel",
  sector: "bouw", observatie: "Je adverteert breed.", afzender: "Lars",
};

describe("mergeFields", () => {
  it("vervangt alle merge-velden", () => {
    const out = mergeFields("Hoi {voornaam}, ik zag {bedrijf}.", velden);
    expect(out).toBe("Hoi Jan, ik zag Acme.");
  });
  it("laat onbekende placeholders ongemoeid", () => {
    expect(mergeFields("Hoi {onbekend}", velden)).toBe("Hoi {onbekend}");
  });
});

describe("requiredFieldsPresent", () => {
  it("false als observatie ontbreekt", () => {
    expect(requiredFieldsPresent({ ...velden, observatie: "" })).toBe(false);
  });
  it("true als alle verplichte velden er zijn", () => {
    expect(requiredFieldsPresent(velden)).toBe(true);
  });
});
