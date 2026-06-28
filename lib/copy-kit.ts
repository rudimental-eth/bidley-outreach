export type EmailTemplate = { stap: "Mail1" | "Mail2" | "Mail3"; onderwerp: string; body: string };

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    stap: "Mail1",
    onderwerp: "{bedrijf} + Google Ads — snelle observatie",
    body: [
      "Hoi {voornaam},",
      "",
      'Ik zag dat {bedrijf} adverteert op o.a. "{zoekwoord}". {observatie}',
      "",
      "Ik ben mede-oprichter van Bidley. We beheren Google Ads volledig op automatische piloot met AI — geen setupkosten, maandelijks opzegbaar, binnen 5 minuten live. Bedoeld voor ondernemers die resultaat willen zonder duur bureau of zelf marketeer te spelen.",
      "",
      "In plaats van een verkooppraatje: doe onze gratis audit (een paar minuten) en je ziet zwart-op-wit waar bij {bedrijf} budget weglekt en wat de besparing kan zijn → bidley.ai/audit",
      "",
      "Groet,",
      "{afzender} — Bidley.ai",
    ].join("\n"),
  },
  {
    stap: "Mail2",
    onderwerp: "Re: {bedrijf} + Google Ads",
    body: [
      "Hoi {voornaam},",
      "",
      "Korte aanvulling. Een paar resultaten van ondernemers die ons al gebruiken:",
      "• Renovlies Behangers: +24% leads, −21% kosten per lead",
      "• NN Tuning: +46% leads, −27% kosten per lead",
      "• Airport.nl: +111% meer reserveringen",
      "",
      "Allemaal zonder dat zij er zelf naar omkijken. De gratis audit laat zien wat er voor {bedrijf} in zit: bidley.ai/audit",
      "",
      "Groet, {afzender}",
    ].join("\n"),
  },
  {
    stap: "Mail3",
    onderwerp: "Zal ik het laten zien? (laatste mailtje)",
    body: [
      "Hoi {voornaam},",
      "",
      "Ik val je niet vaker lastig. Als het je interesseert: in een demo van 15 min laat ik concreet zien hoe Bidley de Ads van {bedrijf} zou oppakken — bidley.ai/demo. Geen interesse? Dan hoor je niks meer van me, helemaal goed.",
      "",
      "Groet, {afzender}",
    ].join("\n"),
  },
];

export function footer(kvkFooter: string, unsubscribeUrl: string): string {
  return `\n\n—\n${kvkFooter}\nAfmelden: ${unsubscribeUrl}`;
}
