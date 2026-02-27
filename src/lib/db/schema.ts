import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

// Enums
export const resultEnum = pgEnum("result", ["positive", "negative"]);
export const soundTypeEnum = pgEnum("sound_type", ["beep", "whistle", "growl", "tss"]);

// Commands table - stores vocabulary with sequences
export const commands = pgTable("commands", {
  id: uuid("id").primaryKey().defaultRandom(),
  word: text("word").notNull(),
  sequence: text("sequence").notNull(),
  parentFamily: text("parent_family").notNull(),
  family: text("family"),
  description: text("description"),
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

// Types
export type Command = typeof commands.$inferSelect;
export type NewCommand = typeof commands.$inferInsert;
export type TrainingSession = typeof trainingSessions.$inferSelect;
export type NewTrainingSession = typeof trainingSessions.$inferInsert;
export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type NewTrainingRecord = typeof trainingRecords.$inferInsert;
export type SoundSettings = typeof soundSettings.$inferSelect;
export type NewSoundSettings = typeof soundSettings.$inferInsert;
