import { NextRequest } from "next/server";
import { db } from "@/db";
import { suppression } from "@/db/schema";
import { verifyToken } from "@/lib/unsubscribe";
import { domainOf } from "@/lib/suppression";
import { logAudit } from "@/lib/audit";

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = verifyToken(token, process.env.UNSUBSCRIBE_SECRET!);
  if (!res.valid || !res.email) return html("Ongeldige afmeldlink.", 400);
  return html(
    `<h1>Afmelden van Bidley</h1>
     <p>Klik op de knop om je af te melden voor ${res.email}.</p>
     <form method="POST"><button type="submit">Afmelden bevestigen</button></form>`,
  );
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = verifyToken(token, process.env.UNSUBSCRIBE_SECRET!);
  if (!res.valid || !res.email) return html("Ongeldige afmeldlink.", 400);
  await db.insert(suppression).values({
    email: res.email, domein: domainOf(res.email), reden: "opt_out",
  });
  await logAudit({ actie: "unsubscribe", entiteit: "suppression", grondslag: "verzoek betrokkene" });
  return html("<h1>Je bent afgemeld</h1><p>Je ontvangt geen e-mails meer van Bidley.</p>");
}
