import { describe, it, expect } from "vitest";
import { isSuppressed, domainOf } from "@/lib/suppression";

const list = [
  { email: "info@klant.nl", domein: null, reden: "bf_klant" },
  { email: null, domein: "concurrent.nl", reden: "bezwaar" },
];

describe("domainOf", () => {
  it("extracts the domain from an email", () => {
    expect(domainOf("Info@Voorbeeld.NL")).toBe("voorbeeld.nl");
  });
});

describe("isSuppressed", () => {
  it("matches on exact email (case-insensitive)", () => {
    expect(isSuppressed("INFO@klant.nl", list)).toBe(true);
  });
  it("matches on domain", () => {
    expect(isSuppressed("sales@concurrent.nl", list)).toBe(true);
  });
  it("passes a clean address", () => {
    expect(isSuppressed("info@nieuwlead.nl", list)).toBe(false);
  });
});
