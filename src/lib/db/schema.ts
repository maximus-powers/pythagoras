import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum, date, decimal } from "drizzle-orm/pg-core";

// Enums
export const resultEnum = pgEnum("result", ["positive", "negative"]);
export const soundTypeEnum = pgEnum("sound_type", ["beep", "whistle", "growl", "tss"]);
export const tierEnum = pgEnum("tier", ["tier_0", "tier_a", "tier_b", "tier_c", "tier_d"]);
export const progressionStageEnum = pgEnum("progression_stage", ["not_started", "exposure", "comprehension", "discrimination", "production"]);
export const trackEnum = pgEnum("track", ["t1_obedience", "t2_socialization", "t3_communication", "t4_impulse", "t5_enrichment"]);
export const socializationCategoryEnum = pgEnum("socialization_category", ["handling", "people", "surfaces", "sounds", "environments", "animals", "objects"]);
export const goalTypeEnum = pgEnum("goal_type", ["mastery_gate", "exposure_count", "socialization_item", "enrichment_activity", "milestone", "time_based_hold", "class_attendance"]);
export const goalStatusEnum = pgEnum("goal_status", ["pending", "in_progress", "completed", "skipped"]);
export const milestoneStatusEnum = pgEnum("milestone_status", ["not_started", "enrolled", "in_progress", "completed", "skipped"]);
export const milestoneCategoryEnum = pgEnum("milestone_category", ["class", "title", "test"]);

// Commands table - stores vocabulary with sequences
export const commands = pgTable("commands", {
  id: uuid("id").primaryKey().defaultRandom(),
  word: text("word").notNull(),
  sequence: text("sequence").notNull(),
  parentFamily: text("parent_family").notNull(),
  family: text("family"),
  description: text("description"),
  // Training plan fields
  tier: tierEnum("tier").default("tier_a"),
  progressionStage: progressionStageEnum("progression_stage").default("not_started"),
  exposureCount: integer("exposure_count").default(0),
  isActive: boolean("is_active").default(false),
  // Communication track fields
  discriminationSet: text("discrimination_set"), // Groups related sequences for training
  trainingOrder: integer("training_order"), // Order within the full training plan (1-47)
  trainingContext: text("training_context"), // Context for same-sequence words (e.g., "recall" vs "name_focus")
  isFoundationMarker: boolean("is_foundation_marker").default(false), // Yes/No markers
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training sessions table - groups training activity
export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
});

// Training records table - individual command attempts
export const trainingRecords = pgTable("training_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => trainingSessions.id),
  callId: uuid("call_id").notNull(), // Groups marks for same command call
  commandId: uuid("command_id").references(() => commands.id).notNull(),
  result: resultEnum("result").notNull(),
  responseTimeMs: integer("response_time_ms"), // Time to positive response
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sound settings table - audio configuration presets
export const soundSettings = pgTable("sound_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  soundType: soundTypeEnum("sound_type").notNull().default("beep"),
  frequency: integer("frequency").notNull().default(800),
  shortDurationMs: integer("short_duration_ms").notNull().default(100),
  longDurationMs: integer("long_duration_ms").notNull().default(300),
  silenceDurationMs: integer("silence_duration_ms").notNull().default(150),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dog profile table
export const dogProfile = pgTable("dog_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  breed: text("breed"),
  birthDate: date("birth_date").notNull(),
  arrivalDate: date("arrival_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training settings table
export const trainingSettings = pgTable("training_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  aggressiveness: integer("aggressiveness").notNull().default(3), // 1-5
  weeklyTrainingHours: decimal("weekly_training_hours", { precision: 4, scale: 1 }).notNull().default("5.0"),
  sessionsPerDay: integer("sessions_per_day").notNull().default(3),
  minutesPerSession: integer("minutes_per_session").notNull().default(8),
  trainingDaysPerWeek: integer("training_days_per_week").notNull().default(6),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training tracks progress table
export const trainingTracks = pgTable("training_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  track: trackEnum("track").notNull(),
  currentTier: text("current_tier").default("tier_0"), // tier_0, tier_a, tier_b, tier_c, tier_d
  currentPhase: text("current_phase").default("phase_a"), // phase_a, phase_b, phase_c, phase_d (for T4)
  offLeashRung: integer("off_leash_rung").default(1), // 1-6 (for T1)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Socialization items table (seed data - 100 items)
export const socializationItems = pgTable("socialization_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: socializationCategoryEnum("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Socialization scores table (historical record of exposures)
export const socializationScores = pgTable("socialization_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").references(() => socializationItems.id).notNull(),
  score: integer("score").notNull(), // 1-5
  notes: text("notes"),
  scoredAt: timestamp("scored_at").defaultNow().notNull(),
});

// Completed goals table (historical record)
export const completedGoals = pgTable("completed_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalKey: text("goal_key").notNull(), // Unique identifier like "t1_sit_accuracy_90"
  track: trackEnum("track").notNull(),
  goalType: goalTypeEnum("goal_type").notNull(),
  title: text("title").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  notes: text("notes"),
});

// Milestones table (classes, titles, tests)
export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: milestoneCategoryEnum("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetAgeWeeks: integer("target_age_weeks"),
  estimatedCost: decimal("estimated_cost", { precision: 8, scale: 2 }),
  prerequisites: text("prerequisites"), // JSON string of prerequisites
  status: milestoneStatusEnum("status").notNull().default("not_started"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Types
export type Command = typeof commands.$inferSelect;
export type NewCommand = typeof commands.$inferInsert;
export type TrainingSession = typeof trainingSessions.$inferSelect;
export type NewTrainingSession = typeof trainingSessions.$inferInsert;
export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type NewTrainingRecord = typeof trainingRecords.$inferInsert;
export type SoundSettings = typeof soundSettings.$inferSelect;
export type NewSoundSettings = typeof soundSettings.$inferInsert;
export type DogProfile = typeof dogProfile.$inferSelect;
export type NewDogProfile = typeof dogProfile.$inferInsert;
export type TrainingSettings = typeof trainingSettings.$inferSelect;
export type NewTrainingSettings = typeof trainingSettings.$inferInsert;
export type TrainingTrack = typeof trainingTracks.$inferSelect;
export type NewTrainingTrack = typeof trainingTracks.$inferInsert;
export type SocializationItem = typeof socializationItems.$inferSelect;
export type NewSocializationItem = typeof socializationItems.$inferInsert;
export type SocializationScore = typeof socializationScores.$inferSelect;
export type NewSocializationScore = typeof socializationScores.$inferInsert;
export type CompletedGoal = typeof completedGoals.$inferSelect;
export type NewCompletedGoal = typeof completedGoals.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
