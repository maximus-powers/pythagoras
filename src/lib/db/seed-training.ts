import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import {
  commands,
  dogProfile,
  trainingSettings,
  trainingTracks,
  socializationItems,
  milestones,
  soundSettings,
} from "./schema";

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient);

// Commands with tier assignments, discrimination sets, and training order
// Based on optimal prefix-language learning sequence
//
// Tier 0: Foundation markers (always active)
// Tier A: Core commands (weeks 1-8)
// Tier B: Daily life vocabulary (weeks 9-16)
// Tier C: Abstract concepts (weeks 17-28)
// Tier D: Advanced (weeks 29+)

type Tier = "tier_0" | "tier_a" | "tier_b" | "tier_c" | "tier_d";

interface CommandWithTier {
  word: string;
  sequence: string;
  parentFamily: string;
  family: string | null;
  description: string;
  tier: Tier;
  discriminationSet: string;
  trainingOrder: number;
  trainingContext?: string;
  isFoundationMarker?: boolean;
}

const commandsWithTiers: CommandWithTier[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 0: Foundation (4 words) - Always active, constant reinforcement
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Foundation Markers - Yes/No
  { 
    word: "Yes", 
    sequence: "..", 
    parentFamily: "Marks", 
    family: "Positive", 
    description: "Positive reinforcement marker - reward follows", 
    tier: "tier_0",
    discriminationSet: "foundation_markers",
    trainingOrder: 1,
    isFoundationMarker: true,
  },
  { 
    word: "No", 
    sequence: "...", 
    parentFamily: "Marks", 
    family: "Negative", 
    description: "Reset marker - try again", 
    tier: "tier_0",
    discriminationSet: "foundation_markers",
    trainingOrder: 2,
    isFoundationMarker: true,
  },
  
  // Foundation Commands - Driving/Release
  { 
    word: "Driving", 
    sequence: "_", 
    parentFamily: "Command", 
    family: null, 
    description: "Attention getter - listen to me", 
    tier: "tier_0",
    discriminationSet: "foundation_commands",
    trainingOrder: 3,
  },
  { 
    word: "Release", 
    sequence: "__..", 
    parentFamily: "Command", 
    family: null, 
    description: "Freedom marker - end of command, go play", 
    tier: "tier_0",
    discriminationSet: "foundation_commands",
    trainingOrder: 4,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER A: Core Commands (16 words) - Weeks 1-8
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Identity - Dog's name
  { 
    word: "Pythagoras", 
    sequence: "._..", 
    parentFamily: "Names", 
    family: null, 
    description: "Dog's name - triggers attention/orientation", 
    tier: "tier_a",
    discriminationSet: "identity",
    trainingOrder: 5,
  },
  
  // Stationary Positions - all extend _. prefix
  { 
    word: "Place", 
    sequence: "_.", 
    parentFamily: "Command", 
    family: "Stationary", 
    description: "Hold position - stay in place", 
    tier: "tier_a",
    discriminationSet: "stationary",
    trainingOrder: 6,
  },
  { 
    word: "Sit", 
    sequence: "_.0.", 
    parentFamily: "Command", 
    family: "Stationary", 
    description: "Sit position", 
    tier: "tier_a",
    discriminationSet: "stationary",
    trainingOrder: 7,
  },
  { 
    word: "Down", 
    sequence: "_.0_", 
    parentFamily: "Command", 
    family: "Stationary", 
    description: "Down/lie position", 
    tier: "tier_a",
    discriminationSet: "stationary",
    trainingOrder: 8,
  },
  { 
    word: "Stand", 
    sequence: "_.0..", 
    parentFamily: "Command", 
    family: "Stationary", 
    description: "Stand position from sit/down", 
    tier: "tier_a",
    discriminationSet: "stationary",
    trainingOrder: 9,
  },
  
  // Movement Core
  { 
    word: "Come", 
    sequence: "__.", 
    parentFamily: "Command", 
    family: "Movement", 
    description: "Recall - come to handler", 
    tier: "tier_a",
    discriminationSet: "movement_core",
    trainingOrder: 10,
    trainingContext: "recall",
  },
  { 
    word: "Move", 
    sequence: "__", 
    parentFamily: "Command", 
    family: "Movement", 
    description: "General movement cue - start moving", 
    tier: "tier_a",
    discriminationSet: "movement_core",
    trainingOrder: 11,
  },
  
  // Movement Extended
  { 
    word: "Heel", 
    sequence: "__._", 
    parentFamily: "Command", 
    family: "Movement", 
    description: "Heel position - walk at handler's side", 
    tier: "tier_a",
    discriminationSet: "movement_extended",
    trainingOrder: 12,
  },
  { 
    word: "Leave it", 
    sequence: "__...", 
    parentFamily: "Command", 
    family: "Movement", 
    description: "Leave it alone - impulse control", 
    tier: "tier_a",
    discriminationSet: "movement_extended",
    trainingOrder: 13,
  },
  
  // Location Discrimination
  { 
    word: "Outside", 
    sequence: "._", 
    parentFamily: "Nouns", 
    family: "Outside", 
    description: "Going outside", 
    tier: "tier_a",
    discriminationSet: "location",
    trainingOrder: 14,
  },
  { 
    word: "Inside", 
    sequence: ".0_", 
    parentFamily: "Nouns", 
    family: "Inside", 
    description: "Going inside/home", 
    tier: "tier_a",
    discriminationSet: "location",
    trainingOrder: 15,
  },
  
  // Bathroom - extends Outside
  { 
    word: "Pee", 
    sequence: ".__", 
    parentFamily: "Nouns", 
    family: "Outside", 
    description: "Bathroom - urinate", 
    tier: "tier_a",
    discriminationSet: "bathroom",
    trainingOrder: 16,
  },
  { 
    word: "Poop", 
    sequence: ".__.", 
    parentFamily: "Nouns", 
    family: "Outside", 
    description: "Bathroom - defecate", 
    tier: "tier_a",
    discriminationSet: "bathroom",
    trainingOrder: 17,
  },
  
  // Sustenance - extends Yes root (..)
  { 
    word: "Food", 
    sequence: ".._", 
    parentFamily: "Nouns", 
    family: "Sustenance", 
    description: "Meal time", 
    tier: "tier_a",
    discriminationSet: "sustenance",
    trainingOrder: 18,
  },
  { 
    word: "Water", 
    sequence: ".._.", 
    parentFamily: "Nouns", 
    family: "Sustenance", 
    description: "Water time", 
    tier: "tier_a",
    discriminationSet: "sustenance",
    trainingOrder: 19,
  },
  
  // Targeting
  { 
    word: "Touch", 
    sequence: "_0.", 
    parentFamily: "Command", 
    family: "Communication", 
    description: "Nose touch to target", 
    tier: "tier_a",
    discriminationSet: "foundation_commands",
    trainingOrder: 20,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER B: Daily Life (10 words) - Weeks 9-16
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Inside Places - extends Inside (.0_)
  { 
    word: "Crate", 
    sequence: ".0__", 
    parentFamily: "Nouns", 
    family: "Inside", 
    description: "Go to crate", 
    tier: "tier_b",
    discriminationSet: "inside_places",
    trainingOrder: 21,
  },
  { 
    word: "Mat", 
    sequence: ".0_..", 
    parentFamily: "Nouns", 
    family: "Inside", 
    description: "Go to mat/place mat", 
    tier: "tier_b",
    discriminationSet: "inside_places",
    trainingOrder: 22,
  },
  { 
    word: "Bed", 
    sequence: ".0_.", 
    parentFamily: "Nouns", 
    family: "Inside", 
    description: "Go to bed", 
    tier: "tier_b",
    discriminationSet: "inside_places",
    trainingOrder: 23,
  },
  
  // Vocal Control
  { 
    word: "Quiet", 
    sequence: "_0...", 
    parentFamily: "Command", 
    family: "Communication", 
    description: "Stop vocalizing", 
    tier: "tier_b",
    discriminationSet: "vocal",
    trainingOrder: 24,
  },
  
  // Request Modifiers
  { 
    word: "Want", 
    sequence: "_..", 
    parentFamily: "Modifiers", 
    family: null, 
    description: "Request modifier - I want", 
    tier: "tier_b",
    discriminationSet: "modifiers",
    trainingOrder: 25,
  },
  { 
    word: "More", 
    sequence: "_._", 
    parentFamily: "Modifiers", 
    family: null, 
    description: "Quantity modifier - more please", 
    tier: "tier_b",
    discriminationSet: "modifiers",
    trainingOrder: 26,
  },
  { 
    word: "Done", 
    sequence: "..0_", 
    parentFamily: "Modifiers", 
    family: null, 
    description: "Completion modifier - finished", 
    tier: "tier_b",
    discriminationSet: "modifiers",
    trainingOrder: 27,
  },
  
  // Temporal
  { 
    word: "Easy", 
    sequence: "..0.", 
    parentFamily: "Modifiers", 
    family: null, 
    description: "Pace modifier - slow down, take it easy", 
    tier: "tier_b",
    discriminationSet: "temporal",
    trainingOrder: 28,
  },
  
  // Question/Feedback
  { 
    word: "What?", 
    sequence: ".0.", 
    parentFamily: "Question", 
    family: null, 
    description: "Dog's signal for confusion - I don't understand", 
    tier: "tier_b",
    discriminationSet: "question",
    trainingOrder: 29,
  },
  
  // Sustenance Extended
  { 
    word: "Treat", 
    sequence: "..__", 
    parentFamily: "Nouns", 
    family: "Sustenance", 
    description: "Treat/reward", 
    tier: "tier_b",
    discriminationSet: "sustenance",
    trainingOrder: 30,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER C: Abstract Concepts (12 words) - Weeks 17-28
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Temporal Extended
  { 
    word: "Now", 
    sequence: "..0..", 
    parentFamily: "Temporal", 
    family: null, 
    description: "Immediate timing - right now", 
    tier: "tier_c",
    discriminationSet: "temporal",
    trainingOrder: 31,
  },
  { 
    word: "Later", 
    sequence: "..0...", 
    parentFamily: "Temporal", 
    family: null, 
    description: "Future timing - not now, later", 
    tier: "tier_c",
    discriminationSet: "temporal",
    trainingOrder: 32,
  },
  
  // Location Extended
  { 
    word: "Park", 
    sequence: "._.", 
    parentFamily: "Nouns", 
    family: "Outside", 
    description: "Going to the park", 
    tier: "tier_c",
    discriminationSet: "location",
    trainingOrder: 33,
  },
  
  // Activities - extend Outside with silence
  { 
    word: "Play", 
    sequence: "._0.", 
    parentFamily: "Nouns", 
    family: "Outside", 
    description: "Play time", 
    tier: "tier_c",
    discriminationSet: "activities",
    trainingOrder: 34,
  },
  { 
    word: "Walk", 
    sequence: "._0_", 
    parentFamily: "Nouns", 
    family: "Outside", 
    description: "Go for a walk", 
    tier: "tier_c",
    discriminationSet: "activities",
    trainingOrder: 35,
  },
  
  // Objects
  { 
    word: "Toy", 
    sequence: "._._", 
    parentFamily: "Nouns", 
    family: "Play Objects", 
    description: "Toy/plaything", 
    tier: "tier_c",
    discriminationSet: "objects",
    trainingOrder: 36,
  },
  
  // Vocal Extended
  { 
    word: "Bark", 
    sequence: "_0_", 
    parentFamily: "Command", 
    family: "Communication", 
    description: "Speak/bark on command", 
    tier: "tier_c",
    discriminationSet: "vocal",
    trainingOrder: 37,
  },
  
  // Movement Advanced
  { 
    word: "Back up", 
    sequence: "__..0.", 
    parentFamily: "Command", 
    family: "Movement", 
    description: "Move backward", 
    tier: "tier_c",
    discriminationSet: "movement_advanced",
    trainingOrder: 38,
  },
  
  // Names - Max as distinct from Come
  { 
    word: "Max", 
    sequence: "__.", 
    parentFamily: "Names", 
    family: null, 
    description: "Handler's name - focus on Max", 
    tier: "tier_c",
    discriminationSet: "names",
    trainingOrder: 39,
    trainingContext: "name_focus",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER D: Advanced (8 words) - Weeks 29+
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Movement Advanced Extended
  { 
    word: "Behind", 
    sequence: "__..0_", 
    parentFamily: "Command", 
    family: "Movement", 
    description: "Fall behind handler", 
    tier: "tier_d",
    discriminationSet: "movement_advanced",
    trainingOrder: 40,
  },
  
  // Objects Extended
  { 
    word: "Car", 
    sequence: "._0__", 
    parentFamily: "Nouns", 
    family: "Outside", 
    description: "Car/vehicle", 
    tier: "tier_d",
    discriminationSet: "objects",
    trainingOrder: 41,
  },
  { 
    word: "Ball", 
    sequence: "._._.", 
    parentFamily: "Nouns", 
    family: "Play Objects", 
    description: "Ball", 
    tier: "tier_d",
    discriminationSet: "objects",
    trainingOrder: 42,
  },
  
  // Vocal Advanced
  { 
    word: "Growl", 
    sequence: "_0_0_", 
    parentFamily: "Command", 
    family: "Communication", 
    description: "Growl on command", 
    tier: "tier_d",
    discriminationSet: "vocal",
    trainingOrder: 43,
  },
  
  // Emotional Communication (Dog → Human)
  { 
    word: "Scared", 
    sequence: "_0..", 
    parentFamily: "Feelings", 
    family: null, 
    description: "Dog signals fear/anxiety", 
    tier: "tier_d",
    discriminationSet: "feelings",
    trainingOrder: 44,
  },
  { 
    word: "Help", 
    sequence: "_0__", 
    parentFamily: "Feelings", 
    family: null, 
    description: "Dog signals need for assistance", 
    tier: "tier_d",
    discriminationSet: "feelings",
    trainingOrder: 45,
  },
  { 
    word: "Hurt", 
    sequence: "_0__.", 
    parentFamily: "Feelings", 
    family: null, 
    description: "Dog signals pain/discomfort", 
    tier: "tier_d",
    discriminationSet: "feelings",
    trainingOrder: 46,
  },
];

// Discrimination set labels for UI
export const DISCRIMINATION_SET_LABELS: Record<string, string> = {
  foundation_markers: "Foundation Markers",
  foundation_commands: "Foundation Commands",
  identity: "Name Recognition",
  stationary: "Stationary Positions",
  movement_core: "Core Movement",
  movement_extended: "Movement Extensions",
  movement_advanced: "Advanced Movement",
  location: "Inside/Outside",
  bathroom: "Bathroom",
  sustenance: "Food & Water",
  inside_places: "Indoor Places",
  temporal: "Timing & Pace",
  modifiers: "Request Modifiers",
  vocal: "Vocal Commands",
  activities: "Activities",
  objects: "Objects",
  question: "Communication",
  feelings: "Emotional Signals",
  names: "Names",
};

// Socialization items - 50 items across 7 categories
type SocializationCategory = "handling" | "people" | "surfaces" | "sounds" | "environments" | "animals" | "objects";

interface SocializationItemData {
  category: SocializationCategory;
  name: string;
  description: string;
}

const socializationItemsData: SocializationItemData[] = [
  // Handling (10 items) - cooperative care essentials
  { category: "handling", name: "Ear touching", description: "Gently touching and inspecting ears" },
  { category: "handling", name: "Mouth opening", description: "Opening mouth to check teeth" },
  { category: "handling", name: "Paw handling", description: "Touching and holding all four paws" },
  { category: "handling", name: "Nail touching", description: "Touching and tapping nails" },
  { category: "handling", name: "Restraint holding", description: "Holding dog still for examination" },
  { category: "handling", name: "Brushing", description: "Brushing coat with various brushes" },
  { category: "handling", name: "Nail dremel", description: "Using dremel tool on nails" },
  { category: "handling", name: "Vet exam simulation", description: "Simulating a full vet examination" },
  { category: "handling", name: "Muzzle conditioning", description: "Wearing a muzzle comfortably" },
  { category: "handling", name: "Lifting", description: "Being lifted off the ground" },

  // People (10 items) - common encounters
  { category: "people", name: "Men", description: "Adult men of various appearances" },
  { category: "people", name: "Women", description: "Adult women of various appearances" },
  { category: "people", name: "Children", description: "Children of various ages" },
  { category: "people", name: "Elderly", description: "Elderly people with slow movements" },
  { category: "people", name: "Hats/sunglasses", description: "People wearing hats or sunglasses" },
  { category: "people", name: "Uniforms", description: "People in uniforms (postal, police, etc.)" },
  { category: "people", name: "Runners", description: "People running or jogging" },
  { category: "people", name: "Cyclists", description: "People riding bicycles" },
  { category: "people", name: "Delivery workers", description: "Delivery people approaching home" },
  { category: "people", name: "Large groups", description: "Groups of 5+ people together" },

  // Sounds (8 items) - most problematic for herding breeds
  { category: "sounds", name: "Traffic", description: "Cars, trucks, motorcycles passing" },
  { category: "sounds", name: "Thunder recording", description: "Recorded thunder sounds" },
  { category: "sounds", name: "Fireworks recording", description: "Recorded firework sounds" },
  { category: "sounds", name: "Vacuum cleaner", description: "Vacuum cleaner running" },
  { category: "sounds", name: "Doorbell", description: "Doorbell ringing" },
  { category: "sounds", name: "Sirens", description: "Emergency vehicle sirens" },
  { category: "sounds", name: "Dropped objects", description: "Objects being dropped loudly" },
  { category: "sounds", name: "Construction", description: "Construction equipment sounds" },

  // Environments (8 items) - practical locations
  { category: "environments", name: "Pet store", description: "Visit to pet supply store" },
  { category: "environments", name: "Outdoor patio", description: "Restaurant or cafe patio" },
  { category: "environments", name: "Car ride", description: "Riding in a car" },
  { category: "environments", name: "Vet lobby", description: "Waiting room at vet clinic" },
  { category: "environments", name: "Park", description: "Public park visit" },
  { category: "environments", name: "Downtown sidewalk", description: "Busy urban sidewalk" },
  { category: "environments", name: "Friend's house", description: "Visiting unfamiliar homes" },
  { category: "environments", name: "Elevator", description: "Riding in an elevator" },

  // Surfaces (5 items) - confidence building
  { category: "surfaces", name: "Metal grating", description: "Walking on metal grates or grids" },
  { category: "surfaces", name: "Tile/linoleum", description: "Walking on slippery tile floors" },
  { category: "surfaces", name: "Wet surfaces", description: "Walking on wet ground" },
  { category: "surfaces", name: "Stairs", description: "Going up and down stairs" },
  { category: "surfaces", name: "Wobbly surfaces", description: "Standing on unstable platforms" },

  // Animals (5 items) - essential exposures
  { category: "animals", name: "Calm adult dogs", description: "Multiple calm adult dogs" },
  { category: "animals", name: "Puppies", description: "Other puppies for play" },
  { category: "animals", name: "Cats", description: "Exposure to cats" },
  { category: "animals", name: "Dogs of varied sizes", description: "Small, medium, and large dogs" },
  { category: "animals", name: "Birds/waterfowl", description: "Ducks, geese, pigeons" },

  // Objects (4 items) - scariest/most common
  { category: "objects", name: "Strollers", description: "Baby strollers moving" },
  { category: "objects", name: "Bicycles", description: "Bicycles passing" },
  { category: "objects", name: "Umbrellas opening", description: "Umbrellas opening suddenly" },
  { category: "objects", name: "Vacuum (moving)", description: "Vacuum cleaner being pushed" },
];

// Milestones
type MilestoneCategory = "class" | "title" | "test";

interface MilestoneData {
  category: MilestoneCategory;
  name: string;
  description: string;
  targetAgeWeeks: number | null;
  estimatedCost: string | null;
  prerequisites: string | null;
}

const milestonesData: MilestoneData[] = [
  // Classes
  { category: "class", name: "S.T.A.R. Puppy", description: "AKC S.T.A.R. Puppy 6-week class", targetAgeWeeks: 16, estimatedCost: "180.00", prerequisites: null },
  { category: "class", name: "Beginner Obedience", description: "Formal obedience basics", targetAgeWeeks: 20, estimatedCost: "160.00", prerequisites: "S.T.A.R. Puppy" },
  { category: "class", name: "Intro to Nosework", description: "Foundation scent work", targetAgeWeeks: 24, estimatedCost: "175.00", prerequisites: null },
  { category: "class", name: "Advanced Obedience", description: "CGC prep and advanced skills", targetAgeWeeks: 32, estimatedCost: "180.00", prerequisites: "Beginner Obedience" },
  { category: "class", name: "CGC Prep", description: "Canine Good Citizen test preparation", targetAgeWeeks: 36, estimatedCost: "150.00", prerequisites: "Beginner Obedience" },
  { category: "class", name: "Beginner Agility", description: "Foundation agility skills", targetAgeWeeks: 40, estimatedCost: "325.00", prerequisites: "Basic impulse control" },
  { category: "class", name: "Continuing Agility", description: "Ongoing agility training", targetAgeWeeks: 52, estimatedCost: "325.00", prerequisites: "Beginner Agility" },
  { category: "class", name: "Nosework Continuing", description: "Advanced scent work", targetAgeWeeks: 48, estimatedCost: "175.00", prerequisites: "Intro to Nosework" },
  { category: "class", name: "Competition Obedience", description: "AKC CD preparation", targetAgeWeeks: 60, estimatedCost: "180.00", prerequisites: "CGC" },
  { category: "class", name: "CGCA Prep", description: "Advanced CGC in real-world settings", targetAgeWeeks: 56, estimatedCost: "150.00", prerequisites: "CGC" },

  // Titles
  { category: "title", name: "S.T.A.R. Puppy Title", description: "AKC S.T.A.R. Puppy certification", targetAgeWeeks: 18, estimatedCost: null, prerequisites: "S.T.A.R. Puppy class" },
  { category: "title", name: "CGC", description: "AKC Canine Good Citizen", targetAgeWeeks: 40, estimatedCost: "15.00", prerequisites: "Tier 2 commands at 85%+" },
  { category: "title", name: "CGCA", description: "AKC Advanced Canine Good Citizen", targetAgeWeeks: 56, estimatedCost: "15.00", prerequisites: "CGC" },
  { category: "title", name: "TKN", description: "AKC Trick Dog Novice - 10 novice tricks", targetAgeWeeks: 28, estimatedCost: "25.00", prerequisites: null },
  { category: "title", name: "TKI", description: "AKC Trick Dog Intermediate - 10 intermediate tricks", targetAgeWeeks: 44, estimatedCost: "25.00", prerequisites: "TKN" },
  { category: "title", name: "TKA", description: "AKC Trick Dog Advanced - 10 advanced tricks", targetAgeWeeks: 64, estimatedCost: "25.00", prerequisites: "TKI" },
  { category: "title", name: "CD", description: "AKC Companion Dog - Novice obedience", targetAgeWeeks: 72, estimatedCost: "35.00", prerequisites: "Competition Obedience class" },

  // Tests
  { category: "test", name: "Herding Instinct Test", description: "Assess natural herding ability", targetAgeWeeks: 26, estimatedCost: "50.00", prerequisites: null },
  { category: "test", name: "Temperament Test", description: "Professional temperament assessment", targetAgeWeeks: 12, estimatedCost: "75.00", prerequisites: null },
];

async function seedTraining() {
  console.log("Seeding training plan data...\n");

  // First, clear existing data (in correct order due to foreign keys)
  console.log("Clearing existing data...");
  await db.execute(sql`DELETE FROM socialization_scores`);
  await db.execute(sql`DELETE FROM socialization_items`);
  await db.execute(sql`DELETE FROM completed_goals`);
  await db.execute(sql`DELETE FROM milestones`);
  await db.execute(sql`DELETE FROM training_tracks`);
  await db.execute(sql`DELETE FROM training_settings`);
  await db.execute(sql`DELETE FROM dog_profile`);
  await db.execute(sql`DELETE FROM training_records`);
  await db.execute(sql`DELETE FROM training_sessions`);
  await db.execute(sql`DELETE FROM commands`);
  
  // Insert commands with tiers and discrimination sets
  console.log("\nInserting commands with tiers and discrimination sets...");
  for (const cmd of commandsWithTiers) {
    await db.insert(commands).values({
      word: cmd.word,
      sequence: cmd.sequence,
      parentFamily: cmd.parentFamily,
      family: cmd.family,
      description: cmd.description,
      tier: cmd.tier,
      discriminationSet: cmd.discriminationSet,
      trainingOrder: cmd.trainingOrder,
      trainingContext: cmd.trainingContext || null,
      isFoundationMarker: cmd.isFoundationMarker || false,
      progressionStage: "not_started",
      exposureCount: 0,
      isActive: cmd.tier === "tier_0", // Only Tier 0 commands are active initially
    });
  }
  console.log(`Inserted ${commandsWithTiers.length} commands`);

  // Insert dog profile (Pythagoras - born Jan 18, 2026, arrives Mar 14, 2026)
  console.log("\nInserting dog profile...");
  await db.insert(dogProfile).values({
    name: "Pythagoras",
    nickname: "Py",
    breed: "Mudi",
    birthDate: "2026-01-18",
    arrivalDate: "2026-03-14",
  });
  console.log("Inserted dog profile: Pythagoras (Py)");

  // Insert training settings
  console.log("\nInserting training settings...");
  await db.insert(trainingSettings).values({
    aggressiveness: 3,
    weeklyTrainingHours: "5.0",
    sessionsPerDay: 3,
    minutesPerSession: 8,
    trainingDaysPerWeek: 6,
  });
  console.log("Inserted default training settings (aggressiveness: 3)");

  // Insert training tracks
  console.log("\nInserting training tracks...");
  const tracks = [
    { track: "t1_obedience" as const, currentTier: "tier_0", currentPhase: "phase_a", offLeashRung: 1 },
    { track: "t2_socialization" as const, currentTier: "tier_0", currentPhase: "phase_a", offLeashRung: 1 },
    { track: "t3_communication" as const, currentTier: "tier_0", currentPhase: "phase_a", offLeashRung: 1 },
    { track: "t4_impulse" as const, currentTier: "tier_0", currentPhase: "phase_a", offLeashRung: 1 },
    { track: "t5_enrichment" as const, currentTier: "tier_0", currentPhase: "phase_a", offLeashRung: 1 },
  ];
  for (const track of tracks) {
    await db.insert(trainingTracks).values(track);
  }
  console.log("Inserted 5 training tracks");

  // Insert socialization items
  console.log("\nInserting socialization items...");
  let sortOrder = 0;
  for (const item of socializationItemsData) {
    await db.insert(socializationItems).values({
      category: item.category,
      name: item.name,
      description: item.description,
      sortOrder: sortOrder++,
    });
  }
  console.log(`Inserted ${socializationItemsData.length} socialization items`);

  // Insert milestones
  console.log("\nInserting milestones...");
  for (const milestone of milestonesData) {
    await db.insert(milestones).values({
      category: milestone.category,
      name: milestone.name,
      description: milestone.description,
      targetAgeWeeks: milestone.targetAgeWeeks,
      estimatedCost: milestone.estimatedCost,
      prerequisites: milestone.prerequisites,
      status: "not_started",
    });
  }
  console.log(`Inserted ${milestonesData.length} milestones`);

  // Insert default sound settings
  console.log("\nInserting sound settings...");
  await db.insert(soundSettings).values({
    name: "Default",
    soundType: "beep",
    frequency: 800,
    shortDurationMs: 100,
    longDurationMs: 300,
    silenceDurationMs: 150,
    isActive: true,
  });
  console.log("Inserted default sound settings");

  console.log("\n========================================");
  console.log("Training plan seeding complete!");
  console.log("========================================");
  console.log(`Commands: ${commandsWithTiers.length}`);
  console.log(`Socialization items: ${socializationItemsData.length}`);
  console.log(`Milestones: ${milestonesData.length}`);
  console.log("Dog: Pythagoras (Py) - arrives Mar 14, 2026");
}

seedTraining().catch(console.error);
