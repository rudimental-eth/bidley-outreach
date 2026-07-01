import { describe, it, expect } from "vitest";
import { extractEmails, pickBusinessEmail } from "@/lib/contact";

describe("extractEmails", () => {
  it("vindt e-mailadressen en ontdubbelt/normaliseert", () => {
    const html = `<a href="mailto:Info@Acme.nl">mail</a> ook contact@acme.nl en INFO@acme.nl`;
    expect(extractEmails(html)).toEqual(["info@acme.nl", "contact@acme.nl"]);
  });
  it("filtert ruis (afbeeldingen, voorbeelddomeinen)", () => {
    const html = `logo@2x.png sentry@wixpress.com jij@example.com echt@acme.nl`;
    expect(extractEmails(html)).toEqual(["echt@acme.nl"]);
  });
});

describe("pickBusinessEmail", () => {
  it("kiest info@ op het eigen domein", () => {
    const got = pickBusinessEmail(["jan@gmail.com", "info@acme.nl", "sales@acme.nl"], "acme.nl");
    expect(got).toBe("info@acme.nl");
  });
  it("geeft null bij geen adressen", () => {
    expect(pickBusinessEmail([], "acme.nl")).toBe(null);
  });
  it("valt terug op eerste adres op domein als geen voorkeur-prefix", () => {
    expect(pickBusinessEmail(["boekhouding@acme.nl"], "acme.nl")).toBe("boekhouding@acme.nl");
  });
});
