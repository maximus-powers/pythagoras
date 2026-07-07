import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { commands, soundSettings } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const initialCommands = [
  { word: "Yes/Good/Mark", sequence: "..", description: "Positive reinforcement mark" },
  { word: "No/Bad/Mark", sequence: "...", description: "Negative mark" },
  { word: "What?", sequence: ".0.", description: "I don't understand" },
  { word: "Max", sequence: "__.", description: "Owner's name" },
  { word: "Pythagoras", sequence: "._..", description: "Dog's name" },
  { word: "Now", sequence: "..0..", description: "Immediate timing" },
  { word: "Later", sequence: "..0...", description: "Future timing" },
  { word: "Driving", sequence: "_", description: "Listen to me / attention" },
  { word: "Release", sequence: "__..", description: "Free / play time" },
  { word: "Place/Stay", sequence: "_.", description: "Stay in place" },
  { word: "Sit", sequence: "_.0.", description: "Sit down" },
  { word: "Down", sequence: "_.0_", description: "Lie down" },
  { word: "Move/Go", sequence: "__", description: "Start moving" },
  { word: "Come", sequence: "__.", description: "Come to me" },
  { word: "Heel", sequence: "__._", description: "Walk beside me" },
  { word: "Leave it", sequence: "__...", description: "Leave it alone" },
  { word: "Touch", sequence: "_0.", description: "Touch with nose" },
  { word: "Bark", sequence: "_0_", description: "Bark on command" },
  { word: "Growl", sequence: "_0_0_", description: "Growl on command" },
  { word: "Outside", sequence: "._", description: "Going outside" },
  { word: "Park", sequence: "._.", description: "Going to park" },
  { word: "Pee", sequence: ".__", description: "Bathroom - pee" },
  { word: "Poop", sequence: ".__.", description: "Bathroom - poop" },
  { word: "Inside/Home", sequence: ".0_", description: "Going inside" },
  { word: "Crate", sequence: ".0__", description: "Go to crate" },
  { word: "Food", sequence: ".._", description: "Food time" },
  { word: "Water", sequence: ".._.", description: "Water time" },
  { word: "Treat", sequence: "..__", description: "Treat/reward" },
  { word: "Toy", sequence: "._._", description: "Toy" },
  { word: "Ball", sequence: "._._.", description: "Ball" },
  { word: "Want", sequence: "_..", description: "Request modifier - I want" },
  { word: "Done", sequence: "..0_", description: "Completion modifier - finished" },
  { word: "More", sequence: "_._", description: "Quantity modifier - more please" },
  { word: "Play", sequence: "._0.", description: "Play time" },
  { word: "Walk", sequence: "._0_", description: "Go for a walk" },
  { word: "Car", sequence: "._0__", description: "Car ride" },
  { word: "Bed", sequence: ".0_.", description: "Bed / sleep" },
  { word: "Help", sequence: "_0__", description: "Need help / something wrong" },
  { word: "Hurt", sequence: "_0__.", description: "In pain / uncomfortable" },
  { word: "Scared", sequence: "_0..", description: "Anxious / frightened" },
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
