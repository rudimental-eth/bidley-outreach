import { describe, it, expect } from "vitest";
import { buildEmail } from "@/lib/resend";

describe("buildEmail", () => {
  it("voegt footer + afmeldlink toe en zet de juiste afzender", () => {
    const mail = buildEmail({
      naar: "info@lead.nl",
      afzenderNaam: "Lars Esselink",
      replyTo: "lars@bidley.ai",
      onderwerp: "Test",
      body: "Hoi",
      kvkFooter: "Bidley B.V. — KvK 12345678",
      unsubscribeUrl: "https://app/u/abc",
    });
    expect(mail.from).toContain("Lars Esselink");
    expect(mail.from).toContain("@send.bidley.ai");
    expect(mail.reply_to).toBe("lars@bidley.ai");
    expect(mail.html).toContain("KvK 12345678");
    expect(mail.html).toContain("https://app/u/abc");
    expect(mail.headers["List-Unsubscribe"]).toContain("https://app/u/abc");
  });
});
