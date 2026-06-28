import { describe, it, expect } from "vitest";
import { makeToken, verifyToken } from "@/lib/unsubscribe";

const secret = "test-secret-0123456789";

describe("unsubscribe token", () => {
  it("round-trips a valid token", () => {
    const t = makeToken("info@lead.nl", secret);
    expect(verifyToken(t, secret)).toEqual({ valid: true, email: "info@lead.nl" });
  });
  it("rejects a tampered token", () => {
    const t = makeToken("info@lead.nl", secret) + "x";
    expect(verifyToken(t, secret).valid).toBe(false);
  });
  it("rejects a token signed with another secret", () => {
    const t = makeToken("info@lead.nl", secret);
    expect(verifyToken(t, "ander-secret").valid).toBe(false);
  });
});
