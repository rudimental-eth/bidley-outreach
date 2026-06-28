import { NextRequest } from "next/server";
import { db } from "@/db";
import { suppression } from "@/db/schema";
import { verifyToken } from "@/lib/unsubscribe";
import { domainOf } from "@/lib/suppression";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = verifyToken(token, process.env.UNSUBSCRIBE_SECRET!);
  if (!res.valid || !res.email) {
    return new Response("Ongeldige afmeldlink.", { status: 400 });
  }
  await db.insert(suppression).values({
    email: res.email, domein: domainOf(res.email), reden: "opt_out",
  });
  await logAudit({ actie: "unsubscribe", entiteit: "suppression", grondslag: "verzoek betrokkene" });
  return new Response(
    "<h1>Je bent afgemeld</h1><p>Je ontvangt geen e-mails meer van Bidley.</p>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
