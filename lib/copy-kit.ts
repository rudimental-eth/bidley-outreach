export type EmailTemplate = { stap: "Mail1" | "Mail2" | "Mail3"; onderwerp: string; body: string };

// Copy gehumaniseerd (geen AI-tells) + proof uit "Ad scripts Bidley.ai v2".
// Merge-velden in gebruik: {voornaam} {bedrijf} {sector} {afzender}
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    stap: "Mail1",
    onderwerp: "Snelle vraag over jullie Google Ads",
    body: [
      "Hoi {voornaam},",
      "",
      "Ik zag dat {bedrijf} op Google adverteert, vandaar dit berichtje.",
      "",
      "Wij zijn Bidley. We beheren Google Ads automatisch met AI: het systeem kijkt dag en nacht mee, sluit zoektermen uit die niks opleveren en zet budget in op wat wél werkt. Vanaf 199 euro per maand, zonder setupkosten en maandelijks opzegbaar.",
      "",
      "Wil je weten waar in jullie account budget weglekt? Doe de gratis audit, dan zie je het zwart-op-wit: bidley.ai/audit",
      "",
      "Groet,",
      "{afzender}, Bidley",
    ].join("\n"),
  },
  {
    stap: "Mail2",
    onderwerp: "Re: jullie Google Ads",
    body: [
      "Hoi {voornaam},",
      "",
      "Even twee voorbeelden van wat dit oplevert. Een tuningbedrijf ging in 60 dagen van 0 naar 45 leads per maand. En een behangspecialist haalde in de eerste maand 25% meer rendement uit z'n Google-campagnes.",
      "",
      "Allebei zonder dat ze er zelf naar hoefden te kijken. Wat er voor {bedrijf} in zit, zie je in de gratis audit: bidley.ai/audit",
      "",
      "Groet, {afzender}",
    ].join("\n"),
  },
  {
    stap: "Mail3",
    onderwerp: "Laatste berichtje",
    body: [
      "Hoi {voornaam},",
      "",
      "Ik hou het kort. Als je benieuwd bent, laat ik je in een kwartier zien hoe Bidley de Google Ads van {bedrijf} zou aanpakken: bidley.ai/demo.",
      "",
      "Is het niks voor je? Ook prima, dan hoor je verder niks meer van me.",
      "",
      "Groet, {afzender}",
    ].join("\n"),
  },
];

export function footer(kvkFooter: string, unsubscribeUrl: string): string {
  return `\n\n${kvkFooter}\nAfmelden: ${unsubscribeUrl}`;
}

// LinkedIn-spoor (semi-handmatig; tekst klaarzetten, plaatsen binnen ToS).
export type LinkedInTemplate = { stap: "A1" | "A2" | "A3" | "A4"; titel: string; body: string };

export const LINKEDIN_TEMPLATES: LinkedInTemplate[] = [
  {
    stap: "A1",
    titel: "Connectieverzoek (geen pitch)",
    body: "Hoi {voornaam}, ik zag dat {bedrijf} op Google adverteert. Ik help ondernemers meer uit hun Ads te halen zonder duur bureau. Leek me leuk om te connecten.",
  },
  {
    stap: "A2",
    titel: "Na acceptatie — waardevraag + audit",
    body: "Dank voor het connecten, {voornaam}. Doen jullie Google Ads zelf of via een bureau? Ik vraag het omdat ik bij veel {sector}-bedrijven zie dat er budget weglekt op zoektermen die niks opleveren. We hebben een gratis audit die dat in een paar minuten laat zien. Zal ik 'm sturen?",
  },
  {
    stap: "A3",
    titel: "Opvolging — proof + audit",
    body: "Even kort, {voornaam}. Een tuningbedrijf ging met onze aanpak in 60 dagen van 0 naar 45 leads per maand, volledig automatisch. Benieuwd wat er voor {bedrijf} mogelijk is? De gratis audit staat hier: bidley.ai/audit",
  },
  {
    stap: "A4",
    titel: "Naar demo (warm)",
    body: "Mooi dat je de audit hebt gedaan. Op basis daarvan laat ik je in een kwartier zien hoe Bidley dit voor {bedrijf} oppakt. Plannen kan hier: bidley.ai/demo. Liever bellen? Ook goed.",
  },
];
