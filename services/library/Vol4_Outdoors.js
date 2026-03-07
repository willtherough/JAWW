// services/library/Vol4_Outdoors.js

export const OUTDOOR_CARDS = [
  // --- HUNTING & TRACKING ---
  {
    id: 'out-track-v1',
    title: 'Tracking: Sign Cutting',
    author: 'Scout Ops',
    category: 'OUTDOORS',
    tags: ['hunting', 'tracking', 'skills'],
    body: `Tracking is not magic; it is noticing disturbance.

THE SIGN:
- Flattened grass (shine differs from standing grass).
- Broken twigs (fresh breaks are light; old are dark/oxidized).
- Transfer (mud on a rock, water on a dry leaf).

THE TECHNIQUE:
Don't look at your feet. Look 10-20 yards ahead.
Keep the "Light Source" between you and the track (shadows reveal depth).
"Cut Sign": If you lose the trail, move in a large circle until you find the exit path.`,
    genesis: { signature: 'sig_out_01' },
    history: []
  },
  {
    id: 'out-shot-v1',
    title: 'Hunting: Shot Placement (Deer)',
    author: 'Hunter Ed',
    category: 'OUTDOORS',
    tags: ['hunting', 'ethics', 'anatomy'],
    body: `An ethical kill is instant. A bad shot wastes meat and causes suffering.

THE ENGINE ROOM (Broadside):
Aim just behind the front shoulder, 1/3 up from the belly line.
Targets: Heart and Lungs.
Result: Massive hemorrhage. Animal runs <50 yards and expires.

THE NECK/HEAD:
High risk of wounding (jaw/throat). Do not take this shot unless you are a marksman and the range is close.

WAIT: After the shot, wait 30 minutes before tracking. Pushing a wounded animal makes it run for miles.`,
    genesis: { signature: 'sig_out_02' },
    history: []
  },
  {
    id: 'out-dress-v1',
    title: 'Hunting: Field Dressing',
    author: 'Hunter Ed',
    category: 'OUTDOORS',
    tags: ['hunting', 'processing', 'meat'],
    body: `Heat and Bacteria are the enemy. Get the guts out immediately.

1. POSITION: Head uphill.
2. INCISION: Cut the skin from pelvic bone to sternum. Do NOT puncture the stomach/guts (smell ruins meat). Use two fingers under the knife tip to lift skin.
3. REMOVE: Cut the windpipe. Roll the animal to dump the entrails.
4. COOL: Prop the chest cavity open with a stick to allow airflow.

If above 40°F, you must skin and quarter the animal quickly to cool the meat.`,
    genesis: { signature: 'sig_out_03' },
    history: []
  },

  // --- FISHING ---
  {
    id: 'out-fish-knots-v1',
    title: 'Fishing: The Palomar Knot',
    author: 'Angler Ops',
    category: 'OUTDOORS',
    tags: ['fishing', 'knots', 'skills'],
    body: `The strongest knot for braided line. Near 100% knot strength.

1. DOUBLE the line and pass the loop through the hook eye.
2. TIE an overhand knot with the doubled line (hook hanging loose).
3. PASS the loop over the entire hook.
4. WET the line (saliva) and pull tight.
5. TRIM the tag end.

If you only learn one fishing knot, this is it. It never slips.`,
    genesis: { signature: 'sig_out_04' },
    history: []
  },
  {
    id: 'out-fish-read-v1',
    title: 'Fishing: Reading Water',
    author: 'Angler Ops',
    category: 'OUTDOORS',
    tags: ['fishing', 'strategy', 'rivers'],
    body: `Fish are lazy. They want maximum food for minimum energy.

LOOK FOR:
1. SEAMS: The line where fast water meets slow water. Fish sit in the slow water and snatch food floating in the fast lane.
2. EDDIES: Swirling water behind a rock.
3. STRUCTURE: Fallen trees, undercut banks. (Safety).

If it's sunny, fish deep or in shade. If it's cloudy/dawn/dusk, they hunt the shallows.`,
    genesis: { signature: 'sig_out_05' },
    history: []
  },

  // --- PRESERVATION (The Harvest) ---
  {
    id: 'out-cure-v1',
    title: 'Preservation: Salt Curing',
    author: 'Homestead Ops',
    category: 'OUTDOORS',
    tags: ['food', 'preservation', 'survival'],
    body: `Salt removes moisture. No moisture = No bacteria = No rot.

DRY CURE (Jerky/Biltong):
1. Slice meat thin (with the grain for chew, against for tender).
2. Coat completely in salt (and pepper/coriander).
3. Hang in a cool, dry, breezy place with airflow.
4. Ready when it bends and cracks but doesn't break.

Need approx 2-3% salt by weight for safety. Nitrates (Curing Salt #1) are needed for long-term storage (botulism prevention).`,
    genesis: { signature: 'sig_out_06' },
    history: []
  },
  {
    id: 'out-smoke-v1',
    title: 'Preservation: Smoking Meat',
    author: 'Homestead Ops',
    category: 'OUTDOORS',
    tags: ['food', 'preservation', 'cooking'],
    body: `Smoke is a chemical preservative and fly repellent.

COLD SMOKE (<100°F):
Preserves meat (days/weeks). Does not cook it. Used for bacon/hams after curing.

HOT SMOKE (225°F):
Cooks meat. Adds flavor but does NOT preserve it long-term (needs refrigeration).

WOODS:
- Hardwoods only (Oak, Hickory, Fruit woods).
- NEVER use softwoods (Pine, Cedar) - the resin is toxic and tastes terrible.`,
    genesis: { signature: 'sig_out_07' },
    history: []
  },

  // --- TOOLS ---
  {
    id: 'out-knife-v1',
    title: 'Tools: Knife Sharpening',
    author: 'Bushcraft',
    category: 'OUTDOORS',
    tags: ['tools', 'maintenance', 'skills'],
    body: `A dull knife is dangerous (it slips).

THE ANGLE:
Maintain 20 degrees (matchbook cover height).

THE MOTION:
"Slice a thin layer off the stone."
Push the blade forward across the stone, heel to tip.
Do equal reps on both sides (e.g., 10 left, 10 right).

THE BURR:
You are removing metal until you feel a tiny "lip" (burr) on the opposite edge. If you don't raise a burr, you haven't sharpened it yet.
Strop on leather to finish.`,
    genesis: { signature: 'sig_out_08' },
    history: []
  }
];