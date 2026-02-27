import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { commands, soundSettings } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const initialCommands = [
  // Marks
  { word: "Yes/Good/Mark", sequence: "..", parentFamily: "Marks", family: "Positive", description: "Positive reinforcement mark" },
  { word: "No/Bad/Mark", sequence: "...", parentFamily: "Marks", family: "Negative", description: "Negative mark" },
  
  // Question
  { word: "What?", sequence: ".0.", parentFamily: "Question", family: null, description: "I don't understand" },
  
  // Names
  { word: "Max", sequence: "__.", parentFamily: "Names", family: null, description: "Owner's name" },
  { word: "Pythagoras", sequence: "._..", parentFamily: "Names", family: null, description: "Dog's name" },
  
  // Temporal
  { word: "Now", sequence: "..0..", parentFamily: "Temporal", family: null, description: "Immediate timing" },
  { word: "Later", sequence: "..0...", parentFamily: "Temporal", family: null, description: "Future timing" },
  
  // Commands - Core
  { word: "Driving", sequence: "_", parentFamily: "Command", family: null, description: "Listen to me / attention" },
  { word: "Release", sequence: "__..", parentFamily: "Command", family: null, description: "Free / play time" },
  
  // Commands - Stationary
  { word: "Place/Stay", sequence: "_.", parentFamily: "Command", family: "Stationary", description: "Stay in place" },
  { word: "Sit", sequence: "_.0.", parentFamily: "Command", family: "Stationary", description: "Sit down" },
  { word: "Down", sequence: "_.0_", parentFamily: "Command", family: "Stationary", description: "Lie down" },
  
  // Commands - Movement
  { word: "Move/Go", sequence: "__", parentFamily: "Command", family: "Movement", description: "Start moving" },
  { word: "Come", sequence: "__.", parentFamily: "Command", family: "Movement", description: "Come to me" },
  { word: "Heel", sequence: "__._", parentFamily: "Command", family: "Movement", description: "Walk beside me" },
  { word: "Leave it", sequence: "__...", parentFamily: "Command", family: "Movement", description: "Leave it alone" },
  
  // Commands - Communication
  { word: "Touch", sequence: "_0.", parentFamily: "Command", family: "Communication", description: "Touch with nose" },
  { word: "Bark", sequence: "_0_", parentFamily: "Command", family: "Communication", description: "Bark on command" },
  { word: "Growl", sequence: "_0_0_", parentFamily: "Command", family: "Communication", description: "Growl on command" },
  
  // Nouns - Outside
  { word: "Outside", sequence: "._", parentFamily: "Nouns", family: "Outside", description: "Going outside" },
  { word: "Park", sequence: "._.", parentFamily: "Nouns", family: "Outside", description: "Going to park" },
  { word: "Pee", sequence: ".__", parentFamily: "Nouns", family: "Outside", description: "Bathroom - pee" },
  { word: "Poop", sequence: ".__.", parentFamily: "Nouns", family: "Outside", description: "Bathroom - poop" },
  
  // Nouns - Inside
  { word: "Inside/Home", sequence: ".0_", parentFamily: "Nouns", family: "Inside", description: "Going inside" },
  { word: "Crate", sequence: ".0__", parentFamily: "Nouns", family: "Inside", description: "Go to crate" },
  
  // Nouns - Sustenance
  { word: "Food", sequence: ".._", parentFamily: "Nouns", family: "Sustenance", description: "Food time" },
  { word: "Water", sequence: ".._.", parentFamily: "Nouns", family: "Sustenance", description: "Water time" },
  { word: "Treat", sequence: "..__", parentFamily: "Nouns", family: "Sustenance", description: "Treat/reward" },
  
  // Nouns - Play Objects
  { word: "Toy", sequence: "._._", parentFamily: "Nouns", family: "Play Objects", description: "Toy" },
  { word: "Ball", sequence: "._._.", parentFamily: "Nouns", family: "Play Objects", description: "Ball" },
  
  // Modifiers
  { word: "Want", sequence: "_..", parentFamily: "Modifiers", family: null, description: "Request modifier - I want" },
  { word: "Done", sequence: "..0_", parentFamily: "Modifiers", family: null, description: "Completion modifier - finished" },
  { word: "More", sequence: "_._", parentFamily: "Modifiers", family: null, description: "Quantity modifier - more please" },
  
  // Activities (Outdoor)
  { word: "Play", sequence: "._0.", parentFamily: "Nouns", family: "Outside", description: "Play time" },
  { word: "Walk", sequence: "._0_", parentFamily: "Nouns", family: "Outside", description: "Go for a walk" },
  { word: "Car", sequence: "._0__", parentFamily: "Nouns", family: "Outside", description: "Car ride" },
  
  // Nouns - Inside (additions)
  { word: "Bed", sequence: ".0_.", parentFamily: "Nouns", family: "Inside", description: "Bed / sleep" },
  
  // Feelings/Urgent
  { word: "Help", sequence: "_0__", parentFamily: "Feelings", family: null, description: "Need help / something wrong" },
  { word: "Hurt", sequence: "_0__.", parentFamily: "Feelings", family: null, description: "In pain / uncomfortable" },
  { word: "Scared", sequence: "_0..", parentFamily: "Feelings", family: null, description: "Anxious / frightened" },
];

const defaultSoundSettings = {
  name: "Default",
  soundType: "beep" as const,
  frequency: 800,
  shortDurationMs: 100,
  longDurationMs: 300,
  silenceDurationMs: 150,
  isActive: true,
};

async function seed() {
  console.log("Seeding database...");
  
  // Insert commands
  console.log("Inserting commands...");
  for (const command of initialCommands) {
    await db.insert(commands).values(command).onConflictDoNothing();
  }
  console.log(`Inserted ${initialCommands.length} commands`);
  
  // Insert default sound settings
  console.log("Inserting default sound settings...");
  await db.insert(soundSettings).values(defaultSoundSettings).onConflictDoNothing();
  console.log("Inserted default sound settings");
  
  console.log("Seeding complete!");
}

seed().catch(console.error);
