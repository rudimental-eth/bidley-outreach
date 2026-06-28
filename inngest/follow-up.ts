import { eq, and, inArray, desc } from "drizzle-orm";
import { inngest } from "./client";
import { db } from "@/db";
import { prospects, messages, users, suppression } from "@/db/schema";
import { nextStep, type SequenceStep } from "@/lib/sequence";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { mergeFields } from "@/lib/personalize";
import { genObservatie, renderTemplate } from "@/lib/claude";
import { makeToken } from "@/lib/unsubscribe";
import { isSuppressed, type SuppressionEntry } from "@/lib/suppression";
import { sendEmail } from "@/lib/resend";
import { fetchThread, threadHasReply } from "@/lib/gmail";
import { logAudit } from "@/lib/audit";

// ma-vr 08:30 → verstuurt automatisch Mail2/Mail3 als er geen reply is.
export const followUp = inngest.createFunction(
  { id: "follow-up", triggers: [{ cron: "TZ=Europe/Amsterdam 30 8 * * 1-5" }] },
  async ({ step }) => {
    const rijen = await step.run("laad-benaderd", async () =>
      db.select().from(prospects).where(
        and(eq(prospects.kanaal, "email"), inArray(prospects.status, ["benaderd"])),
      ),
    );
    const sup = (await step.run("laad-suppression", async () =>
      db.select().from(suppression))) as SuppressionEntry[];

    let verzonden = 0;
    for (const p of rijen) {
      if (!p.publiekEmail || isSuppressed(p.publiekEmail, sup)) continue;

      const laatste = (await db.select().from(messages)
        .where(eq(messages.prospectId, p.id))
        .orderBy(desc(messages.verzondenOp)).limit(1))[0];
      if (!laatste?.verzondenOp || !laatste.gmailThreadId) continue;

      const afz = p.afzenderId
        ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
        : (await db.select().from(users).limit(1))[0];

      const thread = await fetchThread(laatste.gmailThreadId);
      const reply = threadHasReply(thread, afz?.replyTo ?? "", laatste.verzondenOp.getTime());

      const stap = nextStep(
        { status: p.status, kanaal: "email", laatsteStap: laatste.stap as SequenceStep,
          laatsteActieOp: laatste.verzondenOp, replyOntvangen: reply },
        new Date(),
      );
      if (!stap) {
        if (reply) await db.update(prospects).set({ status: "benaderd" }).where(eq(prospects.id, p.id));
        continue;
      }

      await step.run(`verstuur-${stap}-${p.id}`, async () => {
        const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === stap)!;
        const observatie = p.haakje ? await genObservatie(p.haakje, p.bedrijf, p.sector ?? "") : "";
        const velden = {
          voornaam: p.contactpersoon?.split(" ")[0] ?? "", bedrijf: p.bedrijf,
          zoekwoord: p.haakje ?? "", sector: p.sector ?? "", observatie,
          afzender: afz?.afzenderIdentiteit ?? "Bidley",
        };
        const token = makeToken(p.publiekEmail!, process.env.UNSUBSCRIBE_SECRET!);
        const url = `${process.env.APP_URL}/api/unsubscribe/${token}`;
        const { id } = await sendEmail({
          naar: p.publiekEmail!, afzenderNaam: afz?.afzenderIdentiteit ?? "Bidley",
          replyTo: afz?.replyTo ?? "", onderwerp: mergeFields(tmpl.onderwerp, velden),
          body: renderTemplate(tmpl.body, velden), kvkFooter: afz?.kvkFooter ?? "",
          unsubscribeUrl: url,
        });
        await db.insert(messages).values({
          prospectId: p.id, kanaal: "email", stap, onderwerp: mergeFields(tmpl.onderwerp, velden),
          tekst: renderTemplate(tmpl.body, velden), status: "verzonden",
          espMessageId: id, gmailThreadId: laatste.gmailThreadId, verzondenOp: new Date(),
        });
        await db.update(prospects).set({ laatsteActieOp: new Date() }).where(eq(prospects.id, p.id));
        await logAudit({ actie: `verstuur-${stap}`, entiteit: "prospect", entiteitId: p.id });
        verzonden++;
      });
    }
    return { verzonden };
  },
);
