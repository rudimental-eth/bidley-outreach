import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, emailEvents, suppression } from "@/db/schema";

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
  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  let evt: ResendEvent;
  try {
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
    evt = wh.verify(payload, headers) as ResendEvent;
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  const type = MAP[evt.type];
  if (!type) return new Response("ok", { status: 200 });

  const msg = (await db.select().from(messages)
    .where(eq(messages.espMessageId, evt.data.email_id)).limit(1))[0];

  await db.insert(emailEvents).values({
    messageId: msg?.id ?? null, type, payload: evt as unknown as object,
  });

  // FIX M5: bounce/complaint suppress the ADDRESS only, never the whole domain.
  if (type === "bounce" || type === "complaint") {
    const addr = evt.data.to?.[0];
    if (addr) {
      await db.insert(suppression).values({
        email: addr.toLowerCase(), domein: null,
        reden: type === "bounce" ? "bounce" : "bezwaar",
      });
    }
  }
  return new Response("ok", { status: 200 });
}
