import { describe, it, expect } from "vitest";
import { nextStep } from "@/lib/sequence";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-06-28T08:00:00Z");

describe("nextStep (e-mailspoor)", () => {
  it("nieuwe prospect → Mail1", () => {
    expect(nextStep({ status: "nieuw", kanaal: "email", laatsteStap: null, laatsteActieOp: null, replyOntvangen: false }, now)).toBe("Mail1");
  });
  it("benaderd, 3 dagen geen reply → Mail2", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail1", laatsteActieOp: new Date(now.getTime() - 3 * day), replyOntvangen: false }, now)).toBe("Mail2");
  });
  it("benaderd, nog geen 3 dagen → geen actie", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail1", laatsteActieOp: new Date(now.getTime() - 1 * day), replyOntvangen: false }, now)).toBe(null);
  });
  it("reply ontvangen → geen automatische actie (pauze)", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail1", laatsteActieOp: new Date(now.getTime() - 5 * day), replyOntvangen: true }, now)).toBe(null);
  });
  it("Mail2, 7 dagen na Mail1 → Mail3", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail2", laatsteActieOp: new Date(now.getTime() - 4 * day), replyOntvangen: false }, now)).toBe("Mail3");
  });
  it("Mail3 al verstuurd → geen actie meer", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail3", laatsteActieOp: new Date(now.getTime() - 9 * day), replyOntvangen: false }, now)).toBe(null);
  });
});
