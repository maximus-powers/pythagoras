CREATE TYPE "public"."goal_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('mastery_gate', 'exposure_count', 'socialization_item', 'enrichment_activity', 'milestone', 'time_based_hold', 'class_attendance');--> statement-breakpoint
CREATE TYPE "public"."milestone_category" AS ENUM('class', 'title', 'test');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('not_started', 'enrolled', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."progression_stage" AS ENUM('not_started', 'exposure', 'comprehension', 'discrimination', 'production');--> statement-breakpoint
CREATE TYPE "public"."result" AS ENUM('positive', 'negative');--> statement-breakpoint
CREATE TYPE "public"."socialization_category" AS ENUM('handling', 'people', 'surfaces', 'sounds', 'environments', 'animals', 'objects');--> statement-breakpoint
CREATE TYPE "public"."sound_type" AS ENUM('beep', 'whistle', 'growl', 'tss');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('tier_0', 'tier_a', 'tier_b', 'tier_c', 'tier_d');--> statement-breakpoint
CREATE TYPE "public"."track" AS ENUM('t1_obedience', 't2_socialization', 't3_communication', 't4_impulse', 't5_enrichment');--> statement-breakpoint
CREATE TABLE "commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word" text NOT NULL,
	"sequence" text NOT NULL,
	"parent_family" text NOT NULL,
	"family" text,
	"description" text,
	"tier" "tier" DEFAULT 'tier_a',
	"progression_stage" "progression_stage" DEFAULT 'not_started',
	"exposure_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completed_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_key" text NOT NULL,
	"track" "track" NOT NULL,
	"goal_type" "goal_type" NOT NULL,
	"title" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "dog_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"nickname" text,
	"breed" text,
	"birth_date" date NOT NULL,
	"arrival_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "milestone_category" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_age_weeks" integer,
	"estimated_cost" numeric(8, 2),
	"prerequisites" text,
	"status" "milestone_status" DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socialization_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "socialization_category" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socialization_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"notes" text,
	"scored_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sound_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sound_type" "sound_type" DEFAULT 'beep' NOT NULL,
	"frequency" integer DEFAULT 800 NOT NULL,
	"short_duration_ms" integer DEFAULT 100 NOT NULL,
	"long_duration_ms" integer DEFAULT 300 NOT NULL,
	"silence_duration_ms" integer DEFAULT 150 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"call_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"result" "result" NOT NULL,
	"response_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "training_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggressiveness" integer DEFAULT 3 NOT NULL,
	"weekly_training_hours" numeric(4, 1) DEFAULT '5.0' NOT NULL,
	"sessions_per_day" integer DEFAULT 3 NOT NULL,
	"minutes_per_session" integer DEFAULT 8 NOT NULL,
	"training_days_per_week" integer DEFAULT 6 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track" "track" NOT NULL,
	"current_tier" text DEFAULT 'tier_0',
	"current_phase" text DEFAULT 'phase_a',
	"off_leash_rung" integer DEFAULT 1,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "socialization_scores" ADD CONSTRAINT "socialization_scores_item_id_socialization_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."socialization_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_command_id_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."commands"("id") ON DELETE no action ON UPDATE no action;