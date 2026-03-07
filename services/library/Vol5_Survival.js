// services/library/Vol5_Survival.js

export const SURVIVAL_CARDS = [
  // --- WATER (Priority #1) ---
  {
    id: 'surv-water-rule-v1',
    title: 'Survival: Rule of Threes',
    author: 'SERE Ops',
    category: 'SURVIVAL',
    tags: ['survival', 'basics', 'priorities'],
    body: `You can survive:
- 3 MINUTES without Air.
- 3 HOURS without Shelter (in extreme weather).
- 3 DAYS without Water.
- 3 WEEKS without Food.

Do not focus on food until you have Shelter and Water. Hunger hurts, but thirst kills.`,
    genesis: { signature: 'sig_surv_01' },
    history: []
  },
  {
    id: 'surv-water-purify-v1',
    title: 'Water: Purification Methods',
    author: 'SERE Ops',
    category: 'SURVIVAL',
    tags: ['water', 'health', 'skills'],
    body: `Clear water can still kill you (Giardia/Crypto).

1. BOILING: The Gold Standard. Bring to a rolling boil for 1 minute (3 mins at high altitude). Kills everything.
2. CHEMICALS: Bleach (Unscented). 2 drops per liter. Shake and wait 30 mins. If it smells slightly of chlorine, it's safe. If not, add 2 more drops and wait.
3. UV (Sun): Clear plastic bottle in direct sunlight for 6 hours (SODIS method). Only works if water is clear.`,
    genesis: { signature: 'sig_surv_02' },
    history: []
  },

  // --- FIRE (The Tool) ---
  {
    id: 'surv-fire-tri-v1',
    title: 'Fire: The Triangle',
    author: 'Bushcraft',
    category: 'SURVIVAL',
    tags: ['fire', 'physics', 'skills'],
    body: `Fire needs three things. If it fails, one is missing.

1. HEAT: Spark, lighter, friction.
2. FUEL:
   - Tinder (Cotton ball size, dry grass/bark).
   - Kindling (Pencil size).
   - Fuel (Wrist size or larger).
3. OXYGEN: Airflow. Do not smother the fire. Blow gently at the base.

STRUCTURE: Build a "Tipi" or "Log Cabin" to allow oxygen to flow up through the fuel.`,
    genesis: { signature: 'sig_surv_03' },
    history: []
  },
  {
    id: 'surv-ferro-v1',
    title: 'Fire: Ferro Rod Technique',
    author: 'Bushcraft',
    category: 'SURVIVAL',
    tags: ['fire', 'tools', 'skills'],
    body: `Lighters fail. Ferro rods work when wet.

TECHNIQUE:
1. PREP: Scrape a pile of magnesium shavings or fine tinder (birch bark/cotton).
2. ANCHOR: Put the tip of the rod right into the tinder.
3. PULL BACK: Hold the scraper (spine of knife) still and PULL the rod back. This prevents you from smashing your tinder setup.
4. AIM: Throw sparks into the center of the nest.`,
    genesis: { signature: 'sig_surv_04' },
    history: []
  },

  // --- SHELTER (The Shield) ---
  {
    id: 'surv-shelter-loc-v1',
    title: 'Shelter: Site Selection',
    author: 'SERE Ops',
    category: 'SURVIVAL',
    tags: ['shelter', 'safety', 'planning'],
    body: `A bad site will kill you (Widowmakers or Flood).

5 W's of Selection:
1. WIND: Block prevailing wind.
2. WATER: Close, but not TOO close (Flash floods/bugs). Never camp in a dry creek bed.
3. WIDOWMAKERS: Look UP. Dead branches ("Widowmakers") kill campers.
4. WOOD: Availability of fuel.
5. WILDLIFE: Avoid game trails (don't sleep on the highway).`,
    genesis: { signature: 'sig_surv_05' },
    history: []
  },
  {
    id: 'surv-debris-v1',
    title: 'Shelter: Debris Hut',
    author: 'Bushcraft',
    category: 'SURVIVAL',
    tags: ['shelter', 'warmth', 'construction'],
    body: `No tent? Use nature's insulation.

1. RIDGEPOLE: Prop a long sturdy pole against a tree (waist height).
2. RIBS: Lean sticks against the ridgepole to form a tent frame.
3. INSULATION: Pile leaves, grass, pine needles on top.
4. THICKNESS: You need 3 FEET of debris to be waterproof and warm.
5. BEDDING: Fill the inside with dry leaves to insulate you from the cold ground.

Your body heat warms the small space.`,
    genesis: { signature: 'sig_surv_06' },
    history: []
  },

  // --- NAVIGATION (The Map) ---
  {
    id: 'surv-nav-sun-v1',
    title: 'Nav: Sun Compass',
    author: 'Scout Ops',
    category: 'SURVIVAL',
    tags: ['navigation', 'sun', 'direction'],
    body: `The sun rises in the East and sets in the West.

SHADOW STICK METHOD:
1. Plant a stick in the ground. Mark the tip of the shadow with a stone (West).
2. Wait 15 minutes. Mark the new shadow tip (East).
3. Draw a line between the stones. This is the East-West line.
4. Stand with the first mark (West) to your Left. You are facing North.`,
    genesis: { signature: 'sig_surv_07' },
    history: []
  },
  {
    id: 'surv-nav-star-v1',
    title: 'Nav: Finding North (Stars)',
    author: 'Scout Ops',
    category: 'SURVIVAL',
    tags: ['navigation', 'stars', 'night'],
    body: `Northern Hemisphere only.

1. Find the BIG DIPPER (Ursa Major). It looks like a ladle.
2. Find the two stars at the end of the ladle's cup ("Pointer Stars").
3. Draw an imaginary line through them and extend it out 5 times the distance.
4. You will hit POLARIS (The North Star). It is the tip of the handle of the Little Dipper.

Polaris is the only star that does not move. It is always True North.`,
    genesis: { signature: 'sig_surv_08' },
    history: []
  },
  {
    id: 'surv-pace-v1',
    title: 'Nav: Pace Count',
    author: 'Land Nav',
    category: 'SURVIVAL',
    tags: ['navigation', 'distance', 'math'],
    body: `How far have you walked?

1. Measure 100 meters/yards on flat ground.
2. Walk it naturally. Count every time your LEFT foot hits the ground.
3. This is your "Pace Count" (Average is 60-70).

USE:
Tie knots in a cord ("Ranger Beads") every 100m.
If you know the lake is 2km away, and you walk 2km (20 knots) and don't see it, stop. You missed it.`,
    genesis: { signature: 'sig_surv_09' },
    history: []
  }
];