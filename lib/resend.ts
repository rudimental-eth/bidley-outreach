import { Resend } from "resend";
import { footer } from "./copy-kit";

const SENDER_DOMAIN = process.env.SENDER_DOMAIN ?? "send.bidley.ai";

export type EmailInput = {
  naar: string;
  afzenderNaam: string;
  replyTo: string;
  onderwerp: string;
  body: string;
  kvkFooter: string;
  unsubscribeUrl: string;
};

function slug(naam: string): string {
  return naam.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
}

export function buildEmail(i: EmailInput) {
  // SENDER_FROM overschrijft het volledige from-adres (bijv. onboarding@resend.dev
  // voor een test vóór domeinverificatie). Anders: <slug>@<SENDER_DOMAIN>.
  const fromAddr = process.env.SENDER_FROM ?? `${slug(i.afzenderNaam)}@${SENDER_DOMAIN}`;
  const text = i.body + footer(i.kvkFooter, i.unsubscribeUrl);
  const html = text.replace(/\n/g, "<br>");
  return {
    from: `${i.afzenderNaam} <${fromAddr}>`,
    to: i.naar,
    reply_to: i.replyTo,
    subject: i.onderwerp,
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${i.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export async function sendEmail(i: EmailInput): Promise<{ id: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const mail = buildEmail(i);
  const { data, error } = await resend.emails.send(mail as never);
  if (error) throw new Error(error.message);
  return { id: data!.id };
}
