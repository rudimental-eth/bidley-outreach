import { eq, and, inArray } from "drizzle-orm";
import { inngest } from "./client";
import { db } from "@/db";
import { prospects, messages, users } from "@/db/schema";
import { nextStep } from "@/lib/sequence";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { genObservatie, renderTemplate } from "@/lib/claude";
import { mergeFields } from "@/lib/personalize";
import { makeToken } from "@/lib/unsubscribe";

// ma-vr 08:00 Europe/Amsterdam → bouwt concepten in status in_wachtrij voor Mail1.
export const outreachEngine = inngest.createFunction(
  { id: "outreach-engine", triggers: [{ cron: "TZ=Europe/Amsterdam 0 8 * * 1-5" }] },
  async ({ step }) => {
    const rijen = await step.run("laad-prospects", async () =>
      db.select().from(prospects).where(
        and(eq(prospects.kanaal, "email"), inArray(prospects.status, ["nieuw"])),
      ),
    );

    let gemaakt = 0;
    for (const p of rijen) {
      const stap = nextStep(
        { status: p.status, kanaal: "email", laatsteStap: null, laatsteActieOp: null, replyOntvangen: false },
        new Date(),
      );
      if (stap !== "Mail1" || !p.publiekEmail) continue;

      await step.run(`maak-concept-${p.id}`, async () => {
        const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === "Mail1")!;
        const afz = p.afzenderId
          ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
          : (await db.select().from(users).limit(1))[0];
        const observatie = p.haakje ? await genObservatie(p.haakje, p.bedrijf, p.sector ?? "") : "";
        const velden = {
          voornaam: p.contactpersoon?.split(" ")[0] ?? "",
          bedrijf: p.bedrijf, zoekwoord: p.haakje ?? "", sector: p.sector ?? "",
          observatie, afzender: afz?.afzenderIdentiteit ?? "Bidley",
        };
        const token = makeToken(p.publiekEmail!, process.env.UNSUBSCRIBE_SECRET!);
        await db.insert(messages).values({
          prospectId: p.id, kanaal: "email", stap: "Mail1",
          onderwerp: mergeFields(tmpl.onderwerp, velden),
          tekst: renderTemplate(tmpl.body, velden),
          status: "in_wachtrij", unsubscribeToken: token,
        });
        gemaakt++;
      });
    }
    return { gemaakt };
  },
);
