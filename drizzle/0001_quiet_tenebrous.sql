DROP TABLE "completed_goals" CASCADE;--> statement-breakpoint
DROP TABLE "milestones" CASCADE;--> statement-breakpoint
DROP TABLE "socialization_items" CASCADE;--> statement-breakpoint
DROP TABLE "socialization_scores" CASCADE;--> statement-breakpoint
DROP TABLE "training_settings" CASCADE;--> statement-breakpoint
DROP TABLE "training_tracks" CASCADE;--> statement-breakpoint
ALTER TABLE "commands" DROP COLUMN "tier";--> statement-breakpoint
ALTER TABLE "commands" DROP COLUMN "progression_stage";--> statement-breakpoint
ALTER TABLE "commands" DROP COLUMN "exposure_count";--> statement-breakpoint
ALTER TABLE "commands" DROP COLUMN "is_active";--> statement-breakpoint
DROP TYPE "public"."goal_status";--> statement-breakpoint
DROP TYPE "public"."goal_type";--> statement-breakpoint
DROP TYPE "public"."milestone_category";--> statement-breakpoint
DROP TYPE "public"."milestone_status";--> statement-breakpoint
DROP TYPE "public"."progression_stage";--> statement-breakpoint
DROP TYPE "public"."socialization_category";--> statement-breakpoint
DROP TYPE "public"."tier";--> statement-breakpoint
DROP TYPE "public"."track";