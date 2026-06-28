# Bidley Lead Machine — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een werkende, cloud-gehoste web-app waarmee het team semi-automatische e-mail-outreach end-to-end doet op bestaande leads: importeren → personaliseren → batch-goedkeuren → versturen via Resend → automatisch opvolgen (Mail 2/3) tenzij er een reply is, met suppressie + afmeldlink + verwerkingsregister ingebouwd.

**Architecture:** Eén Next.js (App Router) app op Vercel met Supabase (Postgres + Auth) eronder, Drizzle als ORM. Pure businesslogica (suppressie, sequence-bepaling, personalisatie-merge, afmeldtoken) zit in losse, los testbare modules in `lib/`. Externe diensten (Resend, Claude, Gmail) zitten achter dunne wrappers die in tests gemockt worden. Inngest draait de scheduled outreach- en opvolg-jobs.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind, Supabase (Postgres + Auth), Drizzle ORM, Resend, Inngest, Claude API (`@anthropic-ai/sdk`), Gmail API (`googleapis`), Vitest voor tests.

---

## Bestandsstructuur (Fase 1)

```
bidley-lead-machine-app/
  app/
    layout.tsx                      # root layout + Tailwind
    page.tsx                        # redirect → /dashboard
    login/page.tsx                  # Google-login (Supabase Auth)
    dashboard/page.tsx              # pipeline-bord (prospects per status)
    queue/page.tsx                  # verzendwachtrij + batch-goedkeuring (poort 2)
    api/
      inngest/route.ts              # Inngest serve-endpoint
      webhooks/resend/route.ts      # Resend event-webhook
      unsubscribe/[token]/route.ts  # afmeldlink-endpoint
      queue/send/route.ts           # batch-verzend-actie (server action target)
  db/
    schema.ts                       # Drizzle-schema (alle tabellen)
    index.ts                        # Drizzle-client (postgres-js)
    migrations/                     # gegenereerde SQL-migraties
  lib/
    suppression.ts                  # pure: is een adres/domein gesuppresseerd?
    unsubscribe.ts                  # pure: token genereren/valideren
    personalize.ts                  # pure: merge-velden in copy-template
    sequence.ts                     # pure: bepaal volgende sequence-stap
    copy-kit.ts                     # de Mail 1/2/3 templates + footer
    resend.ts                       # wrapper rond Resend-verzending
    claude.ts                       # wrapper rond Claude-personalisatie
    gmail.ts                        # wrapper: heeft thread een reply?
    audit.ts                        # schrijf naar audit_log
    supabase/server.ts              # server-side Supabase-client
  inngest/
    client.ts                       # Inngest-client
    outreach-engine.ts              # ma-vr 08:00: bouw verzendwachtrij
    follow-up.ts                    # opvolging Mail 2/3 (auto, tenzij reply)
  scripts/
    import-tracker.ts               # eenmalige xlsx-import → prospects
  tests/
    suppression.test.ts
    unsubscribe.test.ts
    personalize.test.ts
    sequence.test.ts
    resend.test.ts
    gmail.test.ts
  drizzle.config.ts
  vitest.config.ts
  .env.local                        # secrets (niet committen)
```

**Decompositie-principe:** alle beslislogica is puur en zit in `lib/*.ts` zonder netwerk-calls, zodat het zonder mocks getest wordt. De wrappers (`resend.ts`, `claude.ts`, `gmail.ts`) zijn dun en doen alleen de I/O. Inngest-functies bevatten geen businesslogica zelf — ze roepen de `lib`-modules aan.

---

## Task 1: Project scaffolden (Next.js + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `vitest.config.ts`, `tests/smoke.test.ts`

- [ ] **Step 1: Scaffold Next.js**

Run in `bidley-lead-machine-app/`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --use-npm --yes
```
Expected: Next.js-project aangemaakt in de huidige map (naast de bestaande `docs/`).

- [ ] **Step 2: Vitest installeren + config**

```bash
npm install -D vitest @vitest/coverage-v8
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

Add to `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write a smoke test**

Create `tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

## Task 2: Database-client + Drizzle config (Supabase Postgres)

**Files:**
- Create: `db/index.ts`, `drizzle.config.ts`, `.env.local` (lokaal, niet committen)
- Modify: `package.json`

- [ ] **Step 1: Dependencies installeren**

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

- [ ] **Step 2: Env-variabelen vastleggen**

Create `.env.local` (vul je eigen Supabase-waarden in — staat in `.gitignore`):
```
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
UNSUBSCRIBE_SECRET=<32-char-random>
APP_URL=http://localhost:3000
SENDER_DOMAIN=send.bidley.ai
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
```

- [ ] **Step 3: Drizzle-client**

Create `db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Drizzle-kit config**

Create `drizzle.config.ts`:
```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

Add to `package.json` `"scripts"`:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 5: Commit**

```bash
git add db/index.ts drizzle.config.ts package.json package-lock.json
git commit -m "chore: add Drizzle client and config for Supabase Postgres"
```

---

## Task 3: Datamodel-schema definiëren

**Files:**
- Create: `db/schema.ts`

- [ ] **Step 1: Schema schrijven**

Create `db/schema.ts`:
```ts
import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, pgEnum,
} from "drizzle-orm/pg-core";

export const prospectStatus = pgEnum("prospect_status", [
  "kandidaat", "nieuw", "benaderd", "audit_gestart", "demo", "klant",
  "afgewezen_koud", "opt_out",
]);
export const kanaal = pgEnum("kanaal", ["email", "linkedin", "beide"]);
export const tier = pgEnum("tier", ["A", "B", "C"]);
export const messageStatus = pgEnum("message_status", [
  "concept", "in_wachtrij", "verzonden", "beantwoord", "gefaald",
]);
export const sequenceStep = pgEnum("sequence_step", [
  "A1", "A2", "A3", "A4", "Mail1", "Mail2", "Mail3",
]);
export const eventType = pgEnum("event_type", [
  "delivered", "open", "bounce", "complaint", "reply", "unsubscribe",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  naam: text("naam").notNull(),
  email: text("email").notNull().unique(),
  rol: text("rol").notNull().default("gebruiker"),
  afzenderIdentiteit: text("afzender_identiteit"), // weergavenaam
  kvkFooter: text("kvk_footer"),
  replyTo: text("reply_to"),                        // Gmail-adres
  aangemaaktOp: timestamp("aangemaakt_op", { withTimezone: true }).defaultNow(),
});

export const prospects = pgTable("prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  bedrijf: text("bedrijf").notNull(),
  website: text("website"),
  sector: text("sector"),
  contactpersoon: text("contactpersoon"),
  functie: text("functie"),
  linkedinUrl: text("linkedin_url"),
  publiekEmail: text("publiek_email"),
  scoreAds: integer("score_ads"),
  scoreBudget: integer("score_budget"),
  scoreLeadwaarde: integer("score_leadwaarde"),
  scoreBereikbaarheid: integer("score_bereikbaarheid"),
  scoreGeenBfOverlap: integer("score_geen_bf_overlap"),
  icpTotaal: integer("icp_totaal"),
  tier: tier("tier"),
  kanaal: kanaal("kanaal").notNull().default("email"),
  lookalikeCluster: text("lookalike_cluster"),
  haakje: text("haakje"),
  bron: text("bron"),
  status: prospectStatus("status").notNull().default("nieuw"),
  isReseller: boolean("is_reseller").notNull().default(false),
  rechtsvormZzp: boolean("rechtsvorm_zzp").notNull().default(false),
  afzenderId: uuid("afzender_id").references(() => users.id),
  aangemaaktOp: timestamp("aangemaakt_op", { withTimezone: true }).defaultNow(),
  laatsteActieOp: timestamp("laatste_actie_op", { withTimezone: true }),
  volgendeActieOp: timestamp("volgende_actie_op", { withTimezone: true }),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id),
  kanaal: kanaal("kanaal").notNull(),
  stap: sequenceStep("stap").notNull(),
  onderwerp: text("onderwerp"),
  tekst: text("tekst").notNull(),
  status: messageStatus("status").notNull().default("concept"),
  espMessageId: text("esp_message_id"),
  gmailThreadId: text("gmail_thread_id"),
  unsubscribeToken: text("unsubscribe_token"),
  aangemaaktOp: timestamp("aangemaakt_op", { withTimezone: true }).defaultNow(),
  verzondenOp: timestamp("verzonden_op", { withTimezone: true }),
});

export const emailEvents = pgTable("email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => messages.id),
  type: eventType("type").notNull(),
  tijd: timestamp("tijd", { withTimezone: true }).defaultNow(),
  payload: jsonb("payload"),
});

export const suppression = pgTable("suppression", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  domein: text("domein"),
  reden: text("reden").notNull(),
  toegevoegdOp: timestamp("toegevoegd_op", { withTimezone: true }).defaultNow(),
});

export const conversions = pgTable("conversions", {
  id: uuid("id").primaryKey().defaultRandom(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id),
  type: text("type").notNull(), // audit_gestart | demo_geboekt
  tijd: timestamp("tijd", { withTimezone: true }).defaultNow(),
  bron: text("bron"),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actie: text("actie").notNull(),
  entiteit: text("entiteit"),
  entiteitId: uuid("entiteit_id"),
  doorWie: text("door_wie"),     // user-email of "systeem"
  grondslag: text("grondslag"),
  tijd: timestamp("tijd", { withTimezone: true }).defaultNow(),
});
```

- [ ] **Step 2: Migratie genereren**

Run: `npm run db:generate`
Expected: een SQL-bestand verschijnt in `db/migrations/`.

- [ ] **Step 3: Migratie uitvoeren**

Run: `npm run db:migrate`
Expected: tabellen aangemaakt in Supabase (geen errors).

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations
git commit -m "feat: add database schema and initial migration"
```

---

## Task 4: Suppressie-module (pure logica, TDD)

**Files:**
- Create: `lib/suppression.ts`, `tests/suppression.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/suppression.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isSuppressed, domainOf } from "@/lib/suppression";

const list = [
  { email: "info@klant.nl", domein: null, reden: "bf_klant" },
  { email: null, domein: "concurrent.nl", reden: "bezwaar" },
];

describe("domainOf", () => {
  it("extracts the domain from an email", () => {
    expect(domainOf("Info@Voorbeeld.NL")).toBe("voorbeeld.nl");
  });
});

describe("isSuppressed", () => {
  it("matches on exact email (case-insensitive)", () => {
    expect(isSuppressed("INFO@klant.nl", list)).toBe(true);
  });
  it("matches on domain", () => {
    expect(isSuppressed("sales@concurrent.nl", list)).toBe(true);
  });
  it("passes a clean address", () => {
    expect(isSuppressed("info@nieuwlead.nl", list)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/suppression.test.ts`
Expected: FAIL — kan `@/lib/suppression` niet vinden.

- [ ] **Step 3: Write minimal implementation**

Create `lib/suppression.ts`:
```ts
export type SuppressionEntry = {
  email: string | null;
  domein: string | null;
  reden: string;
};

export function domainOf(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isSuppressed(email: string, list: SuppressionEntry[]): boolean {
  const addr = email.trim().toLowerCase();
  const dom = domainOf(addr);
  return list.some(
    (e) =>
      (e.email && e.email.trim().toLowerCase() === addr) ||
      (e.domein && e.domein.trim().toLowerCase() === dom),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/suppression.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/suppression.ts tests/suppression.test.ts
git commit -m "feat: add suppression matching logic"
```

---

## Task 5: Afmeldtoken-module (pure logica, TDD)

**Files:**
- Create: `lib/unsubscribe.ts`, `tests/unsubscribe.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unsubscribe.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { makeToken, verifyToken } from "@/lib/unsubscribe";

const secret = "test-secret-0123456789";

describe("unsubscribe token", () => {
  it("round-trips a valid token", () => {
    const t = makeToken("info@lead.nl", secret);
    expect(verifyToken(t, secret)).toEqual({ valid: true, email: "info@lead.nl" });
  });
  it("rejects a tampered token", () => {
    const t = makeToken("info@lead.nl", secret) + "x";
    expect(verifyToken(t, secret).valid).toBe(false);
  });
  it("rejects a token signed with another secret", () => {
    const t = makeToken("info@lead.nl", secret);
    expect(verifyToken(t, "ander-secret").valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unsubscribe.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Write minimal implementation**

Create `lib/unsubscribe.ts`:
```ts
import { createHmac } from "node:crypto";

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function makeToken(email: string, secret: string): string {
  const payload = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyToken(
  token: string,
  secret: string,
): { valid: boolean; email?: string } {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return { valid: false };
  if (sign(payload, secret) !== sig) return { valid: false };
  return { valid: true, email: Buffer.from(payload, "base64url").toString("utf8") };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unsubscribe.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/unsubscribe.ts tests/unsubscribe.test.ts
git commit -m "feat: add HMAC-signed unsubscribe tokens"
```

---

## Task 6: Copy-kit templates + personalisatie-merge (pure logica, TDD)

**Files:**
- Create: `lib/copy-kit.ts`, `lib/personalize.ts`, `tests/personalize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/personalize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mergeFields, requiredFieldsPresent } from "@/lib/personalize";

const velden = {
  voornaam: "Jan", bedrijf: "Acme", zoekwoord: "dakkapel",
  sector: "bouw", observatie: "Je adverteert breed.", afzender: "Lars",
};

describe("mergeFields", () => {
  it("vervangt alle merge-velden", () => {
    const out = mergeFields("Hoi {voornaam}, ik zag {bedrijf}.", velden);
    expect(out).toBe("Hoi Jan, ik zag Acme.");
  });
  it("laat onbekende placeholders ongemoeid", () => {
    expect(mergeFields("Hoi {onbekend}", velden)).toBe("Hoi {onbekend}");
  });
});

describe("requiredFieldsPresent", () => {
  it("false als observatie ontbreekt", () => {
    expect(requiredFieldsPresent({ ...velden, observatie: "" })).toBe(false);
  });
  it("true als alle verplichte velden er zijn", () => {
    expect(requiredFieldsPresent(velden)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/personalize.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Write minimal implementation**

Create `lib/personalize.ts`:
```ts
export type MergeVelden = {
  voornaam: string; bedrijf: string; zoekwoord: string;
  sector: string; observatie: string; afzender: string;
};

export function mergeFields(template: string, velden: Partial<MergeVelden>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in velden && velden[key as keyof MergeVelden] != null
      ? String(velden[key as keyof MergeVelden])
      : m,
  );
}

// Verplicht voor compliance: nooit een massa-identieke mail — observatie moet echt ingevuld zijn.
export function requiredFieldsPresent(velden: Partial<MergeVelden>): boolean {
  return Boolean(velden.voornaam && velden.bedrijf && velden.observatie?.trim());
}
```

Create `lib/copy-kit.ts` (uit `outreach-copy-kit.md`):
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/personalize.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/personalize.ts lib/copy-kit.ts tests/personalize.test.ts
git commit -m "feat: add copy-kit templates and merge-field personalization"
```

---

## Task 7: Sequence-bepaling (pure logica, TDD)

**Files:**
- Create: `lib/sequence.ts`, `tests/sequence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/sequence.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { nextStep } from "@/lib/sequence";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-06-28T08:00:00Z");

describe("nextStep (e-mailspoor)", () => {
  it("nieuwe prospect → Mail1", () => {
    expect(nextStep({ status: "nieuw", kanaal: "email", laatsteStap: null, laatsteActieOp: null, replyOntvangen: false }, now)).toBe("Mail1");
  });
  it("benaderd, 3 dagen geen reply → Mail2", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail1", laatsteActieOp: new Date(now.getTime() - 3 * day), replyOntvangen: false }, now)).toBe("Mail2");
  });
  it("benaderd, nog geen 3 dagen → geen actie", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail1", laatsteActieOp: new Date(now.getTime() - 1 * day), replyOntvangen: false }, now)).toBe(null);
  });
  it("reply ontvangen → geen automatische actie (pauze)", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail1", laatsteActieOp: new Date(now.getTime() - 5 * day), replyOntvangen: true }, now)).toBe(null);
  });
  it("Mail2, 7 dagen na Mail1 → Mail3", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail2", laatsteActieOp: new Date(now.getTime() - 4 * day), replyOntvangen: false }, now)).toBe("Mail3");
  });
  it("Mail3 al verstuurd → geen actie meer", () => {
    expect(nextStep({ status: "benaderd", kanaal: "email", laatsteStap: "Mail3", laatsteActieOp: new Date(now.getTime() - 9 * day), replyOntvangen: false }, now)).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sequence.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Write minimal implementation**

Create `lib/sequence.ts`:
```ts
export type SequenceStep = "Mail1" | "Mail2" | "Mail3";

export type ProspectSeqState = {
  status: string;
  kanaal: "email" | "linkedin" | "beide";
  laatsteStap: SequenceStep | string | null;
  laatsteActieOp: Date | null;
  replyOntvangen: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

// Bepaalt de volgende e-mailstap. null = niets doen.
export function nextStep(p: ProspectSeqState, now: Date): SequenceStep | null {
  if (p.kanaal === "linkedin") return null;        // e-mailspoor n.v.t.
  if (p.replyOntvangen) return null;               // reply → pauze, mens neemt over
  if (["klant", "afgewezen_koud", "opt_out", "demo"].includes(p.status)) return null;

  if (!p.laatsteStap) return "Mail1";              // nieuw → eerste mail
  if (!p.laatsteActieOp) return null;

  const dagenSinds = (now.getTime() - p.laatsteActieOp.getTime()) / DAY;
  if (p.laatsteStap === "Mail1" && dagenSinds >= 3) return "Mail2";
  if (p.laatsteStap === "Mail2" && dagenSinds >= 4) return "Mail3"; // dag 7 t.o.v. Mail1 ≈ dag 4 na Mail2
  return null;                                     // Mail3 of te vroeg → niets
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sequence.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/sequence.ts tests/sequence.test.ts
git commit -m "feat: add e-mail sequence step determination"
```

---

## Task 8: Resend-wrapper (TDD met mock)

**Files:**
- Create: `lib/resend.ts`, `tests/resend.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Dependency installeren**

```bash
npm install resend
```

- [ ] **Step 2: Write the failing test**

Create `tests/resend.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { buildEmail } from "@/lib/resend";

describe("buildEmail", () => {
  it("voegt footer + afmeldlink toe en zet de juiste afzender", () => {
    const mail = buildEmail({
      naar: "info@lead.nl",
      afzenderNaam: "Lars Esselink",
      replyTo: "lars@bidley.ai",
      onderwerp: "Test",
      body: "Hoi",
      kvkFooter: "Bidley B.V. — KvK 12345678",
      unsubscribeUrl: "https://app/u/abc",
    });
    expect(mail.from).toContain("Lars Esselink");
    expect(mail.from).toContain("@send.bidley.ai");
    expect(mail.reply_to).toBe("lars@bidley.ai");
    expect(mail.html).toContain("KvK 12345678");
    expect(mail.html).toContain("https://app/u/abc");
    expect(mail.headers["List-Unsubscribe"]).toContain("https://app/u/abc");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/resend.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 4: Write minimal implementation**

Create `lib/resend.ts`:
```ts
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
  const fromAddr = `${slug(i.afzenderNaam)}@${SENDER_DOMAIN}`;
  const text = i.body + footer(i.kvkFooter, i.unsubscribeUrl);
  const html = text.replace(/\n/g, "<br>");
  return {
    from: `${i.afzenderNaam} <${fromAddr}>`,
    to: i.naar,
    reply_to: i.replyTo,
    subject: i.onderwerp,
    text,
    html,
    headers: { "List-Unsubscribe": `<${i.unsubscribeUrl}>` },
  };
}

export async function sendEmail(i: EmailInput): Promise<{ id: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const mail = buildEmail(i);
  const { data, error } = await resend.emails.send(mail as never);
  if (error) throw new Error(error.message);
  return { id: data!.id };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/resend.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Commit**

```bash
git add lib/resend.ts tests/resend.test.ts package.json package-lock.json
git commit -m "feat: add Resend email builder with footer and List-Unsubscribe"
```

---

## Task 9: Gmail reply-check-wrapper (TDD met mock)

**Files:**
- Create: `lib/gmail.ts`, `tests/gmail.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Dependency installeren**

```bash
npm install googleapis
```

- [ ] **Step 2: Write the failing test**

Create `tests/gmail.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { threadHasReply } from "@/lib/gmail";

describe("threadHasReply", () => {
  it("true als er een bericht na de verzenddatum van iemand anders is", () => {
    const thread = {
      messages: [
        { internalDate: "1000", headers: { From: "lars@bidley.ai" } },
        { internalDate: "2000", headers: { From: "info@lead.nl" } },
      ],
    };
    expect(threadHasReply(thread, "lars@bidley.ai", 1500)).toBe(true);
  });
  it("false als alleen onze eigen mails in de thread staan", () => {
    const thread = {
      messages: [{ internalDate: "1000", headers: { From: "lars@bidley.ai" } }],
    };
    expect(threadHasReply(thread, "lars@bidley.ai", 500)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/gmail.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 4: Write minimal implementation**

Create `lib/gmail.ts`:
```ts
import { google } from "googleapis";

export type ThreadMsg = { internalDate: string; headers: { From: string } };
export type Thread = { messages: ThreadMsg[] };

// Pure: is er na `sinceMs` een bericht van iemand anders dan ons afzenderadres?
export function threadHasReply(thread: Thread, onsAdres: string, sinceMs: number): boolean {
  return thread.messages.some(
    (m) =>
      Number(m.internalDate) > sinceMs &&
      !m.headers.From.toLowerCase().includes(onsAdres.toLowerCase()),
  );
}

function gmailClient() {
  const oauth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET,
  );
  oauth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth: oauth });
}

// I/O: haal thread op en map naar de pure vorm.
export async function fetchThread(threadId: string): Promise<Thread> {
  const gmail = gmailClient();
  const res = await gmail.users.threads.get({ userId: "me", id: threadId });
  const messages = (res.data.messages ?? []).map((m) => ({
    internalDate: m.internalDate ?? "0",
    headers: {
      From: m.payload?.headers?.find((h) => h.name === "From")?.value ?? "",
    },
  }));
  return { messages };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/gmail.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 6: Commit**

```bash
git add lib/gmail.ts tests/gmail.test.ts package.json package-lock.json
git commit -m "feat: add Gmail thread reply detection"
```

---

## Task 10: Claude-personalisatie-wrapper + audit-helper

**Files:**
- Create: `lib/claude.ts`, `lib/audit.ts`, `lib/supabase/server.ts`
- Modify: `package.json`

- [ ] **Step 1: Dependencies installeren**

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Claude-wrapper schrijven**

> Voor model-keuze en API-gebruik: raadpleeg de `claude-api`-skill (modelnamen, params). Gebruik `claude-sonnet-4-6` voor bulk-personalisatie en `claude-opus-4-8` alleen voor research/scoring in Fase 2.

Create `lib/claude.ts`:
```ts
import Anthropic from "@anthropic-ai/sdk";
import { mergeFields, type MergeVelden } from "./personalize";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Laat Claude alleen de {observatie} schrijven uit de research-haak —
// de rest van de mail komt uit de vaste template (compliance: geen verzonnen claims).
export async function genObservatie(haak: string, bedrijf: string, sector: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Schrijf één korte, feitelijke observatie-zin (Nederlands, ondernemer-naar-ondernemer, geen verkooptaal, geen verzonnen cijfers) voor een cold e-mail aan ${bedrijf} (sector: ${sector}). Baseer je uitsluitend op deze research-haak: "${haak}". Geef alleen de zin terug.`,
    }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

export function renderTemplate(template: string, velden: Partial<MergeVelden>): string {
  return mergeFields(template, velden);
}
```

- [ ] **Step 3: Audit-helper + Supabase-server-client schrijven**

Create `lib/audit.ts`:
```ts
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function logAudit(entry: {
  actie: string; entiteit?: string; entiteitId?: string;
  doorWie?: string; grondslag?: string;
}) {
  await db.insert(auditLog).values({
    actie: entry.actie, entiteit: entry.entiteit, entiteitId: entry.entiteitId,
    doorWie: entry.doorWie ?? "systeem",
    grondslag: entry.grondslag ?? "gerechtvaardigd belang (B2B-outreach)",
  });
}
```

Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
}
```

- [ ] **Step 4: Verifieer dat het project nog typecheckt**

Run: `npx tsc --noEmit`
Expected: geen errors.

- [ ] **Step 5: Commit**

```bash
git add lib/claude.ts lib/audit.ts lib/supabase package.json package-lock.json
git commit -m "feat: add Claude personalization, audit log and Supabase server client"
```

---

## Task 11: Import-script voor de bestaande tracker

**Files:**
- Create: `scripts/import-tracker.ts`
- Modify: `package.json`

- [ ] **Step 1: Dependency installeren**

```bash
npm install -D xlsx tsx
```

- [ ] **Step 2: Import-script schrijven**

Create `scripts/import-tracker.ts`:
```ts
import * as XLSX from "xlsx";
import { db } from "@/db";
import { prospects } from "@/db/schema";

// Gebruik: npx tsx scripts/import-tracker.ts <pad-naar-xlsx>
async function main() {
  const pad = process.argv[2];
  if (!pad) throw new Error("Geef het pad naar de tracker-xlsx op.");
  const wb = XLSX.readFile(pad);
  const sheet = wb.Sheets["Prospects"] ?? wb.Sheets[wb.SheetNames[0]];
  const rijen = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  let n = 0;
  for (const r of rijen) {
    const bedrijf = r["Bedrijf"] ?? r["bedrijf"];
    if (!bedrijf) continue;
    await db.insert(prospects).values({
      bedrijf,
      website: r["Website"] ?? null,
      sector: r["Sector"] ?? null,
      contactpersoon: r["Contactpersoon"] ?? null,
      functie: r["Functie"] ?? null,
      linkedinUrl: r["LinkedIn"] ?? null,
      publiekEmail: r["E-mail (publiek)"] ?? r["E-mail"] ?? null,
      kanaal: (r["Kanaal"]?.toLowerCase() as "email" | "linkedin" | "beide") ?? "email",
      haakje: r["Haakje"] ?? null,
      bron: "import-tracker",
      status: "nieuw",
    });
    n++;
  }
  console.log(`${n} prospects geïmporteerd.`);
  process.exit(0);
}
main();
```

Add to `package.json` `"scripts"`:
```json
"import:tracker": "tsx scripts/import-tracker.ts"
```

- [ ] **Step 3: Testrun (handmatig, met de echte tracker)**

Run: `npx tsx scripts/import-tracker.ts "../[pad]/Bidley-prospect-tracker.xlsx"`
Expected: "<n> prospects geïmporteerd." en rijen zichtbaar in Supabase.

- [ ] **Step 4: Commit**

```bash
git add scripts/import-tracker.ts package.json package-lock.json
git commit -m "feat: add one-off tracker xlsx import script"
```

---

## Task 12: Afmeldlink-endpoint

**Files:**
- Create: `app/api/unsubscribe/[token]/route.ts`

- [ ] **Step 1: Route schrijven**

Create `app/api/unsubscribe/[token]/route.ts`:
```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/unsubscribe
git commit -m "feat: add unsubscribe endpoint that writes to suppression"
```

---

## Task 13: Resend-webhook-handler

**Files:**
- Create: `app/api/webhooks/resend/route.ts`

- [ ] **Step 1: Route schrijven**

> Resend tekent webhooks via Svix-headers. We verifiëren met `RESEND_WEBHOOK_SECRET`. `bounce` en `complaint` schrijven we ook naar suppression.

Create `app/api/webhooks/resend/route.ts`:
```ts
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, emailEvents, suppression } from "@/db/schema";
import { domainOf } from "@/lib/suppression";

type ResendEvent = {
  type: string; // "email.delivered" | "email.opened" | "email.bounced" | "email.complained"
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/resend
git commit -m "feat: handle Resend delivery/open/bounce/complaint webhooks"
```

---

## Task 14: Inngest-client + outreach-engine (verzendwachtrij bouwen)

**Files:**
- Create: `inngest/client.ts`, `inngest/outreach-engine.ts`, `app/api/inngest/route.ts`
- Modify: `package.json`

- [ ] **Step 1: Dependency installeren**

```bash
npm install inngest
```

- [ ] **Step 2: Inngest-client**

Create `inngest/client.ts`:
```ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "bidley-lead-machine" });
```

- [ ] **Step 3: Outreach-engine-functie**

Create `inngest/outreach-engine.ts`:
```ts
import { eq, and, inArray } from "drizzle-orm";
import { inngest } from "./client";
import { db } from "@/db";
import { prospects, messages, users } from "@/db/schema";
import { nextStep } from "@/lib/sequence";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { genObservatie, renderTemplate } from "@/lib/claude";
import { mergeFields } from "@/lib/personalize";
import { makeToken } from "@/lib/unsubscribe";

// ma-vr 08:00 Europe/Amsterdam → bouwt concepten in status in_wachtrij voor Mail1.
export const outreachEngine = inngest.createFunction(
  { id: "outreach-engine" },
  { cron: "TZ=Europe/Amsterdam 0 8 * * 1-5" },
  async ({ step }) => {
    const rijen = await step.run("laad-prospects", async () =>
      db.select().from(prospects).where(
        and(eq(prospects.kanaal, "email"), inArray(prospects.status, ["nieuw"])),
      ),
    );

    let gemaakt = 0;
    for (const p of rijen) {
      const stap = nextStep(
        { status: p.status, kanaal: "email", laatsteStap: null, laatsteActieOp: null, replyOntvangen: false },
        new Date(),
      );
      if (stap !== "Mail1" || !p.publiekEmail) continue;

      await step.run(`maak-concept-${p.id}`, async () => {
        const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === "Mail1")!;
        const afz = p.afzenderId
          ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
          : (await db.select().from(users).limit(1))[0];
        const observatie = p.haakje ? await genObservatie(p.haakje, p.bedrijf, p.sector ?? "") : "";
        const velden = {
          voornaam: p.contactpersoon?.split(" ")[0] ?? "",
          bedrijf: p.bedrijf, zoekwoord: p.haakje ?? "", sector: p.sector ?? "",
          observatie, afzender: afz?.afzenderIdentiteit ?? "Bidley",
        };
        const token = makeToken(p.publiekEmail!, process.env.UNSUBSCRIBE_SECRET!);
        await db.insert(messages).values({
          prospectId: p.id, kanaal: "email", stap: "Mail1",
          onderwerp: mergeFields(tmpl.onderwerp, velden),
          tekst: renderTemplate(tmpl.body, velden),
          status: "in_wachtrij", unsubscribeToken: token,
        });
        gemaakt++;
      });
    }
    return { gemaakt };
  },
);
```

- [ ] **Step 4: Inngest serve-route**

Create `app/api/inngest/route.ts`:
```ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { outreachEngine } from "@/inngest/outreach-engine";
import { followUp } from "@/inngest/follow-up";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [outreachEngine, followUp],
});
```

> Let op: `follow-up` wordt in Task 15 aangemaakt. Maak deze route af nadat Task 15 klaar is, of stub `followUp` tijdelijk als lege functie zodat de import niet faalt.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen errors (na Task 15, of met stub).

- [ ] **Step 6: Commit**

```bash
git add inngest/client.ts inngest/outreach-engine.ts app/api/inngest
git commit -m "feat: add Inngest outreach engine that queues Mail1 drafts"
```

---

## Task 15: Opvolg-functie (Mail 2/3, automatisch tenzij reply)

**Files:**
- Create: `inngest/follow-up.ts`

- [ ] **Step 1: Opvolg-functie schrijven**

Create `inngest/follow-up.ts`:
```ts
import { eq, and, inArray, desc } from "drizzle-orm";
import { inngest } from "./client";
import { db } from "@/db";
import { prospects, messages, users, suppression } from "@/db/schema";
import { nextStep, type SequenceStep } from "@/lib/sequence";
import { EMAIL_TEMPLATES } from "@/lib/copy-kit";
import { mergeFields } from "@/lib/personalize";
import { genObservatie, renderTemplate } from "@/lib/claude";
import { makeToken } from "@/lib/unsubscribe";
import { isSuppressed, type SuppressionEntry } from "@/lib/suppression";
import { sendEmail } from "@/lib/resend";
import { fetchThread, threadHasReply } from "@/lib/gmail";
import { logAudit } from "@/lib/audit";

// ma-vr 08:30 → verstuurt automatisch Mail2/Mail3 als er geen reply is.
export const followUp = inngest.createFunction(
  { id: "follow-up" },
  { cron: "TZ=Europe/Amsterdam 30 8 * * 1-5" },
  async ({ step }) => {
    const rijen = await step.run("laad-benaderd", async () =>
      db.select().from(prospects).where(
        and(eq(prospects.kanaal, "email"), inArray(prospects.status, ["benaderd"])),
      ),
    );
    const sup = (await step.run("laad-suppression", async () =>
      db.select().from(suppression))) as SuppressionEntry[];

    let verzonden = 0;
    for (const p of rijen) {
      if (!p.publiekEmail || isSuppressed(p.publiekEmail, sup)) continue;

      const laatste = (await db.select().from(messages)
        .where(eq(messages.prospectId, p.id))
        .orderBy(desc(messages.verzondenOp)).limit(1))[0];
      if (!laatste?.verzondenOp || !laatste.gmailThreadId) continue;

      const afz = p.afzenderId
        ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
        : (await db.select().from(users).limit(1))[0];

      // Reply-check via Gmail vóór elke opvolgmail.
      const thread = await fetchThread(laatste.gmailThreadId);
      const reply = threadHasReply(thread, afz?.replyTo ?? "", laatste.verzondenOp.getTime());

      const stap = nextStep(
        { status: p.status, kanaal: "email", laatsteStap: laatste.stap as SequenceStep,
          laatsteActieOp: laatste.verzondenOp, replyOntvangen: reply },
        new Date(),
      );
      if (!stap) {
        if (reply) await db.update(prospects).set({ status: "benaderd" }).where(eq(prospects.id, p.id));
        continue;
      }

      await step.run(`verstuur-${stap}-${p.id}`, async () => {
        const tmpl = EMAIL_TEMPLATES.find((t) => t.stap === stap)!;
        const observatie = p.haakje ? await genObservatie(p.haakje, p.bedrijf, p.sector ?? "") : "";
        const velden = {
          voornaam: p.contactpersoon?.split(" ")[0] ?? "", bedrijf: p.bedrijf,
          zoekwoord: p.haakje ?? "", sector: p.sector ?? "", observatie,
          afzender: afz?.afzenderIdentiteit ?? "Bidley",
        };
        const token = makeToken(p.publiekEmail!, process.env.UNSUBSCRIBE_SECRET!);
        const url = `${process.env.APP_URL}/api/unsubscribe/${token}`;
        const { id } = await sendEmail({
          naar: p.publiekEmail!, afzenderNaam: afz?.afzenderIdentiteit ?? "Bidley",
          replyTo: afz?.replyTo ?? "", onderwerp: mergeFields(tmpl.onderwerp, velden),
          body: renderTemplate(tmpl.body, velden), kvkFooter: afz?.kvkFooter ?? "",
          unsubscribeUrl: url,
        });
        await db.insert(messages).values({
          prospectId: p.id, kanaal: "email", stap, onderwerp: mergeFields(tmpl.onderwerp, velden),
          tekst: renderTemplate(tmpl.body, velden), status: "verzonden",
          espMessageId: id, gmailThreadId: laatste.gmailThreadId, verzondenOp: new Date(),
        });
        await db.update(prospects).set({ laatsteActieOp: new Date() }).where(eq(prospects.id, p.id));
        await logAudit({ actie: `verstuur-${stap}`, entiteit: "prospect", entiteitId: p.id });
        verzonden++;
      });
    }
    return { verzonden };
  },
);
```

- [ ] **Step 2: Typecheck (route uit Task 14 nu compleet)**

Run: `npx tsc --noEmit`
Expected: geen errors.

- [ ] **Step 3: Commit**

```bash
git add inngest/follow-up.ts
git commit -m "feat: auto-send Mail2/Mail3 follow-ups unless a reply arrived"
```

---

## Task 16: Auth (Supabase Google-login, domein-beperkt)

**Files:**
- Create: `app/login/page.tsx`, `middleware.ts`, `app/auth/callback/route.ts`

- [ ] **Step 1: Login-pagina**

Create `app/login/page.tsx`:
```tsx
"use client";
import { createBrowserClient } from "@supabase/ssr";

export default function Login() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback`, queryParams: { hd: "blueflamingos.nl" } },
    });
  return (
    <main className="flex h-screen items-center justify-center">
      <button onClick={signIn} className="rounded bg-black px-6 py-3 text-white">
        Inloggen met Google
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Auth-callback**

Create `app/auth/callback/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await getSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
```

- [ ] **Step 3: Middleware die niet-ingelogde gebruikers weert**

Create `middleware.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/auth");
  if (!user && !isAuthPage) return NextResponse.redirect(new URL("/login", req.url));
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 4: Typecheck + dev-run**

Run: `npx tsc --noEmit && npm run build`
Expected: build slaagt.

- [ ] **Step 5: Commit**

```bash
git add app/login app/auth middleware.ts
git commit -m "feat: add Supabase Google auth with domain restriction"
```

---

## Task 17: Dashboard — pipeline-bord

**Files:**
- Create: `app/dashboard/page.tsx`, `app/page.tsx` (redirect)

- [ ] **Step 1: Root redirect**

Replace `app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard"); }
```

- [ ] **Step 2: Pipeline-bord (server component)**

Create `app/dashboard/page.tsx`:
```tsx
import { db } from "@/db";
import { prospects } from "@/db/schema";

const KOLOMMEN = ["nieuw", "benaderd", "audit_gestart", "demo", "klant"] as const;

export default async function Dashboard() {
  const rijen = await db.select().from(prospects);
  const perStatus = (s: string) => rijen.filter((r) => r.status === s);
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Pipeline</h1>
      <div className="grid grid-cols-5 gap-4">
        {KOLOMMEN.map((k) => (
          <div key={k} className="rounded border p-3">
            <h2 className="mb-2 font-semibold capitalize">{k.replace("_", " ")} ({perStatus(k).length})</h2>
            <ul className="space-y-2">
              {perStatus(k).map((p) => (
                <li key={p.id} className="rounded bg-gray-50 p-2 text-sm">
                  <div className="font-medium">{p.bedrijf}</div>
                  <div className="text-gray-500">{p.sector} · {p.tier ?? "—"}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6"><a href="/queue" className="text-blue-600 underline">→ Verzendwachtrij</a></p>
    </main>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard app/page.tsx
git commit -m "feat: add pipeline dashboard board"
```

---

## Task 18: Verzendwachtrij + batch-goedkeuring (poort 2)

**Files:**
- Create: `app/queue/page.tsx`, `app/queue/actions.ts`

- [ ] **Step 1: Server-action voor batch-verzenden**

Create `app/queue/actions.ts`:
```ts
"use server";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messages, prospects, users, suppression } from "@/db/schema";
import { isSuppressed, type SuppressionEntry } from "@/lib/suppression";
import { sendEmail } from "@/lib/resend";
import { logAudit } from "@/lib/audit";

export async function verstuurBatch(messageIds: string[]) {
  if (messageIds.length === 0) return;
  const sup = (await db.select().from(suppression)) as SuppressionEntry[];
  const queue = await db.select().from(messages).where(inArray(messages.id, messageIds));

  for (const m of queue) {
    if (m.status !== "in_wachtrij") continue;
    const p = (await db.select().from(prospects).where(eq(prospects.id, m.prospectId)).limit(1))[0];
    if (!p?.publiekEmail || isSuppressed(p.publiekEmail, sup)) {
      await db.update(messages).set({ status: "gefaald" }).where(eq(messages.id, m.id));
      continue;
    }
    const afz = p.afzenderId
      ? (await db.select().from(users).where(eq(users.id, p.afzenderId)).limit(1))[0]
      : (await db.select().from(users).limit(1))[0];
    const url = `${process.env.APP_URL}/api/unsubscribe/${m.unsubscribeToken}`;
    const { id } = await sendEmail({
      naar: p.publiekEmail, afzenderNaam: afz?.afzenderIdentiteit ?? "Bidley",
      replyTo: afz?.replyTo ?? "", onderwerp: m.onderwerp ?? "", body: m.tekst,
      kvkFooter: afz?.kvkFooter ?? "", unsubscribeUrl: url,
    });
    await db.update(messages).set({ status: "verzonden", espMessageId: id, verzondenOp: new Date() })
      .where(eq(messages.id, m.id));
    await db.update(prospects).set({ status: "benaderd", laatsteActieOp: new Date() })
      .where(eq(prospects.id, p.id));
    await logAudit({ actie: "verstuur-Mail1", entiteit: "prospect", entiteitId: p.id });
  }
  revalidatePath("/queue");
}
```

- [ ] **Step 2: Wachtrij-pagina met selectie + knop**

Create `app/queue/page.tsx`:
```tsx
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, prospects } from "@/db/schema";
import { verstuurBatch } from "./actions";

export default async function Queue() {
  const rijen = await db.select({
    id: messages.id, onderwerp: messages.onderwerp, tekst: messages.tekst,
    bedrijf: prospects.bedrijf, email: prospects.publiekEmail,
  }).from(messages).innerJoin(prospects, eq(messages.prospectId, prospects.id))
    .where(eq(messages.status, "in_wachtrij"));

  async function action(formData: FormData) {
    "use server";
    const ids = formData.getAll("id").map(String);
    await verstuurBatch(ids);
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Verzendwachtrij ({rijen.length})</h1>
      <form action={action} className="space-y-3">
        {rijen.map((m) => (
          <label key={m.id} className="flex gap-3 rounded border p-3">
            <input type="checkbox" name="id" value={m.id} defaultChecked />
            <div>
              <div className="font-medium">{m.bedrijf} — {m.email}</div>
              <div className="text-sm text-gray-600">{m.onderwerp}</div>
              <pre className="mt-1 whitespace-pre-wrap text-xs text-gray-500">{m.tekst}</pre>
            </div>
          </label>
        ))}
        <button className="rounded bg-green-600 px-6 py-3 text-white" type="submit">
          Verstuur geselecteerde batch
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 4: Commit**

```bash
git add app/queue
git commit -m "feat: add send queue with batch approve-and-send"
```

---

## Task 19: Volledige testsuite + deploy

**Files:**
- Modify: `README.md` (deploy-instructies)

- [ ] **Step 1: Volledige testsuite draaien**

Run: `npm test`
Expected: alle tests PASS (suppression, unsubscribe, personalize, sequence, resend, gmail, smoke).

- [ ] **Step 2: Productie-build**

Run: `npm run build`
Expected: build slaagt zonder type-errors.

- [ ] **Step 3: Deploy-stappen documenteren in README**

Voeg aan `README.md` een sectie "Deploy" toe met:
1. Supabase-project + env-vars in Vercel zetten (alle keys uit `.env.local`).
2. Resend-domein `send.bidley.ai` verifiëren (DKIM/SPF/DMARC) + webhook → `/api/webhooks/resend`.
3. Gmail OAuth (refresh token) voor de afzender-accounts.
4. Inngest-app koppelen aan `/api/inngest`; crons verschijnen automatisch.
5. `npm run db:migrate` tegen productie-DB.
6. `npm run import:tracker <pad>` voor de eenmalige import.
7. Eén `users`-rij per afzender (Lars/Jelmer) met `afzenderIdentiteit`, `kvkFooter`, `replyTo`.

- [ ] **Step 4: Deploy naar Vercel**

```bash
npx vercel --prod
```
Expected: live URL; `/login` werkt; na inloggen `/dashboard` toont de geïmporteerde prospects.

- [ ] **Step 5: Veilige testrun (zoals INSTALL.md §4)**

Zet één testprospect met je eigen e-mailadres op status `nieuw`, draai de outreach-engine handmatig via het Inngest-dashboard, en verstuur via `/queue`. Controleer: mail binnen met footer + werkende afmeldlink; afmelden schrijft naar `suppression`; geen mail naar BF-klanten.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: add deploy and first-run instructions"
```

---

## Self-review notities

- **Spec-dekking:** §3 stack → Tasks 1-2,16; §4 datamodel → Task 3; §5 flow stap 3-4 (engine + poort 2) → Tasks 14,18; stap 5 (auto-opvolging tenzij reply) → Tasks 7,9,15; stap 6 (webhooks) → Tasks 12,13; §6 compliance (suppressie/afmeld/footer/audit/ZZP) → Tasks 4,5,8,12,18; §7 Fase 1-scope volledig; §8 assets (copy-kit, tracker-import) → Tasks 6,11. Sourcing/ICP (§5 stap 1-2) en LinkedIn/funnel-analytics (Fase 2/3) bewust buiten dit plan.
- **Open punt voor uitvoering:** `gmailThreadId` op de eerste verzonden mail vullen vereist dat de eerste mail óók via Gmail verstuurd wordt of dat we de Resend→thread-koppeling leggen; in Task 18 wordt Mail1 via Resend verstuurd zonder Gmail-thread. Reply-detectie in Task 15 werkt daardoor pas zodra threads gekoppeld zijn — bij de eerste echte run via het Inngest-dashboard verifiëren en zo nodig de reply-check op `reply-to`-inbox (zoeken op onderwerp) baseren i.p.v. op `gmailThreadId`. Dit is het eerste te valideren punt bij uitvoering.
