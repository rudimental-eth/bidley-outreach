import "./load-env";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { mergeFields } from "@/lib/personalize";
import { makeToken } from "@/lib/unsubscribe";
import { sendEmail } from "@/lib/resend";

// DB-VRIJE self-test: bewijst de Resend-verzendketen (template → personalisatie →
// footer/afmeldlink → verzending) zonder Supabase. Verstuurt naar TEST_EMAIL.
// Gebruik: npx tsx scripts/send-test-standalone.ts
async function main() {
  const naar = process.env.TEST_EMAIL ?? "ruud@blueflamingos.nl";
  const afzenderNaam = "Ruud Raaijmakers";
  const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === "Mail1")!;
  const velden = {
    voornaam: "Ruud",
    bedrijf: "TEST — eigen adres",
    zoekwoord: "google ads",
    sector: "test",
    observatie: "Dit is een testbericht van de Bidley lead machine.",
    afzender: afzenderNaam,
  };
  const token = makeToken(naar, process.env.UNSUBSCRIBE_SECRET!);
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/unsubscribe/${token}`;

  const { id } = await sendEmail({
    naar,
    afzenderNaam,
    replyTo: naar,
    onderwerp: "[TEST] " + mergeFields(tmpl.onderwerp, velden),
    body: mergeFields(tmpl.body, velden),
    kvkFooter: "Bidley B.V. — KvK 00000000 — [adres invullen]",
    unsubscribeUrl: url,
  });
  console.log(`Verzonden via Resend (id ${id}) → ${naar}`);
  console.log("Check je inbox: onderwerp met [TEST], footer + afmeldlink aanwezig.");
  process.exit(0);
}
main();
