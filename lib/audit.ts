import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function logAudit(entry: {
  actie: string; entiteit?: string; entiteitId?: string;
  doorWie?: string; grondslag?: string;
}) {
  await db.insert(auditLog).values({
    actie: entry.actie, entiteit: entry.entiteit, entiteitId: entry.entiteitId,
    doorWie: entry.doorWie ?? "systeem",
    grondslag: entry.grondslag ?? "gerechtvaardigd belang (B2B-outreach)",
  });
}
