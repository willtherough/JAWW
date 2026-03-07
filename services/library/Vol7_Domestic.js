// services/library/Vol7_Domestic.js

export const DOMESTIC_CARDS = [
  // --- COOKING SCIENCE (The Chemistry) ---
  {
    id: 'dom-maillard-v1',
    title: 'Cooking: Maillard Reaction',
    author: 'Chef Ops',
    category: 'DOMESTIC',
    tags: ['cooking', 'science', 'flavor'],
    body: `Flavor is chemistry. The "Brown" is the flavor.

THE REACTION:
At roughly 300°F (150°C), amino acids (proteins) and sugars react to create new flavor compounds. This is the difference between "Boiled" (gray/bland) and "Seared" (brown/rich).

RULES:
1. DRY THE MEAT: Water boils at 212°F. You cannot get to 300°F until the water is gone. Pat steak dry before searing.
2. HIGH HEAT: Use cast iron or stainless steel. Non-stick pans often degrade at high heat.
3. DON'T CROWD: Crowding the pan traps steam -> Water -> No browning.`,
    genesis: { signature: 'sig_dom_01' },
    history: []
  },
  {
    id: 'dom-salt-v1',
    title: 'Cooking: Salt Function',
    author: 'Chef Ops',
    category: 'DOMESTIC',
    tags: ['cooking', 'seasoning', 'basics'],
    body: `Salt is not a spice; it is a flavor amplifier.

FUNCTION:
It suppresses bitterness, allowing sweetness and umami to shine.
It draws out moisture (curing).
It denatures proteins (brining).

WHEN TO SALT:
- Meat: 40 minutes BEFORE cooking (allows salt to penetrate) OR immediately before. Do not salt 10 mins before (draws moisture to surface -> steam).
- Veggies: After cooking (to keep crunch) or before (to soften/sweat).
- Pasta Water: "Salty like the sea." It's the only chance to season the noodle itself.`,
    genesis: { signature: 'sig_dom_02' },
    history: []
  },
  {
    id: 'dom-knife-skills-v1',
    title: 'Cooking: The Claw Grip',
    author: 'Chef Ops',
    category: 'DOMESTIC',
    tags: ['cooking', 'skills', 'safety'],
    body: `The most dangerous tool in the kitchen is the one you hold wrong.

THE CLAW:
1. Hold the food with your non-dominant hand.
2. Curl your fingers INWARD like a claw.
3. Tuck your thumb BEHIND your fingers.
4. Rest the side of the knife blade against your knuckles.

Your knuckles act as a guide. The blade can never cut your fingertips because they are tucked away.`,
    genesis: { signature: 'sig_dom_03' },
    history: []
  },

  // --- PRESERVATION (The Pantry) ---
  {
    id: 'dom-canning-botulism-v1',
    title: 'Canning: Botulism Safety',
    author: 'Home Econ',
    category: 'DOMESTIC',
    tags: ['canning', 'safety', 'bacteria'],
    body: `Clostridium Botulinum creates a neurotoxin that paralyzes and kills. It thrives in anaerobic (no oxygen) environments like jars.

THE RULE:
- HIGH ACID (pH < 4.6): Fruits, Pickles, Tomatoes. Safe for Water Bath Canning (212°F). Acid kills the spores.
- LOW ACID (pH > 4.6): Meat, Veggies, Beans. MUST use a Pressure Canner (240°F). Boiling water is NOT hot enough to kill the spores.

Never taste food from a leaking, bulging, or spurting jar. "When in doubt, throw it out."`,
    genesis: { signature: 'sig_dom_04' },
    history: []
  },
  {
    id: 'dom-ferment-v1',
    title: 'Preservation: Lacto-Fermentation',
    author: 'Home Econ',
    category: 'DOMESTIC',
    tags: ['preservation', 'health', 'bacteria'],
    body: `Controlled decay using "Good" bacteria (Lactobacillus).

THE FORMULA:
Vegetables + Salt + Water = Pickles/Sauerkraut.

1. SALT BRINE: usually 2% to 3% salt by weight of water.
2. SUBMERGE: Veggies must be completely under the brine. (Mold grows in air; Bacteria grow in brine).
3. WAIT: Bacteria eat the sugars and produce Lactic Acid (Sour taste). Acid preserves the food for months.

Gut Health: Unlike vinegar pickles, fermented foods are alive (Probiotic).`,
    genesis: { signature: 'sig_dom_05' },
    history: []
  },

  // --- GARDENING (The Soil) ---
  {
    id: 'dom-soil-npk-v1',
    title: 'Gardening: N-P-K Ratio',
    author: 'Agri Ops',
    category: 'DOMESTIC',
    tags: ['gardening', 'soil', 'chemistry'],
    body: `Fertilizer bags have three numbers (e.g., 10-10-10).

N - NITROGEN (Green): Leaf growth. (Good for Grass, Spinach, Lettuce).
P - PHOSPHORUS (Roots/Fruit): Root development and flower/fruit set. (Good for Tomatoes, Carrots).
K - POTASSIUM (General): Overall health and disease resistance.

DEFICIENCY SIGNS:
- Yellow Leaves: Lack of Nitrogen.
- Purple Leaves: Lack of Phosphorus.
- Burnt Edges: Lack of Potassium.`,
    genesis: { signature: 'sig_dom_06' },
    history: []
  },
  {
    id: 'dom-compost-v1',
    title: 'Gardening: Compost Ratio',
    author: 'Agri Ops',
    category: 'DOMESTIC',
    tags: ['gardening', 'waste', 'soil'],
    body: `Turn garbage into gold.

GREENS (Nitrogen):
- Kitchen scraps, grass clippings, coffee grounds.
- Wet and smelly.

BROWNS (Carbon):
- Dry leaves, cardboard, paper, sawdust.
- Dry and fluffy.

RATIO: 30:1 (Carbon to Nitrogen).
Roughly 2 parts Brown to 1 part Green by volume.
If it smells like rot: Add Browns.
If it's too dry/slow: Add Greens and Water.
Turn the pile to add Oxygen (Heat comes from bacteria breathing).`,
    genesis: { signature: 'sig_dom_07' },
    history: []
  },
  {
    id: 'dom-seeds-v1',
    title: 'Gardening: Seed Saving',
    author: 'Agri Ops',
    category: 'DOMESTIC',
    tags: ['gardening', 'seeds', 'sovereignty'],
    body: `You cannot save seeds from "Hybrid" (F1) plants; they won't grow true.

HEIRLOOM / OPEN-POLLINATED:
Plants that produce stable offspring. You MUST grow these to be self-reliant.

HOW TO SAVE:
- Tomatoes: Squeeze pulp into jar. Let ferment 3 days (scum forms). Rinse and dry.
- Beans/Peas: Let pods dry brown on the vine until they rattle.
- Storage: Cool, Dark, Dry. (Frozen seeds last 10+ years).`,
    genesis: { signature: 'sig_dom_08' },
    history: []
  }
];