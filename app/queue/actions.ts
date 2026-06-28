"use server";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messages, prospects, users, suppression } from "@/db/schema";
import { isSuppressed, type SuppressionEntry } from "@/lib/suppression";
import { sendEmail } from "@/lib/resend";
import { logAudit } from "@/lib/audit";

export async function verstuurBatch(messageIds: string[]) {
  if (messageIds.length === 0) return;
  const sup = (await db.select().from(suppression)) as SuppressionEntry[];
  const queue = await db.select().from(messages).where(inArray(messages.id, messageIds));

  for (const m of queue) {
    if (m.status !== "in_wachtrij") continue;
    const p = (await db.select().from(prospects).where(eq(prospects.id, m.prospectId)).limit(1))[0];
    if (!p?.publiekEmail || isSuppressed(p.publiekEmail, sup)) {
      await db.update(messages).set({ status: "gefaald" }).where(eq(messages.id, m.id));
      continue;
    }
    const afz = p.afzenderId
      ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
      : (await db.select().from(users).limit(1))[0];
    const url = `${process.env.APP_URL}/api/unsubscribe/${m.unsubscribeToken}`;
    const { id } = await sendEmail({
      naar: p.publiekEmail, afzenderNaam: afz?.afzenderIdentiteit ?? "Bidley",
      replyTo: afz?.replyTo ?? "", onderwerp: m.onderwerp ?? "", body: m.tekst,
      kvkFooter: afz?.kvkFooter ?? "", unsubscribeUrl: url,
    });
    await db.update(messages).set({ status: "verzonden", espMessageId: id, verzondenOp: new Date() })
      .where(eq(messages.id, m.id));
    await db.update(prospects).set({ status: "benaderd", laatsteActieOp: new Date() })
      .where(eq(prospects.id, p.id));
    await logAudit({ actie: "verstuur-Mail1", entiteit: "prospect", entiteitId: p.id });
  }
  revalidatePath("/queue");
}
