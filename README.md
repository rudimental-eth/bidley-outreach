# Bidley Lead Machine — web-app (Fase 1)

Een interne, cloud-gehoste web-app voor semi-automatische B2B-outreach voor **Bidley.ai**. Fase 1 dekt het
fundament + de e-mail-motor: prospects importeren → personaliseren → batch-goedkeuren → versturen via Resend
→ automatisch opvolgen (Mail 2/3) tenzij er een reply is, met suppressie, afmeldlink en verwerkingsregister
ingebouwd.

> Ontwerp: `docs/superpowers/specs/2026-06-28-bidley-lead-machine-app-design.md`
> Plan: `docs/superpowers/plans/2026-06-28-bidley-lead-machine-app-fase-1.md`

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (Postgres + Auth) · Drizzle ORM · Resend · Inngest · Claude API
· Gmail API · Vitest. Gehost op Vercel.

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul de waarden in (zie hieronder)
npm run dev
```

Tests + typecheck + build:
```bash
npm test
npx tsc --noEmit
npm run build
```

## Environment-variabelen

Zie `.env.example` voor de volledige lijst. Kort:

| Var | Waarvoor |
|-----|----------|
| `DATABASE_URL` | Supabase Postgres connection string |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side Supabase |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | e-mail versturen + webhook-verificatie |
| `ANTHROPIC_API_KEY` | Claude (observatie-personalisatie) |
| `UNSUBSCRIBE_SECRET` | HMAC-sleutel voor afmeldtokens (32+ tekens) |
| `APP_URL` | publieke app-URL (voor afmeldlinks) |
| `SENDER_DOMAIN` | apart afzenderdomein, bv. `send.bidley.ai` |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Inngest cloud |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | reply-detectie via Gmail |

## Deploy (eenmalige setup)

1. **Supabase** — maak een project, zet alle env-vars in Vercel (Production + Preview). Draai de migratie
   tegen de productie-DB:
   ```bash
   npm run db:migrate
   ```
2. **Resend** — verifieer het afzenderdomein `send.bidley.ai` (DKIM/SPF/DMARC). Warm het domein een paar
   weken op vóór volume. Zet een webhook → `https://<app>/api/webhooks/resend` (events: delivered, opened,
   bounced, complained). Zet `RESEND_WEBHOOK_SECRET`.
3. **Gmail** — maak een OAuth-client (Google Cloud), autoriseer de afzender-accounts (Lars/Jelmer) en haal
   een `GMAIL_REFRESH_TOKEN` op met scope `gmail.readonly` (voor reply-detectie). De `reply-to` van elke mail
   wijst naar het Gmail-adres van de afzender.
4. **Inngest** — koppel de Inngest-app aan `https://<app>/api/inngest`. De twee crons verschijnen automatisch:
   `outreach-engine` (ma-vr 08:00) en `follow-up` (ma-vr 08:30), beide Europe/Amsterdam.
5. **Vercel** — deploy:
   ```bash
   npx vercel --prod
   ```
6. **Importeer de bestaande tracker** (eenmalig):
   ```bash
   npm run import:tracker "<pad>/Bidley-prospect-tracker.xlsx"
   ```
7. **Afzenders** — voeg per afzender één rij toe in de `users`-tabel met `afzenderIdentiteit` (weergavenaam),
   `kvkFooter` (bedrijfsgegevens + KvK) en `replyTo` (Gmail-adres). Prospects zonder expliciete `afzenderId`
   gebruiken de eerste `users`-rij.

## Veilige eerste run (testdraai)

1. Zet één testprospect met **je eigen e-mailadres** op status `nieuw` (kanaal `email`).
2. Trigger de `outreach-engine`-functie handmatig via het Inngest-dashboard → er verschijnt een concept in de
   verzendwachtrij.
3. Open `/queue`, controleer de mail, en verstuur de batch.
4. Controleer: mail binnen met footer + werkende afmeldlink; afmelden schrijft naar `suppression`; bounce/
   complaint-webhooks landen in `email_events`; geen mail naar BF-klanten (zet die vooraf in `suppression`).

## Architectuur in het kort

- **Pure logica** (`lib/suppression`, `lib/unsubscribe`, `lib/personalize`, `lib/sequence`, `lib/copy-kit`) —
  los getest met Vitest, geen netwerk.
- **Wrappers** (`lib/resend`, `lib/gmail`, `lib/claude`) — dunne I/O-laag rond externe diensten.
- **Inngest-jobs** (`inngest/outreach-engine`, `inngest/follow-up`) — orchestratie; bevatten zelf geen
  businesslogica, roepen de `lib`-modules aan.
- **Routes** (`app/api/...`) — afmeldlink, Resend-webhook, Inngest-serve, auth-callback.
- **Proxy** (`proxy.ts`) — Next.js 16's middleware-opvolger; weert niet-ingelogde gebruikers.
- **UI** — app-shell met header/navigatie + login (magic link). Pagina's:
  - `app/dashboard` — kanban-pipeline met ICP-tier-badges + statusovergangen per kaart
  - `app/prospects/new` — prospect handmatig toevoegen (ICP-tier automatisch berekend, `lib/icp`)
  - `app/candidates` — kandidaten goedkeuren/afwijzen (poort 1)
  - `app/queue` — verzendwachtrij met selectie + batch-goedkeuring (poort 2)
  - `app/linkedin` — kant-en-klare A1-A4-berichten per prospect (handmatig plaatsen)
  - `app/funnel` — funnel-analytics (verdeling + conversieratio's)
- **Compliance** — suppressie-check vóór elke verzending, verplichte footer + afmeldlink, audit-log als
  verwerkingsregister.

## Bekend aandachtspunt (eerste live run)

Automatische opvolging (Mail 2/3) gebruikt reply-detectie via de Gmail-thread (`gmailThreadId` op het
verzonden bericht). Mail 1 wordt via Resend verstuurd; de koppeling van die verzending aan een Gmail-thread
moet bij de eerste echte run geverifieerd worden. Tot dat klopt, kan de reply-check beter op de
`reply-to`-inbox (zoeken op onderwerp) gebaseerd worden i.p.v. op `gmailThreadId`. Dit is het eerste te
valideren punt na deploy.

## Status & volgende fases

**Live op https://bidley-outreach.vercel.app** — login (magic link), pipeline, kandidaten, wachtrij,
LinkedIn-assist en funnel werken. E-mail verstuurt via Resend (interim `onboarding@resend.dev`). Handmatige
workflow is volledig bruikbaar.

Nog te koppelen (vereist accounts/keys):
- **Inngest-sync** afmaken → dagelijkse automatisering (`outreach-engine` / `follow-up`) live; nu draaien de
  crons nog niet (key/omgeving-mismatch van de Vercel-integratie).
- **Gmail-OAuth-token** → reply-detectie aanzetten (`follow-up` is fail-safe gepauzeerd zonder token).
- **ANTHROPIC_API_KEY** → AI-observatie-personalisatie in de mails.
- **Resend `send.bidley.ai`** verifiëren → versturen namens Bidley i.p.v. testadres (wacht op bidley.ai).
- **`APP_URL`** in Vercel op de live-URL zetten → kloppende afmeldlinks.
- **Echte Ahrefs-sourcing** (discovery + scoring) → de funnel zichzelf laten vullen i.p.v. handmatig toevoegen.
