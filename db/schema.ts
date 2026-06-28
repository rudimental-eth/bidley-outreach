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
  afzenderIdentiteit: text("afzender_identiteit"),
  kvkFooter: text("kvk_footer"),
  replyTo: text("reply_to"),
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
  type: text("type").notNull(),
  tijd: timestamp("tijd", { withTimezone: true }).defaultNow(),
  bron: text("bron"),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actie: text("actie").notNull(),
  entiteit: text("entiteit"),
  entiteitId: uuid("entiteit_id"),
  doorWie: text("door_wie"),
  grondslag: text("grondslag"),
  tijd: timestamp("tijd", { withTimezone: true }).defaultNow(),
});
