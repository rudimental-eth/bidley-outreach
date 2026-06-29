import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects, users } from "@/db/schema";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { mergeFields } from "@/lib/personalize";
import { makeToken } from "@/lib/unsubscribe";
import { sendEmail } from "@/lib/resend";

// Snelste self-test: stuurt ÉÉN Mail1 via Resend naar de seed-testprospect
// (= je eigen adres). Geen Inngest/Vercel/Claude nodig — alleen RESEND_API_KEY.
// Onderwerp krijgt "[TEST]" vooraan. Gebruik: npx tsx scripts/send-test.ts
async function main() {
  const p = (await db.select().from(prospects).where(eq(prospects.bron, "seed-test")).limit(1))[0];
  if (!p?.publiekEmail) throw new Error("Geen seed-testprospect gevonden — draai eerst: npx tsx scripts/seed-test.ts");
  const afz = p.afzenderId
    ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
    : (await db.select().from(users).limit(1))[0];

  const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === "Mail1")!;
  const velden = {
    voornaam: p.contactpersoon?.split(" ")[0] ?? "",
    bedrijf: p.bedrijf,
    zoekwoord: p.haakje ?? "",
    sector: p.sector ?? "",
    observatie: "Dit is een testbericht van de Bidley lead machine.",
    afzender: afz?.afzenderIdentiteit ?? "Bidley",
  };
  const token = makeToken(p.publiekEmail, process.env.UNSUBSCRIBE_SECRET!);
  const url = `${process.env.APP_URL}/api/unsubscribe/${token}`;

  const { id } = await sendEmail({
    naar: p.publiekEmail,
    afzenderNaam: afz?.afzenderIdentiteit ?? "Bidley",
    replyTo: afz?.replyTo ?? "",
    onderwerp: "[TEST] " + mergeFields(tmpl.onderwerp, velden),
    body: mergeFields(tmpl.body, velden),
    kvkFooter: afz?.kvkFooter ?? "",
    unsubscribeUrl: url,
  });
  console.log(`Verzonden via Resend (id ${id}) → ${p.publiekEmail}`);
  console.log("Check je inbox: footer + afmeldlink aanwezig? (de afmeldlink wijst naar APP_URL en werkt pas zodra de app draait/gedeployed is)");
  process.exit(0);
}
main();
