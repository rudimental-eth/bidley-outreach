import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, emailEvents, suppression } from "@/db/schema";
import { domainOf } from "@/lib/suppression";

type ResendEvent = {
  type: string;
  data: { email_id: string; to: string[] };
};

const MAP: Record<string, "delivered" | "open" | "bounce" | "complaint"> = {
  "email.delivered": "delivered",
  "email.opened": "open",
  "email.bounced": "bounce",
  "email.complained": "complaint",
};

export async function POST(req: NextRequest) {
  const evt = (await req.json()) as ResendEvent;
  const type = MAP[evt.type];
  if (!type) return new Response("ok", { status: 200 });

  const msg = (await db.select().from(messages)
    .where(eq(messages.espMessageId, evt.data.email_id)).limit(1))[0];

  await db.insert(emailEvents).values({
    messageId: msg?.id ?? null, type, payload: evt as unknown as object,
  });

  if (type === "bounce" || type === "complaint") {
    const addr = evt.data.to?.[0];
    if (addr) {
      await db.insert(suppression).values({
        email: addr.toLowerCase(), domein: domainOf(addr),
        reden: type === "bounce" ? "bounce" : "bezwaar",
      });
    }
  }
  return new Response("ok", { status: 200 });
}
