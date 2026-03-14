CREATE TYPE "public"."agent_run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('LLC', 'S-Corp', 'C-Corp', 'Sole Proprietorship', 'Partnership', 'Other');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('accounting', 'tax');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('not_started', 'in_progress', 'needs_info', 'review', 'complete');--> statement-breakpoint
CREATE TABLE "agent_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"agent_name" text NOT NULL,
	"output" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" text NOT NULL,
	"client_name" text NOT NULL,
	"status" "agent_run_status" DEFAULT 'pending' NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb,
	"final_report" text,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "billing" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"monthly_accounting_fee" numeric(10, 2) DEFAULT '0',
	"months_billed" integer DEFAULT 1,
	"tax_prep_fee" numeric(10, 2) DEFAULT '0',
	"num_1099_nec_forms" integer DEFAULT 0,
	"amount_received" numeric(10, 2) DEFAULT '0',
	"billing_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"entity_type" "entity_type",
	"ein_last4" text,
	"deadline" date,
	"notes" text,
	"missing_items" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qb_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" text NOT NULL,
	"data_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qb_cache_realm_id_data_key_unique" UNIQUE("realm_id","data_key")
);
--> statement-breakpoint
CREATE TABLE "qb_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qb_tokens_realm_id_unique" UNIQUE("realm_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"category" "task_category" NOT NULL,
	"task_name" text NOT NULL,
	"status" "task_status" DEFAULT 'not_started' NOT NULL,
	"task_order" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_reports" ADD CONSTRAINT "agent_reports_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;