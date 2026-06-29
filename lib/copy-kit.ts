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

// LinkedIn-spoor (semi-handmatig; tekst klaarzetten, plaatsen binnen ToS).
export type LinkedInTemplate = { stap: "A1" | "A2" | "A3" | "A4"; titel: string; body: string };

export const LINKEDIN_TEMPLATES: LinkedInTemplate[] = [
  {
    stap: "A1",
    titel: "Connectieverzoek (geen pitch)",
    body: "Hoi {voornaam}, ik zie dat {bedrijf} actief adverteert op Google. Ik help ondernemers hun Ads-rendement te verhogen zonder duur bureau. Leek me interessant om te connecten.",
  },
  {
    stap: "A2",
    titel: "Na acceptatie — waardevraag + audit",
    body: "Dank voor het connecten, {voornaam}! Korte vraag: doe je Google Ads zelf of via een bureau? Ik vraag het omdat ik bij veel {sector}-bedrijven zie dat er budget weglekt op zoektermen die niet converteren. We hebben een gratis audit waarmee je in een paar minuten ziet waar jouw besparing zit — geen verplichting. Zal ik 'm sturen?",
  },
  {
    stap: "A3",
    titel: "Opvolging — proof + audit-CTA",
    body: "Even kort, {voornaam}: bedrijven als Renovlies en NN Tuning hebben met onze aanpak hun kosten per lead met ~20–27% verlaagd, volledig op automatische piloot. Wil je zien wat er voor {bedrijf} mogelijk is? De gratis audit staat hier: bidley.ai/audit — duurt een paar minuten.",
  },
  {
    stap: "A4",
    titel: "Naar demo (warm)",
    body: "Top dat je de audit hebt gedaan. Op basis daarvan kan ik je in 15 min laten zien hoe Bidley dit concreet voor {bedrijf} oppakt. Plannen kan direct: bidley.ai/demo. Liever even bellen? Ook prima.",
  },
];
