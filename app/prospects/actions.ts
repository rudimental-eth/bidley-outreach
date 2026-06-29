"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { prospects, conversions } from "@/db/schema";
import { scoreProspect } from "@/lib/icp";
import { logAudit } from "@/lib/audit";

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
