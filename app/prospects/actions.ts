"use server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { prospects, conversions, messages, users } from "@/db/schema";
import { scoreProspect } from "@/lib/icp";
import { logAudit } from "@/lib/audit";
import { findPublicEmail } from "@/lib/contact";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { mergeFields } from "@/lib/personalize";
import { makeToken } from "@/lib/unsubscribe";
import { runSourcing } from "@/lib/sourcing-run";

type Status =
  | "kandidaat" | "nieuw" | "benaderd" | "audit_gestart" | "demo" | "klant"
  | "afgewezen_koud" | "opt_out";

function num(v: FormDataEntryValue | null, fallback = 3): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function addProspect(formData: FormData) {
  const bedrijf = String(formData.get("bedrijf") ?? "").trim();
  if (!bedrijf) return;

  const scores = {
    ads: num(formData.get("score_ads")),
    budget: num(formData.get("score_budget")),
    leadwaarde: num(formData.get("score_leadwaarde")),
    bereikbaarheid: num(formData.get("score_bereikbaarheid")),
    geenBfOverlap: num(formData.get("score_geen_bf_overlap")),
  };
  const { total, tier } = scoreProspect(scores);
  const kanaalRaw = String(formData.get("kanaal") ?? "email");
  const kanaal = (["email", "linkedin", "beide"].includes(kanaalRaw) ? kanaalRaw : "email") as
    "email" | "linkedin" | "beide";

  const [row] = await db.insert(prospects).values({
    bedrijf,
    website: String(formData.get("website") ?? "") || null,
    sector: String(formData.get("sector") ?? "") || null,
    contactpersoon: String(formData.get("contactpersoon") ?? "") || null,
    publiekEmail: String(formData.get("publiek_email") ?? "") || null,
    linkedinUrl: String(formData.get("linkedin_url") ?? "") || null,
    haakje: String(formData.get("haakje") ?? "") || null,
    kanaal,
    scoreAds: scores.ads, scoreBudget: scores.budget, scoreLeadwaarde: scores.leadwaarde,
    scoreBereikbaarheid: scores.bereikbaarheid, scoreGeenBfOverlap: scores.geenBfOverlap,
    icpTotaal: total, tier,
    bron: "handmatig",
    status: "nieuw",
  }).returning();
  await logAudit({ actie: "prospect-toegevoegd", entiteit: "prospect", entiteitId: row.id, doorWie: "gebruiker" });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function setStatus(id: string, status: Status) {
  await db.update(prospects).set({ status, laatsteActieOp: new Date() }).where(eq(prospects.id, id));
  if (status === "audit_gestart") {
    await db.insert(conversions).values({ prospectId: id, type: "audit_gestart", bron: "handmatig" });
  } else if (status === "demo") {
    await db.insert(conversions).values({ prospectId: id, type: "demo_geboekt", bron: "handmatig" });
  }
  await logAudit({ actie: `status-${status}`, entiteit: "prospect", entiteitId: id, doorWie: "gebruiker" });
  revalidatePath("/dashboard");
  revalidatePath("/candidates");
  revalidatePath("/funnel");
}

// Haalt via Ahrefs een nieuwe batch kandidaten op (voor de knop op /candidates).
export async function sourceCandidates(
  _prev: { message: string } | null,
  _formData: FormData,
): Promise<{ message: string }> {
  const r = await runSourcing({ keywords: 4 });
  revalidatePath("/candidates");
  return { message: r.message };
}

// Zoekt het publieke zakelijke e-mailadres op de eigen website van de prospect.
export async function verrijkContact(id: string) {
  const p = (await db.select().from(prospects).where(eq(prospects.id, id)).limit(1))[0];
  if (!p?.website) return;
  const email = await findPublicEmail(p.website);
  if (email) {
    await db.update(prospects).set({ publiekEmail: email }).where(eq(prospects.id, id));
    await logAudit({ actie: "contact-verrijkt", entiteit: "prospect", entiteitId: id, doorWie: "gebruiker" });
  } else {
    // Geen publiek zakelijk adres gevonden → LinkedIn-spoor (compliance-regel).
    await db.update(prospects).set({ kanaal: "linkedin" }).where(eq(prospects.id, id));
    await logAudit({ actie: "geen-publiek-email", entiteit: "prospect", entiteitId: id, doorWie: "gebruiker" });
  }
  revalidatePath("/dashboard");
}

// Bouwt een Mail 1-concept in de wachtrij (zonder Inngest). Idempotent per prospect.
export async function genereerMail1(id: string) {
  const p = (await db.select().from(prospects).where(eq(prospects.id, id)).limit(1))[0];
  if (!p?.publiekEmail) return;

  const bestaand = (await db.select().from(messages)
    .where(and(eq(messages.prospectId, id), eq(messages.stap, "Mail1"), eq(messages.status, "in_wachtrij")))
    .limit(1))[0];
  if (bestaand) return; // al in de wachtrij

  const afz = p.afzenderId
    ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
    : (await db.select().from(users).limit(1))[0];

  const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === "Mail1")!;
  const velden = {
    voornaam: p.contactpersoon?.split(" ")[0] ?? "",
    bedrijf: p.bedrijf, sector: p.sector ?? "",
    afzender: afz?.afzenderIdentiteit ?? "Bidley",
  };
  const token = makeToken(p.publiekEmail, process.env.UNSUBSCRIBE_SECRET!);
  await db.insert(messages).values({
    prospectId: id, kanaal: "email", stap: "Mail1",
    onderwerp: mergeFields(tmpl.onderwerp, velden),
    tekst: mergeFields(tmpl.body, velden),
    status: "in_wachtrij", unsubscribeToken: token,
  });
  await logAudit({ actie: "mail1-gegenereerd", entiteit: "prospect", entiteitId: id, doorWie: "gebruiker" });
  revalidatePath("/dashboard");
  revalidatePath("/queue");
}
