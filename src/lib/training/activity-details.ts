/**
 * Detailed activity instructions for training goals
 * These provide in-depth explanations of how to perform each activity
 */

export interface ActivityDetail {
  title: string;
  shortDescription: string;
  purpose: string;
  steps: string[];
  tips: string[];
  duration: string;
  frequency: string;
  prerequisites?: string[];
  videoUrl?: string;
}

/**
 * T4 Impulse Control Activities
 */
export const impulseControlActivities: Record<string, ActivityDetail> = {
  "It's Yer Choice": {
    title: "It's Yer Choice",
    shortDescription: "Practice treat-in-fist impulse control, 5 successful reps",
    purpose: "Teaches the dog that self-control (backing away from desired items) is what earns rewards. This foundational exercise builds impulse control that transfers to all other training.",
    steps: [
      "Hold a treat in your closed fist at the dog's nose level",
      "Let the dog sniff, lick, and paw at your hand - say nothing",
      "The moment the dog backs away or looks up at you, mark ('Yes!') and open your hand",
      "Let the dog take the treat from your open palm",
      "Repeat, gradually requiring longer pauses before marking",
      "Progress to holding your fist lower, then on the ground, then open palm on ground"
    ],
    tips: [
      "Never pull your hand away - let the dog make the choice",
      "Keep sessions short (2-3 minutes) to maintain enthusiasm",
      "If the dog gets frustrated, make it easier by marking sooner",
      "Once mastered with treats, practice with toys and food bowls"
    ],
    duration: "2-3 minutes",
    frequency: "2-3 times daily during foundation phase"
  },

  "Zen Bowl": {
    title: "Zen Bowl",
    shortDescription: "Wait for food bowl placement, 5 successful reps",
    purpose: "Builds patience around high-value items (food) and establishes that calmness, not excitement, earns access to rewards.",
    steps: [
      "Hold the food bowl at chest height while dog is in a sit",
      "Begin lowering the bowl slowly toward the ground",
      "If the dog moves from sit, immediately raise the bowl back up",
      "When dog maintains sit, continue lowering",
      "Place bowl on ground and pause - dog must remain seated",
      "Release with 'Okay!' or your release word, then dog may eat"
    ],
    tips: [
      "Start with an empty or low-value bowl if needed",
      "Lower very slowly at first - speed comes with practice",
      "Don't say 'stay' - the sit position is the cue to wait",
      "Practice at every meal to build consistency"
    ],
    duration: "1-2 minutes per meal",
    frequency: "Every meal"
  },

  "Door Patience": {
    title: "Door Patience",
    shortDescription: "Wait at door 5 seconds before release",
    purpose: "Prevents door dashing (a safety issue) and teaches that patience at thresholds earns access to desired things.",
    steps: [
      "Approach door with dog on leash or in confined space",
      "Ask for sit (optional but helpful at first)",
      "Reach for door handle - if dog moves, remove hand",
      "Slowly open door - close it if dog moves toward opening",
      "When door is open and dog waits, count to 5",
      "Release with 'Okay!' and walk through together"
    ],
    tips: [
      "Start with low-excitement doors (closets) before front door",
      "The opening door is the cue to wait, not a verbal command",
      "Practice on both sides of the door",
      "Gradually increase wait time before release"
    ],
    duration: "1-2 minutes",
    frequency: "Every door transition",
    prerequisites: ["Basic sit"]
  },

  "Premack Recalls": {
    title: "Premack Recalls",
    shortDescription: "Call away from desired item, reward with access",
    purpose: "Uses the Premack Principle: a high-probability behavior (chasing squirrel) can reinforce a low-probability behavior (recall). Coming when called earns access to what the dog wanted.",
    steps: [
      "Allow dog to engage with something mildly interesting (not overwhelming)",
      "Call dog's name + 'Come!' in an upbeat voice",
      "When dog comes, mark and reward with high-value treat",
      "Immediately release dog back to the interesting thing",
      "Repeat, gradually increasing difficulty of distractions"
    ],
    tips: [
      "Start with easy distractions you can control (toy on ground)",
      "The reward for coming is BOTH the treat AND returning to the activity",
      "Never call the dog away and end the fun permanently",
      "If dog doesn't come, you're too close to the distraction - increase distance"
    ],
    duration: "5-10 minutes",
    frequency: "Daily during walks/play",
    prerequisites: ["Basic recall in low-distraction environment"]
  },

  "Rapid Position Changes": {
    title: "Rapid Position Changes",
    shortDescription: "Heel-Sit-Heel-Down transitions, 5 reps",
    purpose: "Builds responsiveness and focus during movement. The quick transitions require the dog to pay attention and respond promptly.",
    steps: [
      "Start walking in heel position",
      "Cue 'Sit' - dog should sit immediately at your side",
      "Pause briefly, then resume 'Heel'",
      "After a few steps, cue 'Down'",
      "Pause briefly, then release and resume heel",
      "Repeat sequence, varying the pattern"
    ],
    tips: [
      "Keep energy upbeat - this should be a game",
      "Reward each successful position at first",
      "Gradually fade to rewarding the whole sequence",
      "Practice in different locations to generalize"
    ],
    duration: "3-5 minutes",
    frequency: "2-3 times per training session",
    prerequisites: ["Sit", "Down", "Heel basics"]
  },

  "Controlled Tug": {
    title: "Controlled Tug",
    shortDescription: "Tug with clean release on cue",
    purpose: "Channels prey drive into a controlled game. Teaches dog to engage intensely but stop immediately on cue - critical for impulse control.",
    steps: [
      "Present tug toy and encourage dog to grab it",
      "Play tug enthusiastically for 10-15 seconds",
      "Say 'Out' or 'Drop' and freeze completely - stop all movement",
      "Wait for dog to release (may take time at first)",
      "Mark the release and immediately restart the game as reward",
      "Repeat, expecting faster releases over time"
    ],
    tips: [
      "YOUR stillness cues the end - movement keeps the game going",
      "Never pull the toy out of dog's mouth - wait for voluntary release",
      "If dog won't release, trade for a treat initially",
      "The reward for releasing is MORE TUG, not the end of play"
    ],
    duration: "5-10 minutes",
    frequency: "Daily play sessions",
    prerequisites: ["Basic 'take it' or grab behavior"]
  },

  "Off-leash Recall from Play": {
    title: "Off-leash Recall from Play",
    shortDescription: "Recall away from playing dogs",
    purpose: "The ultimate recall test - calling your dog away from the most exciting thing (other dogs). This is built gradually through the Premack approach.",
    steps: [
      "Start at distance from play group or use long line",
      "Call dog during a natural pause in play",
      "Run backwards excitedly if needed to encourage chase",
      "Mark and reward heavily when dog reaches you",
      "Release dog back to play immediately",
      "Gradually call during more exciting moments"
    ],
    tips: [
      "Don't attempt until recall is solid in lower distractions",
      "Practice at the END of play sessions when dog is slightly tired",
      "Use a long line for safety until reliable",
      "Never call and then leave - recall should predict MORE fun"
    ],
    duration: "Practice during play sessions",
    frequency: "2-3 recalls per play session",
    prerequisites: ["Solid recall with distractions", "Premack recalls"]
  },

  "Emergency Stop Mid-chase": {
    title: "Emergency Stop Mid-chase",
    shortDescription: "Down at distance during movement",
    purpose: "A potentially life-saving behavior. The dog learns to drop immediately on cue, even when running. Could prevent running into traffic or other dangers.",
    steps: [
      "Build a strong 'Down' in stationary position first",
      "Practice 'Down' while walking slowly - reward heavily",
      "Increase speed gradually - walking to jogging to running",
      "Add distance: cue 'Down' while dog is ahead of you",
      "Practice during chase games (you running away)",
      "Proof with exciting distractions"
    ],
    tips: [
      "This takes months to build reliably - don't rush",
      "The hand signal (arm raised) may become more reliable than verbal",
      "Practice on soft surfaces when dog is running",
      "Reward HEAVILY every success - this is a hard behavior"
    ],
    duration: "5-10 minutes",
    frequency: "Daily during training phase",
    prerequisites: ["Solid stationary down", "Down from walking"]
  },

  "Place During Distractions": {
    title: "Place During Distractions",
    shortDescription: "Maintain place during doorbell/visitors",
    purpose: "Creates a reliable behavior for exciting situations like visitors arriving. Dog learns that 'Place' means stay there regardless of what's happening.",
    steps: [
      "Establish solid 'Place' behavior with duration first",
      "Add mild distractions while dog is on place (drop toy)",
      "Practice with doorbell sounds at low volume",
      "Have helper knock/ring while you're near dog",
      "Gradually move further from dog during distractions",
      "Practice actual door answering with leash backup"
    ],
    tips: [
      "Use a visible mat or bed so boundaries are clear",
      "Duration first, then distractions - don't combine too soon",
      "Reward dog ON the place, don't call off to reward",
      "If dog breaks, calmly return them - no punishment"
    ],
    duration: "5-15 minutes",
    frequency: "Daily, especially before expected visitors",
    prerequisites: ["Solid 'Place' command", "30+ second duration"]
  },

  "Off-leash Heel Past Distractions": {
    title: "Off-leash Heel Past Distractions",
    shortDescription: "Maintain heel past cats/squirrels",
    purpose: "The ultimate test of focus and impulse control - maintaining position and attention while prey animals are visible. Requires extensive foundation work.",
    steps: [
      "Master on-leash heel past distractions first",
      "Practice off-leash in enclosed areas",
      "Introduce low-level distractions (people) off-leash",
      "Gradually increase to higher distractions",
      "Use 'Leave it' as needed, but goal is automatic focus",
      "Always have leash ready for safety during proofing"
    ],
    tips: [
      "This is an advanced behavior - don't rush the foundation",
      "High-value rewards (real meat) for difficult moments",
      "Set up for success - start far from distractions",
      "If dog breaks, return to on-leash and reduce difficulty"
    ],
    duration: "10-15 minutes",
    frequency: "During walks in challenging environments",
    prerequisites: ["Solid on-leash heel", "Reliable 'Leave it'", "Good focus around distractions"]
  },

  "Extended Down-Stay": {
    title: "Extended Down-Stay",
    shortDescription: "30-minute down in busy environment",
    purpose: "Builds a dog who can settle anywhere. Essential for restaurant patios, waiting rooms, or any situation requiring calm presence over time.",
    steps: [
      "Build duration in quiet environment first (5 min → 10 → 20 → 30)",
      "Add mild environmental stimulation (TV, music)",
      "Practice in new locations with short duration",
      "Gradually extend duration in new locations",
      "Work up to busy environments (cafe patios)",
      "Use mat for clarity and comfort"
    ],
    tips: [
      "Bring a chew or stuffed Kong for actual settling",
      "Reward CALMLY - excited praise will break the stay",
      "Return to dog to reward, don't call off the stay",
      "Build duration before adding distractions"
    ],
    duration: "Work up to 30+ minutes",
    frequency: "Practice during meals, TV time, outings",
    prerequisites: ["5+ minute down-stay in quiet environment"]
  },

  "Recall from Full-Speed Play": {
    title: "Recall from Full-Speed Play",
    shortDescription: "Return immediately from dog play",
    purpose: "The most challenging recall scenario - interrupting full arousal play with other dogs. Requires extensive foundation and should be the last recall milestone.",
    steps: [
      "Build all prerequisite recall behaviors first",
      "Start calling during natural play pauses",
      "Progress to calling during lower-energy play moments",
      "Gradually call during higher arousal moments",
      "Always release back to play after recall",
      "Use a long line for safety during training"
    ],
    tips: [
      "This can take 6+ months to achieve reliably",
      "Never poison the recall by ending play permanently",
      "Practice with specific play partners you trust",
      "Some days will be easier than others - that's normal"
    ],
    duration: "During play sessions",
    frequency: "2-3 recalls per play session",
    prerequisites: ["Off-leash recall from play", "Premack recalls", "Solid recall in all other contexts"]
  }
};

/**
 * T5 Enrichment Activities
 */
export const enrichmentActivities: Record<string, ActivityDetail> = {
  "Nosework Session": {
    title: "Nosework Session",
    shortDescription: "Snuffle mat or hidden treat search",
    purpose: "Provides mental stimulation through natural scenting behavior. 10 minutes of nosework is as tiring as a 30-minute walk. Great for rainy days or low-energy times.",
    steps: [
      "For snuffle mat: Hide treats throughout the mat fabric",
      "Let dog sniff and find all treats at their own pace",
      "For hide and seek: Start with treats in plain sight",
      "Gradually hide treats behind/under objects",
      "Progress to treats in other rooms",
      "Eventually hide treats while dog waits in another room"
    ],
    tips: [
      "Let the dog work at their own pace - don't rush",
      "Start easy to build confidence",
      "Use smelly treats for easier finding",
      "End before dog gets frustrated"
    ],
    duration: "10-15 minutes",
    frequency: "2-3 times per week minimum"
  },

  "Shaping Session": {
    title: "Shaping Session",
    shortDescription: "Free-shape interaction with novel object",
    purpose: "Encourages problem-solving and creativity. The dog learns that trying new behaviors is rewarding, which builds confidence and engagement in training.",
    steps: [
      "Place a novel object on the floor (box, platform, cone)",
      "Sit nearby with treats ready",
      "Click/mark ANY interaction with the object (look, sniff, touch)",
      "Gradually raise criteria (must touch, must put paw on, etc.)",
      "Let the dog figure out what earns rewards",
      "End with a clear 'win' - don't frustrate the dog"
    ],
    tips: [
      "Timing is critical - mark the INSTANT the desired behavior happens",
      "If dog gets stuck, make criteria easier temporarily",
      "Keep sessions short (3-5 minutes) to maintain thinking",
      "Any interaction counts at first - build from there"
    ],
    duration: "3-5 minutes",
    frequency: "3-4 times per week"
  },

  "Puzzle Feeder": {
    title: "Puzzle Feeder",
    shortDescription: "Feed meal from puzzle toy",
    purpose: "Turns mealtime into mental exercise. Slows eating, prevents boredom, and satisfies the natural foraging instinct that dogs have.",
    steps: [
      "Choose an appropriate puzzle for your dog's skill level",
      "Show dog how it works if needed (demonstrate once)",
      "Let dog work on the puzzle independently",
      "Supervise but don't help unless dog is frustrated",
      "Rotate different puzzles to prevent boredom",
      "Increase difficulty as dog masters each puzzle"
    ],
    tips: [
      "Start with easy puzzles to build confidence",
      "Frozen Kongs count as puzzle feeders",
      "Don't always use the same puzzle",
      "Some dogs need help learning how puzzles work - that's okay"
    ],
    duration: "10-30 minutes depending on puzzle",
    frequency: "Daily - can replace regular bowl feeding"
  }
};

/**
 * Get activity details by title
 * Searches both impulse control and enrichment activities
 */
export function getActivityDetails(title: string): ActivityDetail | null {
  // Normalize title for matching
  const normalizedTitle = title.trim();
  
  // Check impulse control activities
  if (impulseControlActivities[normalizedTitle]) {
    return impulseControlActivities[normalizedTitle];
  }
  
  // Check enrichment activities
  if (enrichmentActivities[normalizedTitle]) {
    return enrichmentActivities[normalizedTitle];
  }
  
  // Try partial matching for activities that might have slight variations
  const allActivities = { ...impulseControlActivities, ...enrichmentActivities };
  for (const [key, value] of Object.entries(allActivities)) {
    if (title.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(title.toLowerCase())) {
      return value;
    }
  }
  
  return null;
}

/**
 * Check if an activity has detailed instructions available
 */
export function hasActivityDetails(title: string): boolean {
  return getActivityDetails(title) !== null;
}
