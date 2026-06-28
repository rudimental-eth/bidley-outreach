# Bidley Lead Machine — Standalone App (ontwerp)

> Status: Ontwerp v1 | Datum: 28 juni 2026 | Eigenaar: Ruud (+ Lars, Jelmer.O) | Project: Bidley.ai

## 1. Doel & context

De huidige Bidley Lead Machine is een Cowork/Claude Code-plugin: drie Claude-instructie-skills
(`prospect-research`, `outreach-engine`, `funnel-rapport`) plus assets (copy-kit, ICP-scoremodel,
klantprofiel, tracker-xlsx). Hij draait semi-handmatig — Claude vindt en scoort prospects, schrijft
Gmail-concepten, Ruud keurt goed en verstuurt zelf. Bewust compliance-zwaar, weinig koppelingen.

**Doel:** dit ombouwen tot een **losstaande, cloud-gehoste web-app** waarmee het team veel
(semi-automatische) outreach kan doen. De app vindt zelf NL-adverteerders + scoort op ICP, vult de
pipeline, personaliseert en **verstuurt zelf e-mail** (eigen afzenderdomein, ~10-30/dag, opt-out +
suppression ingebouwd), volgt sequences automatisch op, zet LinkedIn-berichten klaar (handmatig binnen
ToS), en toont funnel + conversie in een dashboard. AVG-compliance en de bestaande copy/ICP-assets
blijven de kern.

**Niet-doelen (v1):** geen 100+/dag mailoperatie met domein-rotatie/warm-up-infra; geen LinkedIn-bots;
geen geautomatiseerde Google Ads Transparency Center-bron (geen officiële API → optionele handmatige
verificatie).

## 2. Gekozen route

**Route B — custom app-schil + bestaande API's als motor.** Een Next.js-app die het team bezit, met de
data in eigen huis (Supabase/Postgres), maar het zware werk uitbesteed aan bewezen API's:
- Ahrefs-API voor sourcing-signalen,
- een ESP (Resend) met eigen afzenderdomein voor verzenden + deliverability,
- Claude-API voor research/scoring/personalisatie.

De app bouwt de orchestratie, de ICP-logica, de sequences, de compliance-laag en het dashboard — niet de
infrastructuur eronder. Afgewogen tegen A (alles zelf bouwen, herbouwt deliverability/crawling, maanden
werk) en C (outreach-platform inkopen, geen echt eigen app + SaaS-lock-in).

## 3. Architectuur & stack

| Laag | Keuze | Waarom |
|------|-------|--------|
| App + UI | Next.js (App Router) + Tailwind, op **Vercel** | Eén codebase voor dashboard én backend-API; altijd-aan |
| Database + Auth | **Supabase** (Postgres) + Supabase Auth (Google-login, beperkt tot werkdomein) | Eigen data; relationeel past bij funnel; 3 interne gebruikers, geen wachtwoordbeheer |
| ORM | Drizzle | Type-veilig schema + migraties |
| Achtergrond-jobs | **Inngest** | Scheduled runs (dagelijkse sourcing/opvolging) + sequence-stappen + retries; integreert met Next.js |
| E-mail | **Resend** met apart afzender(sub)domein (bv. `send.bidley.ai`), DKIM/SPF/DMARC | Verzenden + bounce/open/complaint/unsubscribe-webhooks; apart domein beschermt reputatie bidley.ai |
| Reply-detectie | **Gmail-API** op het afzender-account (Lars/Jelmer) | `reply-to` wijst naar Gmail; engine checkt op reply vóór een opvolgmail |
| AI-motor | **Claude-API** (Opus voor research/scoring, Sonnet voor bulk-personalisatie) | Research-synthese, ICP-scoring, copy-personalisatie |
| Sourcing-data | **Ahrefs-API** + ophalen van de eigen contactpagina | Adverteerders + `paid_cost`-proxy; publiek zakelijk e-mailadres |

**Externe afhankelijkheden om vroeg te regelen:** Ahrefs-API-key (los van de Cowork-MCP, toe te voegen als
beveiligde env-secret bij Fase 2), een apart afzenderdomein dat een paar weken wordt opgewarmd, en een
Resend-account met geverifieerd domein (DKIM/SPF/DMARC).

## 4. Datamodel

| Tabel | Kernvelden | Doel |
|-------|-----------|------|
| `prospects` | bedrijf, website, sector, contactpersoon, functie, linkedin_url, publiek_email, 5 ICP-subscores, icp_totaal, tier (A/B/C), kanaal (E-mail/LinkedIn/Beide), lookalike_cluster, haakje, bron, status, is_reseller, rechtsvorm_flag (ZZP), aangemaakt_op, laatste_actie_op, volgende_actie_op | Eén rij per prospect = de pipeline |
| `messages` | prospect_id, kanaal, sequence_stap (A1-A4 / Mail1-3), gegenereerde_tekst, onderwerp, status (concept/in_wachtrij/verzonden/beantwoord/gefaald), esp_message_id, gmail_thread_id, timestamps | Elke outreach-actie + historie |
| `email_events` | message_id, type (delivered/open/bounce/complaint/reply/unsubscribe), tijd, payload | Resend-webhooks + Gmail-reply-detectie; reply pauzeert de sequence |
| `suppression` | email, domein, reden (opt-out / BF-klant / Bidley-klant / bezwaar / bounce), toegevoegd_op | Harde check vóór élke verzending |
| `conversions` | prospect_id, type (audit_gestart / demo_geboekt), tijd, bron | Funnel + dashboard-KPI's |
| `users` | naam, email, rol (admin/gebruiker), afzender_identiteit (naam + KvK-footer + reply-to) | Auth + namens wie verstuurd wordt |
| `audit_log` | actie, entiteit, gebruiker/systeem, grondslag, tijd | AVG-verwerkingsregister |

**Pipeline-statussen:** `kandidaat` → `nieuw` → `benaderd` → `audit_gestart` → `demo` → `klant`, met
zijsporen `afgewezen_koud` en `opt_out`. Twee menselijke poorten: **kandidaat → nieuw** (lead-goedkeuring)
en **verzenden** (batch-goedkeuring van Mail 1).

**Migratie:** de bestaande `prospect-tracker.xlsx` wordt eenmalig geïmporteerd zodat de pipeline niet leeg
begint.

## 5. Dagelijkse werking (flow)

1. **Sourcing (Inngest, ma-vr 09:00)** — ~10 NL-adverteerders via Ahrefs-API + WebSearch; haalt publiek
   zakelijk e-mailadres van de contactpagina; Claude scoort op ICP (5 assen × 1-5) + schrijft een haakje;
   schrijft als `kandidaat` weg. Schrijft nooit direct in een sequence.
2. **Lead-goedkeuring (poort 1, dashboard)** — team beoordeelt kandidaten (scores + haakje), keurt goed/af.
   App filtert vooraf BF-klanten, Bidley-klanten, dubbelen en ontbrekende rechtsvorm. Goedgekeurd = `nieuw`.
3. **Outreach-engine (Inngest, ma-vr 08:00)** — bepaalt per prospect de exacte sequence-stap (Mail 1/2/3 of
   LinkedIn A1-A4) op basis van status + kanaal + dagen sinds laatste actie; Claude personaliseert met echte
   velden + proof points uit de copy-kit. E-mails → verzendwachtrij; LinkedIn → klaargezette tekst.
4. **Batch-goedkeuring + verzenden (poort 2, dashboard)** — team scant de wachtrij en verstuurt **Mail 1**
   met één klik per batch; app verstuurt via Resend met suppressie-check, KvK-footer en unieke afmeldlink.
   LinkedIn-berichten kopieert het team handmatig (binnen ToS).
5. **Opvolging (automatisch)** — Mail 2 (dag 3) en Mail 3 (dag 7) gaan **automatisch** volgens schema,
   maar **alleen als er geen reply is**. De engine checkt via de Gmail-API of er op de thread is geantwoord;
   bij een reply **pauzeert de sequence** en volgt het team persoonlijk op. Bounce/unsubscribe stopt de reeks.
6. **Terugkoppeling (Resend-webhooks + Gmail, automatisch)** — opens/bounces/complaints/unsubscribes komen
   binnen; unsubscribe → direct suppression; reply → sequence-pauze; audit/demo-conversies updaten de funnel.
7. **Dashboard** — pipeline-bord (prospects per status), de twee goedkeur-wachtrijen, en funnel-KPI's
   (benaderd → audit → demo → klant). Vervangt het oude artifact-dashboard.

Het "semi-automatische" zit in de twee poorten: de app doet het zware werk, het team houdt de hand aan de
kraan bij wie binnenkomt en wat de deur uitgaat.

## 6. Compliance-laag (ingebouwd)

De huidige checks & balances worden code i.p.v. handmatige discipline:

- **Suppressie-poort vóór élke verzending** — match op e-mail én domein tegen BF-klanten, Bidley-klanten,
  opt-outs en eerdere bezwaren. Geen match → niet versturen, gelogd waarom.
- **Verplichte mail-elementen, afgedwongen in code** — herkenbare afzender (Lars/Jelmer), bedrijfsgegevens +
  KvK in de footer, werkende unieke afmeldlink (eigen token-endpoint → klik = direct op suppression).
- **Alleen publiek, zakelijk e-mail** — sourcing accepteert alleen adressen van de eigen contactpagina
  (`info@`/`contact@`); geen patroon-gokken, geen e-mailfinder-tools, geen scraping van persoonsgegevens.
  Geen publiek adres → kanaal wordt automatisch LinkedIn.
- **ZZP/eenmanszaak-flag** — strenger behandelen of uitsluiten van e-mail (alleen LinkedIn voorstellen).
- **Verwerkingsregister** — elke verzending gelogd in `audit_log` (wie, wanneer, grondslag).
- **LinkedIn handmatig** binnen ToS — geen bots.

Dekt het kader uit `plan-van-aanpak-lead-machine.md` §7. Richtinggevend, geen juridisch advies — bij
opschalen laten toetsen.

## 7. Bouwvolgorde (fases)

Elke fase levert iets werkends op en krijgt een eigen implementatieplan.

**Fase 1 — Fundament + e-mail-motor (eerst).** App-skelet (Next.js + Supabase DB/auth + Vercel-deploy),
datamodel + migraties, pipeline-dashboard, eenmalige import van `prospect-tracker.xlsx`, en de volledige
e-mail-engine: Claude-personalisatie → Resend-verzending → suppressie + afmeldlink → Mail 1/2/3-sequence met
reply-check via Gmail → batch-goedkeuring → webhooks. *Resultaat: echte, semi-automatische e-mail-outreach
end-to-end op bestaande leads.*

**Fase 2 — Geautomatiseerde sourcing.** Ahrefs-API + WebSearch + contactpagina-extractie + Claude
ICP-scoring → kandidaten-wachtrij met lead-goedkeuring. *Resultaat: de funnel vult zichzelf dagelijks.*

**Fase 3 — LinkedIn-assist + funnel-analytics.** LinkedIn A1-A4 klaarzetten + statustracking,
conversietracking (audit/demo) en het volledige funnel-dashboard + wekelijks rapport. *Resultaat: tweede
kanaal + volledig zicht op de trechter.*

Dit document beschrijft het geheel; het eerstvolgende implementatieplan dekt **Fase 1**.

## 8. Herbruikte assets uit de bestaande plugin

- `outreach-copy-kit.md` — LinkedIn A1-A4 + Mail 1-3 + reactie-snippets + proof points (Renovlies, NN Tuning,
  Airport.nl). Wordt de template-bron voor de personalisatie-engine.
- `icp-scoremodel.md` — 5 assen × 1-5, tiers A/B/C. Wordt de scoring-logica in Fase 2.
- `klantprofiel-lookalike.md` — look-alike-clusters voor prioritering in sourcing.
- `plan-van-aanpak-lead-machine.md` §7 — het AVG-kader achter de compliance-laag.
- `prospect-tracker-template.xlsx` — bron voor de eenmalige import + kolom-mapping naar `prospects`.
