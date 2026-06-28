import { describe, it, expect } from "vitest";
import { threadHasReply, anyAfter } from "@/lib/gmail";

describe("threadHasReply", () => {
  it("true als er een bericht na de verzenddatum van iemand anders is", () => {
    const thread = {
      messages: [
        { internalDate: "1000", headers: { From: "lars@bidley.ai" } },
        { internalDate: "2000", headers: { From: "info@lead.nl" } },
      ],
    };
    expect(threadHasReply(thread, "lars@bidley.ai", 1500)).toBe(true);
  });
  it("false als alleen onze eigen mails in de thread staan", () => {
    const thread = {
      messages: [{ internalDate: "1000", headers: { From: "lars@bidley.ai" } }],
    };
    expect(threadHasReply(thread, "lars@bidley.ai", 500)).toBe(false);
  });
});

describe("anyAfter", () => {
  it("true als een datum na sinceMs ligt", () => {
    expect(anyAfter(["1000", "2000"], 1500)).toBe(true);
  });
  it("false als alle datums voor sinceMs liggen", () => {
    expect(anyAfter(["1000"], 1500)).toBe(false);
  });
});
