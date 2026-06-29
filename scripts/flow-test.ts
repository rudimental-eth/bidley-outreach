import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects, messages, users, suppression } from "@/db/schema";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { mergeFields } from "@/lib/personalize";
import { makeToken } from "@/lib/unsubscribe";
import { isSuppressed, type SuppressionEntry } from "@/lib/suppression";
import { sendEmail } from "@/lib/resend";
import { logAudit } from "@/lib/audit";

// End-to-end flow-test tegen de ECHTE DB + Resend, zonder Inngest/Claude:
// reset seed-prospect → enqueue Mail1 → suppressie-check → versturen → status
// benaderd → audit-log. Herhaalbaar. Gebruik: npx tsx scripts/flow-test.ts
async function main() {
  const p = (await db.select().from(prospects).where(eq(prospects.bron, "seed-test")).limit(1))[0];
  if (!p?.publiekEmail) throw new Error("Geen seed-testprospect — draai eerst: npm run seed:test");

  // 1) Reset zodat het script herhaalbaar is.
  await db.delete(messages).where(eq(messages.prospectId, p.id));
  await db.update(prospects).set({ status: "nieuw", laatsteActieOp: null }).where(eq(prospects.id, p.id));
  console.log("1) Prospect gereset naar 'nieuw' en oude berichten gewist.");

  // 2) Enqueue Mail1 (zoals de outreach-engine, maar zonder Claude).
  const afz = p.afzenderId
    ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
    : (await db.select().from(users).limit(1))[0];
  const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === "Mail1")!;
  const velden = {
    voornaam: p.contactpersoon?.split(" ")[0] ?? "",
    bedrijf: p.bedrijf, zoekwoord: p.haakje ?? "", sector: p.sector ?? "",
    observatie: "Dit is een testbericht van de Bidley lead machine.",
    afzender: afz?.afzenderIdentiteit ?? "Bidley",
  };
  const token = makeToken(p.publiekEmail, process.env.UNSUBSCRIBE_SECRET!);
  const msg = (await db.insert(messages).values({
    prospectId: p.id, kanaal: "email", stap: "Mail1",
    onderwerp: "[TEST] " + mergeFields(tmpl.onderwerp, velden),
    tekst: mergeFields(tmpl.body, velden),
    status: "in_wachtrij", unsubscribeToken: token,
  }).returning())[0];
  console.log("2) Mail1-concept in wachtrij gezet.");

  // 3) Suppressie-poort (zoals verstuurBatch).
  const sup = (await db.select().from(suppression)) as SuppressionEntry[];
  if (isSuppressed(p.publiekEmail, sup)) {
    await db.update(messages).set({ status: "gefaald" }).where(eq(messages.id, msg.id));
    console.log("3) GEBLOKKEERD door suppressie — niet verstuurd (zo hoort het als adres gesuppresseerd is).");
    process.exit(0);
  }
  console.log("3) Suppressie-check: adres is schoon → versturen.");

  // 4) Versturen via Resend.
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/unsubscribe/${msg.unsubscribeToken}`;
  const { id } = await sendEmail({
    naar: p.publiekEmail, afzenderNaam: afz?.afzenderIdentiteit ?? "Bidley",
    replyTo: afz?.replyTo ?? "", onderwerp: msg.onderwerp ?? "", body: msg.tekst,
    kvkFooter: afz?.kvkFooter ?? "", unsubscribeUrl: url,
  });

  // 5) Status bijwerken + audit (zoals verstuurBatch).
  await db.update(messages).set({ status: "verzonden", espMessageId: id, verzondenOp: new Date() }).where(eq(messages.id, msg.id));
  await db.update(prospects).set({ status: "benaderd", laatsteActieOp: new Date() }).where(eq(prospects.id, p.id));
  await logAudit({ actie: "verstuur-Mail1", entiteit: "prospect", entiteitId: p.id });
  console.log(`4) Verzonden via Resend (id ${id}) → ${p.publiekEmail}`);
  console.log("5) Status → 'benaderd', audit-log geschreven.");
  console.log("");
  console.log("✅ Volledige flow bewezen: enqueue → suppressie → Resend → status → audit.");
  process.exit(0);
}
main();
