import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, prospects } from "@/db/schema";

// Eenmalige seed voor de VEILIGE TESTDRAAI: één afzender + één testprospect
// met je eigen e-mailadres. Pas TEST_EMAIL/TEST_NAAM aan via env of hieronder.
// Gebruik: npx tsx scripts/seed-test.ts
// Opruimen later: verwijder de rijen met bron='seed-test' en de seed-afzender.
async function main() {
  const email = process.env.TEST_EMAIL ?? "ruud@blueflamingos.nl";
  const naam = process.env.TEST_NAAM ?? "Ruud Raaijmakers";

  // Afzender (idempotent op unieke email).
  let afz = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!afz) {
    afz = (await db.insert(users).values({
      naam, email, rol: "admin",
      afzenderIdentiteit: naam,
      kvkFooter: "Bidley B.V. — KvK 00000000 — [adres invullen]",
      replyTo: email,
    }).returning())[0];
    console.log("Afzender aangemaakt:", afz.email);
  } else {
    console.log("Afzender bestond al:", afz.email);
  }

  // Testprospect (idempotent op bron='seed-test').
  const bestaand = (await db.select().from(prospects).where(eq(prospects.bron, "seed-test")).limit(1))[0];
  if (bestaand) {
    console.log("Testprospect bestond al:", bestaand.bedrijf);
  } else {
    const p = (await db.insert(prospects).values({
      bedrijf: "TEST — eigen adres",
      website: "https://blueflamingos.nl",
      sector: "test",
      contactpersoon: naam,
      publiekEmail: email,
      kanaal: "email",
      haakje: "testdraai van de lead machine",
      bron: "seed-test",
      status: "nieuw",
      afzenderId: afz.id,
    }).returning())[0];
    console.log("Testprospect aangemaakt:", p.bedrijf, "→", p.publiekEmail);
  }
  process.exit(0);
}
main();
