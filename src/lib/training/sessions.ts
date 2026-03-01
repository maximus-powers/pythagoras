/**
 * Training Session System
 * 
 * Sessions replace the goal-based T1/T4/T5 tracks with structured training blocks.
 * Each session has:
 * - A type (skill, impulse, play, enrichment, outing)
 * - Duration based on developmental stage
 * - Objectives served (tags)
 * - Activities within the session
 * 
 * Session frequency scales with aggressiveness setting.
 */

export type SessionType = 
  | "skill"       // Primary training: luring, shaping, proofing commands
  | "impulse"     // Dedicated impulse control work
  | "play"        // Structured play with rules (tug, fetch, chase)
  | "enrichment"  // Puzzle feeders, nosework, shaping games
  | "outing";     // Socialization / environment exposure

export type SessionObjective = 
  | "obedience"       // Command training
  | "impulse_control" // Impulse control development  
  | "enrichment"      // Mental stimulation
  | "socialization"   // Exposure/confidence building
  | "proofing"        // Adding distance, duration, distraction
  | "relationship";   // Bonding through play

/**
 * Session parameters by developmental phase
 */
interface PhaseParams {
  minDuration: number;  // minutes
  maxDuration: number;  // minutes
  sessionsPerDay: number;
  focusAreas: string[];
}

export const SESSION_PARAMS_BY_PHASE: Record<string, PhaseParams> = {
  phase_a: { // Weeks 1-8 (8-16 weeks old) - Foundation
    minDuration: 3,
    maxDuration: 5,
    sessionsPerDay: 4,
    focusAreas: ["luring", "capturing", "name recognition", "handling", "socialization"],
  },
  phase_b: { // Weeks 9-16 (16-24 weeks old) - Formal training begins
    minDuration: 5,
    maxDuration: 10,
    sessionsPerDay: 3,
    focusAreas: ["shaping", "chaining", "impulse control", "recall", "loose leash"],
  },
  phase_c: { // Weeks 17-36 (24-44 weeks old) - Adolescence
    minDuration: 10,
    maxDuration: 15,
    sessionsPerDay: 3,
    focusAreas: ["proofing", "distractions", "duration", "distance", "advanced impulse"],
  },
  phase_d: { // Weeks 37+ (44+ weeks old) - Young adult
    minDuration: 15,
    maxDuration: 20,
    sessionsPerDay: 2,
    focusAreas: ["reliability", "competition prep", "off-leash", "advanced skills"],
  },
};

/**
 * Get phase for a training week number
 */
export function getPhaseForWeek(weekNumber: number): string {
  if (weekNumber <= 8) return "phase_a";
  if (weekNumber <= 16) return "phase_b";
  if (weekNumber <= 36) return "phase_c";
  return "phase_d";
}

/**
 * Scale sessions per day based on aggressiveness
 * Aggressiveness 1 = minimum, 5 = maximum
 */
export function getSessionsPerDay(baseCount: number, aggressiveness: number): number {
  const adjustment = aggressiveness - 3; // -2 to +2
  return Math.max(1, Math.min(6, baseCount + adjustment));
}

/**
 * Session activity within a session
 */
export interface SessionActivity {
  name: string;
  description: string;
  durationMinutes: number;
  objectives: SessionObjective[];
  tips?: string[];
}

/**
 * Session template - defines what a session contains
 */
export interface SessionTemplate {
  id: string;
  type: SessionType;
  name: string;
  description: string;
  objectives: SessionObjective[];
  phase: string; // phase_a, phase_b, etc.
  activities: SessionActivity[];
  totalDuration: number; // calculated from activities
  prerequisites?: string[];
  notes?: string[]; // Additional guidance, warnings, tips
  weekRange?: [number, number]; // Optional: specific weeks this template is for (e.g., [1, 1] = week 1 only)
}

/**
 * Session templates organized by phase and type
 */
export const SESSION_TEMPLATES: SessionTemplate[] = [
  // ============================================
  // WEEK 1: Arrival & Settling (puppy 8-9 weeks)
  // Focus: Decompression, trust building, basic routines
  // NOT about obedience - about helping puppy feel safe
  // ============================================

  {
    id: "settle_a_arrival",
    type: "enrichment",
    name: "Arrival & Settling",
    description: "Help puppy decompress after the big journey home - Day 1 priority",
    objectives: ["socialization"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Potty spot introduction",
        description: "Carry puppy directly to designated potty spot. Wait quietly (up to 5 min). Mark and reward if they go.",
        durationMinutes: 5,
        objectives: ["socialization"],
        tips: [
          "Don't play yet - business first",
          "Same spot every time builds habit",
          "If no potty, try again in 15 min",
        ],
      },
      {
        name: "Limited home exploration",
        description: "Allow puppy to sniff and explore ONE room at their pace. Stay calm and quiet. No carrying around.",
        durationMinutes: 10,
        objectives: ["socialization"],
        tips: [
          "Let them approach you",
          "Watch for stress: hiding, whale eye, trembling",
          "Resist urge to show them everything",
        ],
      },
      {
        name: "Calm presence",
        description: "Sit on floor near puppy. Don't force interaction. Let them come to you for gentle pets.",
        durationMinutes: 5,
        objectives: ["relationship"],
        tips: [
          "Soft voice, slow movements",
          "This is about trust, not training",
          "Let puppy choose the interaction level",
        ],
      },
    ],
    totalDuration: 20,
    notes: [
      "DO NOT: Invite visitors over today",
      "DO NOT: Introduce to other pets yet",
      "DO NOT: Expect any obedience",
      "DO NOT: Leave puppy alone for extended periods",
      "DO NOT: Overwhelm with toys, treats, and attention",
    ],
  },

  {
    id: "settle_a_crate_intro",
    type: "skill",
    name: "Crate Love Building",
    description: "Create positive crate association - NOT about duration yet",
    objectives: ["obedience"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Treat tosses",
        description: "Toss high-value treats into crate. Let puppy go in, eat, come out freely. Door stays OPEN. 5-8 reps.",
        durationMinutes: 2,
        objectives: ["obedience"],
        tips: [
          "Never force or push puppy in",
          "Crate = good things magically appear",
          "Let them exit freely every time",
        ],
      },
      {
        name: "Meal in crate",
        description: "Place food bowl inside crate. Puppy eats inside with door open. Stay nearby calmly.",
        durationMinutes: 3,
        objectives: ["obedience"],
        tips: [
          "If hesitant, place bowl at entrance first",
          "Gradually move bowl deeper over meals",
          "Don't close door during meals yet (Day 1-2)",
        ],
      },
      {
        name: "Brief door closure",
        description: "After meal/treats, gently close door for 10-30 seconds while you sit RIGHT THERE. Open before any fussing.",
        durationMinutes: 1,
        objectives: ["obedience"],
        tips: [
          "Only start this on Day 2-3",
          "Build up VERY slowly",
          "If whining, wait for 2 sec of quiet before opening",
        ],
      },
    ],
    totalDuration: 6,
    notes: [
      "DO NOT: Lock puppy in for long periods yet",
      "DO NOT: Use crate as punishment",
      "DO NOT: Leave collar/tags on in crate (strangulation hazard)",
      "Crate training takes 6+ months to solidify - patience!",
    ],
  },

  {
    id: "settle_a_potty",
    type: "skill",
    name: "Potty Foundations",
    description: "Establish potty schedule and location - consistency is everything",
    objectives: ["obedience"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Scheduled potty trip",
        description: "Take to potty spot: first thing AM, after meals, after naps, after play, before bed, every 2-3 hours.",
        durationMinutes: 5,
        objectives: ["obedience"],
        tips: [
          "Same spot every time",
          "Say cue word ('go potty') WHILE they're going",
          "Wait up to 5 min - no play until business done",
        ],
      },
      {
        name: "Reward success",
        description: "The INSTANT puppy finishes, mark and reward with treat AND praise. Make it a party!",
        durationMinutes: 1,
        objectives: ["obedience"],
        tips: [
          "Timing critical - reward during/immediately after",
          "Then playtime as additional reward",
          "Be boring until they go, then celebrate",
        ],
      },
      {
        name: "Accident protocol",
        description: "If accident inside: interrupt gently ('oops!'), carry to potty spot. Clean with enzymatic cleaner.",
        durationMinutes: 2,
        objectives: ["obedience"],
        tips: [
          "Accidents = YOUR management failure, not puppy's fault",
          "Use enzymatic cleaner (Nature's Miracle, etc.)",
          "Never use ammonia cleaners (smells like urine)",
        ],
      },
    ],
    totalDuration: 8,
    notes: [
      "DO NOT: Punish, scold, or rub nose in accidents",
      "DO NOT: Expect puppy to 'tell you' they need to go",
      "Bladder rule: ~1 hour per month of age (8 weeks = 2 hours max)",
      "Expect 1-2 nighttime potty breaks for young puppies",
    ],
  },

  {
    id: "settle_a_handling",
    type: "skill",
    name: "Gentle Handling",
    description: "Prepare puppy for vet visits, grooming, and general handling",
    objectives: ["socialization"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Paw touches",
        description: "Touch paw briefly, immediately give treat. Repeat each paw 3x. Touch = treat starts, no touch = treat stops.",
        durationMinutes: 2,
        objectives: ["socialization"],
        tips: [
          "Very brief touches at first",
          "Build up to holding paw for 1-2 seconds",
          "If puppy pulls away, make it easier",
        ],
      },
      {
        name: "Ear and mouth check",
        description: "Gently lift ear flap (treat), briefly look at teeth by lifting lip (treat). Just 2 reps each.",
        durationMinutes: 1,
        objectives: ["socialization"],
        tips: [
          "Don't restrain - keep it positive",
          "This is conditioning, not examination",
          "Speed and brevity are your friends",
        ],
      },
      {
        name: "Body handling",
        description: "Run hands gently over body, touch tail, hold collar briefly. Continuous treat delivery throughout.",
        durationMinutes: 1,
        objectives: ["socialization"],
        tips: [
          "Watch for stress: squirming, whale eye, stops taking treats",
          "If stressed, back off and make it easier",
          "End while puppy still wants more",
        ],
      },
    ],
    totalDuration: 4,
    notes: [
      "DO NOT: Restrain a struggling puppy - make it easier instead",
      "DO NOT: Do long sessions - 30 seconds to 2 minutes MAX",
      "Start this on Day 3, not Day 1",
      "Always end on success",
    ],
  },

  {
    id: "settle_a_name",
    type: "skill",
    name: "Name Game",
    description: "Build strong name response - foundation for all future training",
    objectives: ["obedience"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Name = look at me",
        description: "Say name ONCE in happy voice. The instant puppy looks, mark ('yes!') and treat. Do 10 reps.",
        durationMinutes: 2,
        objectives: ["obedience"],
        tips: [
          "Only say name ONCE per rep",
          "Mark the head turn, not just eye contact",
          "If no response, make kissy noise, then try name again",
        ],
      },
      {
        name: "Name from mild distraction",
        description: "While puppy sniffs something boring, say name. Mark and reward the look. Just 5 reps.",
        durationMinutes: 1,
        objectives: ["obedience"],
        tips: [
          "Start with very mild distractions only",
          "Don't compete with food or exciting toys yet",
          "Set puppy up for success",
        ],
      },
    ],
    totalDuration: 3,
    notes: [
      "DO NOT: Repeat name multiple times (teaches to ignore it)",
      "DO NOT: Use name for corrections (keep it 100% positive)",
      "Start this on Day 4-5, not Day 1",
      "Multiple short sessions (5 reps) throughout day beats one long session",
    ],
  },

  {
    id: "settle_a_sounds",
    type: "enrichment",
    name: "Sound Socialization",
    description: "Introduce household sounds at low volume with positive associations",
    objectives: ["socialization"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Background sounds",
        description: "Play TV or radio at low volume during meal or play time. Puppy learns normal household isn't scary.",
        durationMinutes: 5,
        objectives: ["socialization"],
        tips: [
          "Volume low enough that puppy ignores it",
          "Pair with good things (food, play)",
          "This is passive exposure - no active training",
        ],
      },
      {
        name: "Specific sound intro",
        description: "One novel sound (doorbell video, vacuum from other room, pot clanging) at low volume. Treat throughout.",
        durationMinutes: 2,
        objectives: ["socialization"],
        tips: [
          "Start at lowest volume, increase gradually over days",
          "If puppy reacts fearfully, increase distance / decrease volume",
          "Let puppy investigate sound source at own pace",
        ],
      },
    ],
    totalDuration: 7,
    notes: [
      "DO NOT: Blast scary sounds to 'desensitize'",
      "DO NOT: Comfort fearful puppy with soothing voice (reinforces fear)",
      "BE: Calm, neutral, matter-of-fact when sounds happen",
      "Start on Day 4-5 when puppy is more settled",
    ],
  },

  {
    id: "settle_a_surfaces",
    type: "enrichment",
    name: "Surface Exploration",
    description: "Build confidence on different textures and surfaces at home",
    objectives: ["socialization"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Indoor surfaces",
        description: "Let puppy explore different surfaces: tile, carpet, hardwood, rubber mat. Scatter treats to encourage.",
        durationMinutes: 3,
        objectives: ["socialization"],
        tips: [
          "Let puppy CHOOSE to approach",
          "Scatter treats ON the surface",
          "Don't place puppy on scary surface",
        ],
      },
      {
        name: "Novel objects",
        description: "Place safe novel objects (cardboard box, crinkly paper bag, wobble board) and let puppy investigate freely.",
        durationMinutes: 2,
        objectives: ["socialization"],
        tips: [
          "Reward any interest or brave approach",
          "Don't lure puppy onto scary things",
          "Let curiosity win over fear naturally",
        ],
      },
    ],
    totalDuration: 5,
    notes: [
      "DO NOT: Place puppy on surface they're scared of",
      "DO NOT: Flood with too many new things at once",
      "Start on Day 4-5 when puppy is settled",
      "Quality over quantity - one new thing done well beats five done poorly",
    ],
  },

  {
    id: "settle_a_relax",
    type: "enrichment",
    name: "Settling Practice",
    description: "Teach puppy that calm behavior is rewarding - prevents demand barking and hyperactivity",
    objectives: ["impulse_control"],
    phase: "phase_a",
    weekRange: [1, 1],
    activities: [
      {
        name: "Capturing calm",
        description: "When puppy naturally settles (lies down, sighs), quietly mark and place treat between paws. 5+ reps over time.",
        durationMinutes: 5,
        objectives: ["impulse_control"],
        tips: [
          "Don't excite them with praise - stay calm",
          "Treat delivery should be boring and slow",
          "You're rewarding a state of mind, not a position",
        ],
      },
      {
        name: "Mat introduction",
        description: "Place mat/bed down. Any attention to it gets a treat tossed on it. Build to all four paws on, then lying down.",
        durationMinutes: 3,
        objectives: ["impulse_control"],
        tips: [
          "Don't lure onto mat - let them figure it out",
          "Shape: look at mat → approach → sniff → paw on → lie down",
          "This becomes 'place' command foundation",
        ],
      },
    ],
    totalDuration: 8,
    notes: [
      "This prevents future problems: demand barking, can't settle, always 'on'",
      "Start on Day 3 when puppy has some comfort",
      "Karen Overall's Relaxation Protocol is excellent for this",
    ],
  },

  // ============================================
  // PHASE A: Foundation (weeks 2-8, puppy 9-16 weeks)
  // Standard foundation training begins Week 2
  // ============================================
  
  // Skill Sessions - Phase A
  {
    id: "skill_a_luring",
    type: "skill",
    name: "Luring Basics",
    description: "Introduce luring for sit, down, and touch using food",
    objectives: ["obedience"],
    phase: "phase_a",
    activities: [
      {
        name: "Engagement warm-up",
        description: "Get eye contact with treat, mark and reward 3-5 times",
        durationMinutes: 0.5,
        objectives: ["obedience", "relationship"],
      },
      {
        name: "Lure sit",
        description: "Hold treat at nose, lift up and back. Mark the moment butt hits ground. 5-8 reps.",
        durationMinutes: 1.5,
        objectives: ["obedience"],
        tips: ["Don't say the cue yet - just lure and mark", "Keep treat close to nose", "Mark the instant of success"],
      },
      {
        name: "Lure down",
        description: "From sit, draw treat to ground between paws. Mark when elbows touch. 5-8 reps.",
        durationMinutes: 1.5,
        objectives: ["obedience"],
        tips: ["May need to shape by rewarding partial attempts", "Don't push the dog down"],
      },
      {
        name: "Hand touch",
        description: "Present flat palm, mark when nose touches. 5 reps.",
        durationMinutes: 1,
        objectives: ["obedience"],
      },
    ],
    totalDuration: 4.5,
  },
  {
    id: "skill_a_name",
    type: "skill",
    name: "Name Recognition",
    description: "Build strong response to name by pairing with rewards",
    objectives: ["obedience"],
    phase: "phase_a",
    activities: [
      {
        name: "Name game",
        description: "Say name in happy voice, mark when puppy looks, deliver treat. 10 reps.",
        durationMinutes: 2,
        objectives: ["obedience"],
        tips: ["Only say name once per rep", "Mark the head turn, not just eye contact", "Build to distractions gradually"],
      },
      {
        name: "Name from mild distraction",
        description: "Toss treat, let puppy eat, say name, mark when they turn back. 5 reps.",
        durationMinutes: 1.5,
        objectives: ["obedience", "impulse_control"],
      },
      {
        name: "Reward with play",
        description: "Say name, when puppy responds, reward with brief tug or chase game.",
        durationMinutes: 1,
        objectives: ["obedience", "relationship"],
      },
    ],
    totalDuration: 4.5,
  },
  {
    id: "skill_a_recall",
    type: "skill",
    name: "Puppy Recall",
    description: "Build foundation recall with restrained recalls and chase games",
    objectives: ["obedience"],
    phase: "phase_a",
    activities: [
      {
        name: "Restrained recall",
        description: "Helper holds puppy, you run away calling excitedly. Helper releases. Huge reward when puppy arrives.",
        durationMinutes: 2,
        objectives: ["obedience", "relationship"],
        tips: ["Run away to trigger chase instinct", "Party hard when they arrive", "Only do 3-4 reps to keep it special"],
      },
      {
        name: "Chase recall",
        description: "Get puppy interested, run away calling. Mark and reward catch. 3-4 reps.",
        durationMinutes: 1.5,
        objectives: ["obedience", "relationship"],
      },
      {
        name: "Treat scatter find",
        description: "Toss treats away, let puppy find them, call back for more. 3 reps.",
        durationMinutes: 1,
        objectives: ["obedience"],
      },
    ],
    totalDuration: 4.5,
  },

  // Impulse Sessions - Phase A
  {
    id: "impulse_a_choice",
    type: "impulse",
    name: "It's Yer Choice",
    description: "Foundation impulse control - dog learns self-control earns rewards",
    objectives: ["impulse_control"],
    phase: "phase_a",
    activities: [
      {
        name: "Closed fist game",
        description: "Hold treat in fist. Wait for puppy to back off or look up. Mark and open hand. 8-10 reps.",
        durationMinutes: 2,
        objectives: ["impulse_control"],
        tips: ["Never pull hand away", "Wait for ANY backing off at first", "Don't say anything - let them figure it out"],
      },
      {
        name: "Open fist progression",
        description: "Once closed fist is easy, try slightly open. Close if puppy goes for it. 5 reps.",
        durationMinutes: 1.5,
        objectives: ["impulse_control"],
      },
      {
        name: "Zen bowl intro",
        description: "Lower food bowl slowly. Raise if puppy moves. Lower when still. 3 meal reps.",
        durationMinutes: 1,
        objectives: ["impulse_control"],
      },
    ],
    totalDuration: 4.5,
  },
  {
    id: "impulse_a_door",
    type: "impulse",
    name: "Door Patience",
    description: "Wait at doors - prevents door dashing and builds patience",
    objectives: ["impulse_control"],
    phase: "phase_a",
    activities: [
      {
        name: "Door approach",
        description: "Approach door with puppy. Reach for handle. If puppy rushes, remove hand. 5 reps.",
        durationMinutes: 1.5,
        objectives: ["impulse_control"],
        tips: ["Start with low-value doors (closet, bathroom)", "Work up to exciting doors (outside, car)"],
      },
      {
        name: "Door opening",
        description: "Slowly open door. Close if puppy moves toward opening. Mark stillness. 5 reps.",
        durationMinutes: 2,
        objectives: ["impulse_control"],
      },
      {
        name: "Threshold hold",
        description: "Door open, puppy waits. Start with 1 second, build to 3. Release word. 3 reps.",
        durationMinutes: 1,
        objectives: ["impulse_control"],
      },
    ],
    totalDuration: 4.5,
  },

  // Play Sessions - Phase A
  {
    id: "play_a_tug",
    type: "play",
    name: "Structured Tug",
    description: "Build tug drive with rules - this becomes a powerful training reward",
    objectives: ["relationship", "impulse_control"],
    phase: "phase_a",
    activities: [
      {
        name: "Tug invitation",
        description: "Present tug, encourage grab with movement and squeaky noises. Let puppy win first few times.",
        durationMinutes: 1.5,
        objectives: ["relationship"],
        tips: ["Let the toy move like prey - erratic, away from puppy", "Let puppy win and parade with toy"],
      },
      {
        name: "Trade for treat",
        description: "During tug, offer high-value treat. Mark when puppy drops tug. Give treat, immediately offer tug again.",
        durationMinutes: 2,
        objectives: ["impulse_control", "relationship"],
        tips: ["The reward for dropping is MORE TUG", "Don't pull toy from mouth"],
      },
      {
        name: "Impulse before tug",
        description: "Ask for brief sit or eye contact before presenting tug. 3 reps.",
        durationMinutes: 1,
        objectives: ["impulse_control", "obedience"],
      },
    ],
    totalDuration: 4.5,
  },

  // Enrichment Sessions - Phase A
  {
    id: "enrichment_a_puzzle",
    type: "enrichment",
    name: "Puzzle Feeding",
    description: "Turn meals into mental exercise with puzzle toys",
    objectives: ["enrichment"],
    phase: "phase_a",
    activities: [
      {
        name: "Kong/Toppl intro",
        description: "Stuff Kong loosely with kibble. Let puppy work to empty it.",
        durationMinutes: 3,
        objectives: ["enrichment"],
        tips: ["Start with easy stuffing (kibble falls out easily)", "Freeze for longer challenge later"],
      },
      {
        name: "Snuffle mat",
        description: "Scatter portion of meal in snuffle mat. Supervised sniffing.",
        durationMinutes: 2,
        objectives: ["enrichment"],
      },
    ],
    totalDuration: 5,
  },
  {
    id: "enrichment_a_nosework",
    type: "enrichment",
    name: "Intro Nosework",
    description: "Foundation scent games - builds confidence and mental stimulation",
    objectives: ["enrichment"],
    phase: "phase_a",
    activities: [
      {
        name: "Box search",
        description: "Place 3 boxes/cups. Treat under one. Let puppy sniff to find. 5 reps.",
        durationMinutes: 2,
        objectives: ["enrichment"],
        tips: ["Don't help - let them use their nose", "Celebrate the find!"],
      },
      {
        name: "Room scatter",
        description: "Scatter kibble around room in easy spots. Let puppy hunt.",
        durationMinutes: 2.5,
        objectives: ["enrichment"],
      },
    ],
    totalDuration: 4.5,
  },

  // Outing Sessions - Phase A  
  {
    id: "outing_a_exposure",
    type: "outing",
    name: "World Exposure",
    description: "Controlled exposure to new environments, sounds, and surfaces",
    objectives: ["socialization"],
    phase: "phase_a",
    activities: [
      {
        name: "Environment observation",
        description: "Carry or crate puppy to new environment. Let them observe from safety. Treat for calm attention.",
        durationMinutes: 3,
        objectives: ["socialization"],
        tips: ["Don't flood - watch body language", "Retreat if overwhelmed", "Create positive associations"],
      },
      {
        name: "Surface exploration",
        description: "Let puppy approach and explore novel surfaces at own pace. Mark and treat brave approaches.",
        durationMinutes: 2,
        objectives: ["socialization"],
      },
    ],
    totalDuration: 5,
  },

  // ============================================
  // PHASE B: Formal Training (weeks 9-16, puppy 16-24 weeks)
  // ============================================

  {
    id: "skill_b_shaping",
    type: "skill",
    name: "Shaping Session",
    description: "Use shaping to build behaviors - dog learns to offer behaviors",
    objectives: ["obedience", "enrichment"],
    phase: "phase_b",
    activities: [
      {
        name: "Free shaping",
        description: "Place novel object (box, platform). Mark any interaction. Gradually shape specific behavior (paws on, in, around).",
        durationMinutes: 4,
        objectives: ["obedience", "enrichment"],
        tips: ["Mark tiny approximations at first", "If stuck, lower criteria", "End on success"],
      },
      {
        name: "Position shaping",
        description: "Shape a new position (bow, spin, etc.) without luring. 5-8 successful reps.",
        durationMinutes: 3,
        objectives: ["obedience"],
      },
      {
        name: "Known command practice",
        description: "Run through 3-4 known commands with verbal cue only. Reward heavily.",
        durationMinutes: 2,
        objectives: ["obedience"],
      },
    ],
    totalDuration: 9,
  },
  {
    id: "skill_b_leash",
    type: "skill",
    name: "Loose Leash Walking",
    description: "Foundation for heel work - reward position, penalize pulling",
    objectives: ["obedience"],
    phase: "phase_b",
    activities: [
      {
        name: "Position reward",
        description: "In low distraction area, mark and reward when dog is at your side. Treat at leg height.",
        durationMinutes: 3,
        objectives: ["obedience"],
        tips: ["Reward rate high at first - every 2-3 steps", "Use collar pressure release, not leash jerks"],
      },
      {
        name: "Red light/green light",
        description: "Walk forward. The instant leash tightens, stop. Resume when dog creates slack. 5 minutes.",
        durationMinutes: 4,
        objectives: ["obedience", "impulse_control"],
      },
      {
        name: "U-turn practice",
        description: "When dog gets ahead, turn and walk other direction. Mark when dog catches up. 5 reps.",
        durationMinutes: 2,
        objectives: ["obedience"],
      },
    ],
    totalDuration: 9,
  },
  {
    id: "skill_b_duration",
    type: "skill",
    name: "Duration Building",
    description: "Extend duration of sit, down, and place",
    objectives: ["obedience", "impulse_control"],
    phase: "phase_b",
    activities: [
      {
        name: "Sit duration",
        description: "Cue sit, count silently (1-5 seconds), mark and reward. Gradually extend. 8 reps.",
        durationMinutes: 3,
        objectives: ["obedience", "impulse_control"],
        tips: ["Reward BEFORE dog breaks", "Build duration slowly - 1 second at a time"],
      },
      {
        name: "Down duration",
        description: "Cue down, build to 10-15 seconds. Reward calm stillness.",
        durationMinutes: 3,
        objectives: ["obedience", "impulse_control"],
      },
      {
        name: "Place duration",
        description: "Send to mat/bed. Build duration from 10 sec to 1 minute. Return to reward.",
        durationMinutes: 3,
        objectives: ["obedience", "impulse_control"],
      },
    ],
    totalDuration: 9,
  },
  {
    id: "impulse_b_premack",
    type: "impulse",
    name: "Premack Recalls",
    description: "Use Premack principle - coming away from good thing earns access to it",
    objectives: ["impulse_control", "obedience"],
    phase: "phase_b",
    activities: [
      {
        name: "Mild distraction recall",
        description: "Let dog engage with interesting but not overwhelming item. Call. Reward recall with treat AND return to item.",
        durationMinutes: 4,
        objectives: ["impulse_control", "obedience"],
        tips: ["The reward is BOTH treat and access", "Don't call and end the fun"],
      },
      {
        name: "Toy send and recall",
        description: "Toss toy, let dog get it. Recall. Trade for treat, throw toy again. 5 reps.",
        durationMinutes: 3,
        objectives: ["impulse_control", "obedience"],
      },
      {
        name: "Food bowl recall",
        description: "Send toward food bowl. Call back before they reach it. Reward heavily, then release to bowl.",
        durationMinutes: 2,
        objectives: ["impulse_control"],
      },
    ],
    totalDuration: 9,
  },
  {
    id: "impulse_b_tug_rules",
    type: "impulse",
    name: "Controlled Tug",
    description: "Build strong out/drop cue during high arousal",
    objectives: ["impulse_control", "relationship"],
    phase: "phase_b",
    activities: [
      {
        name: "Tug with out",
        description: "Tug enthusiastically. Say 'Out', freeze completely. Wait for release. Mark and resume tug.",
        durationMinutes: 4,
        objectives: ["impulse_control"],
        tips: ["Your stillness is the cue to stop", "Never pull from mouth", "Reward out with MORE tug"],
      },
      {
        name: "Out and sit",
        description: "Out, wait for sit, then present tug again. 5 reps.",
        durationMinutes: 2.5,
        objectives: ["impulse_control", "obedience"],
      },
      {
        name: "Impulse reps",
        description: "Ask for 2-3 quick behaviors between tug bouts. Sit-down-touch = tug.",
        durationMinutes: 2.5,
        objectives: ["impulse_control", "obedience"],
      },
    ],
    totalDuration: 9,
  },
  {
    id: "play_b_fetch_rules",
    type: "play",
    name: "Fetch with Rules",
    description: "Structured fetch game with impulse control elements",
    objectives: ["relationship", "impulse_control"],
    phase: "phase_b",
    activities: [
      {
        name: "Wait for throw",
        description: "Dog must sit/wait before throw. Gradually extend wait time. 5 throws.",
        durationMinutes: 3,
        objectives: ["impulse_control"],
      },
      {
        name: "Return practice",
        description: "Encourage full return by running backwards. Trade for treat, throw again.",
        durationMinutes: 4,
        objectives: ["obedience", "relationship"],
      },
      {
        name: "Drop at feet",
        description: "Shape dropping ball at your feet. Don't throw until ball is delivered. 5 reps.",
        durationMinutes: 2,
        objectives: ["impulse_control"],
      },
    ],
    totalDuration: 9,
  },
  {
    id: "enrichment_b_shaping",
    type: "enrichment",
    name: "Shaping Games",
    description: "Free shaping for enrichment and problem-solving skills",
    objectives: ["enrichment", "obedience"],
    phase: "phase_b",
    activities: [
      {
        name: "101 things with a box",
        description: "Place box. Click any new interaction. See how many behaviors dog offers.",
        durationMinutes: 5,
        objectives: ["enrichment"],
        tips: ["Click novel behaviors", "Don't lure or help", "It's about creativity"],
      },
      {
        name: "Problem solving puzzle",
        description: "Use intermediate puzzle feeder (Nina Ottosson or similar).",
        durationMinutes: 4,
        objectives: ["enrichment"],
      },
    ],
    totalDuration: 9,
  },
  {
    id: "outing_b_public",
    type: "outing",
    name: "Public Outing",
    description: "Practice in public with mild distractions",
    objectives: ["socialization", "obedience"],
    phase: "phase_b",
    activities: [
      {
        name: "Settle practice",
        description: "At outdoor cafe or park bench, practice settle on mat. Reward calm. 5 minutes.",
        durationMinutes: 5,
        objectives: ["socialization", "impulse_control"],
      },
      {
        name: "Walking with distractions",
        description: "Loose leash walking past people, dogs (at distance). High reward rate.",
        durationMinutes: 4,
        objectives: ["obedience", "socialization"],
      },
    ],
    totalDuration: 9,
  },

  // ============================================
  // PHASE C: Adolescence (weeks 17-36, dog 24-44 weeks)
  // ============================================

  {
    id: "skill_c_proofing",
    type: "skill",
    name: "Proofing Session",
    description: "Add distance, duration, and distraction to known behaviors",
    objectives: ["obedience", "proofing"],
    phase: "phase_c",
    activities: [
      {
        name: "Distance work",
        description: "Cue sit/down from increasing distances. Start 3 feet, build to 15+.",
        durationMinutes: 4,
        objectives: ["obedience", "proofing"],
        tips: ["Return to reward, don't call dog to you", "If fails, decrease distance"],
      },
      {
        name: "Duration under distraction",
        description: "Hold position while you walk around, drop toys, have helper walk by.",
        durationMinutes: 5,
        objectives: ["obedience", "proofing", "impulse_control"],
      },
      {
        name: "Rapid position changes",
        description: "Sit-down-stand-sit-down in quick succession. 3 rounds.",
        durationMinutes: 3,
        objectives: ["obedience"],
      },
    ],
    totalDuration: 12,
  },
  {
    id: "skill_c_heel",
    type: "skill",
    name: "Formal Heel",
    description: "Build competition-style heel position",
    objectives: ["obedience"],
    phase: "phase_c",
    activities: [
      {
        name: "Position feeding",
        description: "In heel position, deliver treats at exact head height. 15-20 reps while walking.",
        durationMinutes: 4,
        objectives: ["obedience"],
        tips: ["Treat placement creates position", "Left hip, exact position"],
      },
      {
        name: "Turns and pace changes",
        description: "Practice left turns, right turns, about turns, fast and slow pace.",
        durationMinutes: 5,
        objectives: ["obedience"],
      },
      {
        name: "Halt and auto-sit",
        description: "Stop walking, dog auto-sits at heel. 8 reps.",
        durationMinutes: 3,
        objectives: ["obedience"],
      },
    ],
    totalDuration: 12,
  },
  {
    id: "impulse_c_emergency",
    type: "impulse",
    name: "Emergency Behaviors",
    description: "Build emergency stop and recall - potentially life-saving",
    objectives: ["impulse_control", "obedience"],
    phase: "phase_c",
    activities: [
      {
        name: "Down in motion",
        description: "While walking, cue down. Build to jogging, then running. Reward heavily.",
        durationMinutes: 5,
        objectives: ["impulse_control", "obedience"],
        tips: ["Start slow and build speed gradually", "Use hand signal too", "Massive rewards"],
      },
      {
        name: "Recall with chase",
        description: "Let dog chase toy. Call mid-chase. Reward recall by resuming chase.",
        durationMinutes: 4,
        objectives: ["impulse_control", "obedience"],
      },
      {
        name: "Leave it advanced",
        description: "Leave it with food on ground, toys rolling, other dog nearby (distance).",
        durationMinutes: 3,
        objectives: ["impulse_control"],
      },
    ],
    totalDuration: 12,
  },
  {
    id: "play_c_advanced_tug",
    type: "play",
    name: "Advanced Tug Training",
    description: "Use tug as reward for complex behaviors",
    objectives: ["relationship", "obedience", "impulse_control"],
    phase: "phase_c",
    activities: [
      {
        name: "Behavior chain to tug",
        description: "Heel-sit-down-hand touch = TUG REWARD. 5 chains.",
        durationMinutes: 5,
        objectives: ["obedience", "relationship"],
      },
      {
        name: "Out under arousal",
        description: "Intense tug, out cue, dog must settle quickly for resumption.",
        durationMinutes: 4,
        objectives: ["impulse_control"],
      },
      {
        name: "Tug with position cues",
        description: "During tug, cue sit or down. Dog must comply without out cue first. 5 reps.",
        durationMinutes: 3,
        objectives: ["impulse_control", "obedience"],
      },
    ],
    totalDuration: 12,
  },
  {
    id: "enrichment_c_advanced",
    type: "enrichment",
    name: "Advanced Enrichment",
    description: "Complex puzzles and nosework progressions",
    objectives: ["enrichment"],
    phase: "phase_c",
    activities: [
      {
        name: "Container search",
        description: "Hide treat in one of 6-8 containers. Dog must indicate correct one.",
        durationMinutes: 5,
        objectives: ["enrichment"],
      },
      {
        name: "Room hide and seek",
        description: "You hide, call dog. Reward finding you with play.",
        durationMinutes: 4,
        objectives: ["enrichment", "relationship"],
      },
      {
        name: "Complex puzzle",
        description: "Advanced puzzle toy with multiple steps.",
        durationMinutes: 4,
        objectives: ["enrichment"],
      },
    ],
    totalDuration: 13,
  },
  {
    id: "outing_c_challenging",
    type: "outing",
    name: "Challenging Environment",
    description: "Practice in busy, distracting environments",
    objectives: ["socialization", "proofing"],
    phase: "phase_c",
    activities: [
      {
        name: "Busy sidewalk work",
        description: "Heel or loose leash in busy area. High value rewards for focus.",
        durationMinutes: 6,
        objectives: ["obedience", "socialization"],
      },
      {
        name: "Dog park exterior",
        description: "Practice at distance from dog park. Focus and calm despite excitement.",
        durationMinutes: 5,
        objectives: ["impulse_control", "socialization"],
        tips: ["Don't go inside - work on fence line", "Reward check-ins heavily"],
      },
    ],
    totalDuration: 11,
  },

  // ============================================
  // PHASE D: Young Adult (weeks 37+, dog 44+ weeks)
  // ============================================

  {
    id: "skill_d_offleash",
    type: "skill",
    name: "Off-Leash Reliability",
    description: "Build reliable off-leash obedience",
    objectives: ["obedience", "proofing"],
    phase: "phase_d",
    activities: [
      {
        name: "Long line fades",
        description: "Use long line dragging, then remove. Practice all commands.",
        durationMinutes: 7,
        objectives: ["obedience", "proofing"],
        tips: ["Only in safe, enclosed areas at first", "Have backup recall if needed"],
      },
      {
        name: "Distance handling",
        description: "Send to place from 30+ feet. Recall from distance. Position cues at distance.",
        durationMinutes: 6,
        objectives: ["obedience", "proofing"],
      },
      {
        name: "Distraction proofing",
        description: "Off-leash work past people, dogs, wildlife (at safe distance).",
        durationMinutes: 5,
        objectives: ["obedience", "proofing", "impulse_control"],
      },
    ],
    totalDuration: 18,
  },
  {
    id: "skill_d_competition",
    type: "skill",
    name: "Competition Prep",
    description: "Polish behaviors for competition or testing",
    objectives: ["obedience"],
    phase: "phase_d",
    activities: [
      {
        name: "Run-through",
        description: "Complete obedience pattern: heel, halt, stay, recall, finish.",
        durationMinutes: 8,
        objectives: ["obedience"],
      },
      {
        name: "Ring simulation",
        description: "Practice with someone giving commands, in unfamiliar location.",
        durationMinutes: 6,
        objectives: ["obedience", "proofing"],
      },
      {
        name: "Weak spot drilling",
        description: "Identify and drill any weak behaviors.",
        durationMinutes: 4,
        objectives: ["obedience"],
      },
    ],
    totalDuration: 18,
  },
  {
    id: "impulse_d_ultimate",
    type: "impulse",
    name: "Ultimate Impulse Control",
    description: "Highest level impulse control challenges",
    objectives: ["impulse_control"],
    phase: "phase_d",
    activities: [
      {
        name: "Recall from play",
        description: "Off-leash recall from playing with other dogs.",
        durationMinutes: 6,
        objectives: ["impulse_control", "obedience"],
        tips: ["Build slowly over months", "Always release back to play after recall"],
      },
      {
        name: "Extended settle",
        description: "30-minute down-stay in busy environment (cafe patio, park).",
        durationMinutes: 8,
        objectives: ["impulse_control"],
      },
      {
        name: "Leave it - high value",
        description: "Leave it with real meat, rolling balls, or other dogs (at distance).",
        durationMinutes: 4,
        objectives: ["impulse_control"],
      },
    ],
    totalDuration: 18,
  },
  {
    id: "enrichment_d_sport",
    type: "enrichment",
    name: "Sport Foundation",
    description: "Foundation skills for dog sports (agility, nosework, etc.)",
    objectives: ["enrichment", "obedience"],
    phase: "phase_d",
    activities: [
      {
        name: "Obstacle introduction",
        description: "Introduce low obstacles: jumps, tunnels, wobble board.",
        durationMinutes: 8,
        objectives: ["enrichment"],
      },
      {
        name: "Formal nosework",
        description: "Search for specific scent (birch oil) in containers.",
        durationMinutes: 6,
        objectives: ["enrichment"],
      },
      {
        name: "Handler focus games",
        description: "Build drive to work with you despite distractions.",
        durationMinutes: 4,
        objectives: ["relationship", "obedience"],
      },
    ],
    totalDuration: 18,
  },
  {
    id: "outing_d_anywhere",
    type: "outing",
    name: "Any Environment",
    description: "Proof behaviors in any environment",
    objectives: ["socialization", "proofing"],
    phase: "phase_d",
    activities: [
      {
        name: "Novel environment work",
        description: "Full obedience routine in completely new location.",
        durationMinutes: 10,
        objectives: ["obedience", "proofing"],
      },
      {
        name: "Real-world scenarios",
        description: "Practice specific scenarios: vet visit, groomer, cafe, store.",
        durationMinutes: 8,
        objectives: ["socialization", "obedience"],
      },
    ],
    totalDuration: 18,
  },
];

/**
 * Get templates for a specific phase and optional type filter
 */
export function getTemplatesForPhase(
  phase: string, 
  sessionType?: SessionType
): SessionTemplate[] {
  return SESSION_TEMPLATES.filter((t) => 
    t.phase === phase && (sessionType === undefined || t.type === sessionType)
  );
}

/**
 * Get a balanced mix of sessions for a week
 * Returns recommended session schedule
 */
export interface DailySessionPlan {
  day: number; // 1-7
  sessions: SessionTemplate[];
}

export interface WeeklySessionSchedule {
  weekNumber: number;
  phase: string;
  sessionsPerDay: number;
  sessionDuration: { min: number; max: number };
  dailyPlans: DailySessionPlan[];
  notes: string[];
}

/**
 * Get Week 1 templates by ID
 */
function getWeek1Template(id: string): SessionTemplate | undefined {
  return SESSION_TEMPLATES.find((t) => t.id === id);
}

/**
 * Generate Week 1 schedule - special decompression/settling focus
 * Based on veterinary behaviorist research
 */
function generateWeek1Schedule(): WeeklySessionSchedule {
  // Week 1 daily schedule - carefully planned for decompression
  // Day 1: Minimal - arrival and crate intro only
  // Days 2-6: Gradually add sessions
  // Day 7: Light day
  
  const week1DailyTemplates: string[][] = [
    // Day 1: Just arrival/settling and crate intro (2 sessions)
    ["settle_a_arrival", "settle_a_crate_intro"],
    // Day 2: Crate and potty foundations (2 sessions)
    ["settle_a_crate_intro", "settle_a_potty"],
    // Day 3: Add handling (3 sessions)
    ["settle_a_crate_intro", "settle_a_potty", "settle_a_handling"],
    // Day 4: Name game and sounds (3 sessions)
    ["settle_a_crate_intro", "settle_a_name", "settle_a_sounds"],
    // Day 5: Handling and surfaces (3 sessions)
    ["settle_a_potty", "settle_a_handling", "settle_a_surfaces"],
    // Day 6: Name game and settling (3 sessions)
    ["settle_a_name", "settle_a_relax", "settle_a_crate_intro"],
    // Day 7: Light day - settling and surfaces (2 sessions)
    ["settle_a_relax", "settle_a_surfaces"],
  ];
  
  const dailyPlans: DailySessionPlan[] = week1DailyTemplates.map((templateIds, index) => {
    const sessions = templateIds
      .map((id) => getWeek1Template(id))
      .filter((t): t is SessionTemplate => t !== undefined);
    
    return {
      day: index + 1,
      sessions,
    };
  });
  
  return {
    weekNumber: 1,
    phase: "phase_a",
    sessionsPerDay: 2, // Average for Week 1
    sessionDuration: { min: 3, max: 20 }, // Variable - some are longer settling sessions
    dailyPlans,
    notes: [
      "WEEK 1 FOCUS: Decompression and trust building - NOT obedience",
      "This is about helping puppy feel safe in their new home",
      "No visitors for the first few days",
      "Let puppy set the pace - don't overwhelm",
      "Potty schedule is critical: after meals, naps, play, and every 2-3 hours",
      "Crate training is a marathon, not a sprint",
      "Watch for stress signs: whale eye, hiding, trembling, refusing treats",
    ],
  };
}

/**
 * Generate a balanced weekly session schedule
 */
export function generateWeeklySessionSchedule(
  weekNumber: number,
  aggressiveness: number = 3
): WeeklySessionSchedule {
  // Week 1 is special - decompression/settling focus
  if (weekNumber === 1) {
    return generateWeek1Schedule();
  }
  
  const phase = getPhaseForWeek(weekNumber);
  const params = SESSION_PARAMS_BY_PHASE[phase];
  const sessionsPerDay = getSessionsPerDay(params.sessionsPerDay, aggressiveness);
  
  // For Phase A weeks 2-8, exclude Week 1 templates (those with weekRange [1,1])
  const templates = getTemplatesForPhase(phase).filter((t) => {
    if (t.weekRange) {
      const [minWeek, maxWeek] = t.weekRange;
      return weekNumber >= minWeek && weekNumber <= maxWeek;
    }
    return true; // No weekRange means available for all weeks in phase
  });
  
  // Count templates by type
  const byType = templates.reduce((acc, t) => {
    acc[t.type] = acc[t.type] || [];
    acc[t.type].push(t);
    return acc;
  }, {} as Record<SessionType, SessionTemplate[]>);
  
  // Build a balanced week
  // Priority: skill (core training) > impulse > play > enrichment > outing
  const dailyPlans: DailySessionPlan[] = [];
  
  for (let day = 1; day <= 7; day++) {
    const daySessions: SessionTemplate[] = [];
    
    // Day 7 can be lighter (rest day for dog)
    const daySessionCount = day === 7 ? Math.max(1, sessionsPerDay - 1) : sessionsPerDay;
    
    // Distribute session types throughout week
    // Skill sessions: daily
    // Impulse: every other day
    // Play: daily (short)
    // Enrichment: 3-4x per week
    // Outing: 2-3x per week
    
    const sessionTypes: SessionType[] = [];
    
    // First session of day: skill (most important)
    if (byType.skill?.length > 0) {
      sessionTypes.push("skill");
    }
    
    // Second session varies
    if (daySessionCount >= 2) {
      if (day % 2 === 0 && byType.impulse?.length > 0) {
        sessionTypes.push("impulse");
      } else if (byType.play?.length > 0) {
        sessionTypes.push("play");
      }
    }
    
    // Third session: enrichment or outing
    if (daySessionCount >= 3) {
      if ([1, 3, 5].includes(day) && byType.enrichment?.length > 0) {
        sessionTypes.push("enrichment");
      } else if ([2, 4, 6].includes(day) && byType.outing?.length > 0) {
        sessionTypes.push("outing");
      } else if (byType.enrichment?.length > 0) {
        sessionTypes.push("enrichment");
      }
    }
    
    // Fourth+ sessions: mix
    if (daySessionCount >= 4) {
      sessionTypes.push(byType.play?.length > 0 ? "play" : "skill");
    }
    if (daySessionCount >= 5) {
      sessionTypes.push(byType.enrichment?.length > 0 ? "enrichment" : "impulse");
    }
    
    // Pick specific templates
    for (const type of sessionTypes) {
      const available = byType[type] || [];
      if (available.length > 0) {
        // Rotate through templates
        const templateIndex = (day - 1 + daySessions.length) % available.length;
        daySessions.push(available[templateIndex]);
      }
    }
    
    dailyPlans.push({ day, sessions: daySessions });
  }
  
  // Generate notes for this phase
  const notes: string[] = [];
  if (phase === "phase_a") {
    notes.push("Keep sessions short and fun - puppy brain tires quickly");
    notes.push("End every session on a success, even if you have to make it easier");
    notes.push("Socialization is the priority during this phase");
  } else if (phase === "phase_b") {
    notes.push("Can start adding verbal cues to lured behaviors now");
    notes.push("Begin impulse control work in earnest");
    notes.push("Watch for adolescent regression - stay patient");
  } else if (phase === "phase_c") {
    notes.push("Adolescent brain testing boundaries - stay consistent");
    notes.push("Focus on proofing known behaviors rather than adding new ones");
    notes.push("Exercise before training sessions to take edge off energy");
  } else if (phase === "phase_d") {
    notes.push("Can expect more duration and reliability now");
    notes.push("Good time to start sport-specific training");
    notes.push("Continue reinforcing basics - never stop rewarding");
  }
  
  return {
    weekNumber,
    phase,
    sessionsPerDay,
    sessionDuration: { min: params.minDuration, max: params.maxDuration },
    dailyPlans,
    notes,
  };
}

/**
 * Get total training minutes per week based on schedule
 */
export function getWeeklyTrainingMinutes(schedule: WeeklySessionSchedule): number {
  const avgDuration = (schedule.sessionDuration.min + schedule.sessionDuration.max) / 2;
  const totalSessions = schedule.dailyPlans.reduce((sum, d) => sum + d.sessions.length, 0);
  return Math.round(avgDuration * totalSessions);
}
