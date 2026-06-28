CREATE TYPE "public"."event_type" AS ENUM('delivered', 'open', 'bounce', 'complaint', 'reply', 'unsubscribe');--> statement-breakpoint
CREATE TYPE "public"."kanaal" AS ENUM('email', 'linkedin', 'beide');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('concept', 'in_wachtrij', 'verzonden', 'beantwoord', 'gefaald');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('kandidaat', 'nieuw', 'benaderd', 'audit_gestart', 'demo', 'klant', 'afgewezen_koud', 'opt_out');--> statement-breakpoint
CREATE TYPE "public"."sequence_step" AS ENUM('A1', 'A2', 'A3', 'A4', 'Mail1', 'Mail2', 'Mail3');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actie" text NOT NULL,
	"entiteit" text,
	"entiteit_id" uuid,
	"door_wie" text,
	"grondslag" text,
	"tijd" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"type" text NOT NULL,
	"tijd" timestamp with time zone DEFAULT now(),
	"bron" text
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"type" "event_type" NOT NULL,
	"tijd" timestamp with time zone DEFAULT now(),
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"kanaal" "kanaal" NOT NULL,
	"stap" "sequence_step" NOT NULL,
	"onderwerp" text,
	"tekst" text NOT NULL,
	"status" "message_status" DEFAULT 'concept' NOT NULL,
	"esp_message_id" text,
	"gmail_thread_id" text,
	"unsubscribe_token" text,
	"aangemaakt_op" timestamp with time zone DEFAULT now(),
	"verzonden_op" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bedrijf" text NOT NULL,
	"website" text,
	"sector" text,
	"contactpersoon" text,
	"functie" text,
	"linkedin_url" text,
	"publiek_email" text,
	"score_ads" integer,
	"score_budget" integer,
	"score_leadwaarde" integer,
	"score_bereikbaarheid" integer,
	"score_geen_bf_overlap" integer,
	"icp_totaal" integer,
	"tier" "tier",
	"kanaal" "kanaal" DEFAULT 'email' NOT NULL,
	"lookalike_cluster" text,
	"haakje" text,
	"bron" text,
	"status" "prospect_status" DEFAULT 'nieuw' NOT NULL,
	"is_reseller" boolean DEFAULT false NOT NULL,
	"rechtsvorm_zzp" boolean DEFAULT false NOT NULL,
	"afzender_id" uuid,
	"aangemaakt_op" timestamp with time zone DEFAULT now(),
	"laatste_actie_op" timestamp with time zone,
	"volgende_actie_op" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "suppression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"domein" text,
	"reden" text NOT NULL,
	"toegevoegd_op" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"naam" text NOT NULL,
	"email" text NOT NULL,
	"rol" text DEFAULT 'gebruiker' NOT NULL,
	"afzender_identiteit" text,
	"kvk_footer" text,
	"reply_to" text,
	"aangemaakt_op" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_afzender_id_users_id_fk" FOREIGN KEY ("afzender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;