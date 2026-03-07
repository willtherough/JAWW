// services/library/Vol3_Physiology.js

export const PHYS_CARDS = [
  // --- METABOLIC HEALTH (The Engine) ---
  {
    id: 'phys-insulin-v1',
    title: 'Physiology: Insulin Resistance',
    author: 'Metabolic Ops',
    category: 'PHYSIOLOGY',
    tags: ['health', 'diet', 'diabetes'],
    body: `Insulin is the storage hormone. When you eat sugar/carbs, Insulin rises to store energy.
    
THE TRAP:
If you eat sugar constantly (snacking), Insulin never drops. Cells stop listening to the signal. This is "Resistance."
Result: High blood sugar + High Insulin = Inflammation, Fat Gain, Type 2 Diabetes, Alzheimer's (Type 3 Diabetes).

THE FIX:
1. Eat less frequently (Intermittent Fasting).
2. Reduce processed carbs.
3. Lift weights (Muscle eats glucose without needing as much insulin).`,
    genesis: { signature: 'sig_phys_01' },
    history: []
  },
  {
    id: 'phys-fasting-v1',
    title: 'Physiology: Autophagy',
    author: 'Metabolic Ops',
    category: 'PHYSIOLOGY',
    tags: ['health', 'fasting', 'longevity'],
    body: `"Self-Eating."
    
When you don't eat for 16+ hours, your body switches from "Growth Mode" to "Repair Mode."
It recycles old, damaged proteins and cleans out junk cells. This is cellular spring cleaning.

PROTOCOL (16:8):
- Skip breakfast. Eat only between 12pm and 8pm.
- Drink Black Coffee/Water/Tea (No calories) during the fast.
- This lowers baseline insulin and triggers repair.`,
    genesis: { signature: 'sig_phys_02' },
    history: []
  },
  {
    id: 'phys-hydration-v1',
    title: 'Physiology: Electrolytes',
    author: 'Sports Med',
    category: 'PHYSIOLOGY',
    tags: ['hydration', 'performance', 'salt'],
    body: `Water is not enough. You need Salt.
    
Hydration = Water + Electrolytes (Sodium, Potassium, Magnesium).
If you drink gallons of plain water without salt, you dilute your blood (Hyponatremia), which can kill you.

HOMEMADE ELECTROLYTE DRINK:
- 1 Liter Water.
- 1/2 tsp Sea Salt (Sodium).
- 1/4 tsp NoSalt/LiteSalt (Potassium).
- Squeeze of Lemon (Flavor).
Drink this first thing in the morning and before workouts.`,
    genesis: { signature: 'sig_phys_03' },
    history: []
  },

  // --- EXERCISE (The Frame) ---
  {
    id: 'phys-zone2-v1',
    title: 'Training: Zone 2 Cardio',
    author: 'Perf Ops',
    category: 'PHYSIOLOGY',
    tags: ['fitness', 'heart', 'endurance'],
    body: `Zone 2 is the foundation of endurance and mitochondrial health.
    
THE INTENSITY:
- You should be able to hold a conversation, but it should feel slightly strained.
- "Conversational Pace."
- Heart Rate approx: 180 minus your Age.

BENEFIT:
It builds mitochondria (the power plants of the cell). High intensity (Zone 5) burns sugar; Zone 2 trains your body to burn FAT for fuel.
Dose: 3-4 hours per week.`,
    genesis: { signature: 'sig_phys_04' },
    history: []
  },
  {
    id: 'phys-strength-v1',
    title: 'Training: Strength Standards',
    author: 'Perf Ops',
    category: 'PHYSIOLOGY',
    tags: ['fitness', 'strength', 'longevity'],
    body: `Muscle is the "Organ of Longevity." It protects bones and regulates glucose.

BASELINE STANDARDS (Healthy Male / Female):
- Deadlift: 1.5x Bodyweight / 1x BW.
- Squat: 1.25x Bodyweight / 0.75x BW.
- Pushups: 30 continuous / 10 continuous.
- Hang: 60 seconds (Grip strength correlates with heart health).

If you cannot do this, you are "Under-Muscled" and frail. Prioritize strength over cardio until met.`,
    genesis: { signature: 'sig_phys_05' },
    history: []
  },

  // --- SLEEP (The Recovery) ---
  {
    id: 'phys-sleep-v1',
    title: 'Sleep: The 3-2-1 Rule',
    author: 'Neuro Ops',
    category: 'PHYSIOLOGY',
    tags: ['sleep', 'recovery', 'brain'],
    body: `Sleep is when you clean the brain (Glymphatic System). Missing sleep causes permanent damage.

THE PROTOCOL (3-2-1):
- 3 Hours before bed: No Food. (Digestion ruins deep sleep).
- 2 Hours before bed: No Work/Stress.
- 1 Hour before bed: No Screens (Blue light kills Melatonin).

ENVIRONMENT:
- Pitch Black (Tape over LEDs).
- Cold (65-68°F).
- Quiet (White noise if needed).`,
    genesis: { signature: 'sig_phys_06' },
    history: []
  },
  {
    id: 'phys-light-v1',
    title: 'Sleep: Morning Sunlight',
    author: 'Neuro Ops',
    category: 'PHYSIOLOGY',
    tags: ['sleep', 'hormones', 'circadian'],
    body: `Your sleep timer starts in the MORNING.
    
- View sunlight (outdoors, not through a window) within 30 mins of waking.
- This sets your Circadian Rhythm (Cortisol spike now -> Melatonin release 12 hours later).
- 10 mins on sunny days, 30 mins on cloudy days.
- Never wear sunglasses during this morning view.`,
    genesis: { signature: 'sig_phys_07' },
    history: []
  },

  // --- NUTRITION (The Fuel) ---
  {
    id: 'phys-protein-v1',
    title: 'Nutrition: Protein Leverage',
    author: 'Nutrition Ops',
    category: 'PHYSIOLOGY',
    tags: ['diet', 'macros', 'muscle'],
    body: `Your body craves protein. It will make you keep eating until you get enough.
    
THE LEVERAGE HYPOTHESIS:
If you eat low-protein food (chips), you overeat calories trying to find amino acids.
If you eat high-protein food (steak/eggs), you feel full instantly.

GOAL: 1 gram of protein per pound of target bodyweight.
- Eat the protein FIRST on your plate.`,
    genesis: { signature: 'sig_phys_08' },
    history: []
  },
  {
    id: 'phys-seedoils-v1',
    title: 'Nutrition: The "Hateful Eight"',
    author: 'Nutrition Ops',
    category: 'PHYSIOLOGY',
    tags: ['diet', 'inflammation', 'toxins'],
    body: `Industrial Seed Oils (Vegetable Oils) are highly inflammatory and unstable. They were originally engine lubricants.

AVOID:
Canola, Corn, Cottonseed, Soy, Sunflower, Safflower, Grapeseed, Rice Bran.

EAT:
Butter, Tallow, Ghee, Olive Oil, Coconut Oil, Avocado Oil.

Check labels. "Healthy" salad dressings are usually 90% Soybean oil.`,
    genesis: { signature: 'sig_phys_09' },
    history: []
  }
];