// services/library/Vol2_Medical.js

export const MED_CARDS = [
  // --- TRAUMA / STOP THE BLEED ---
  {
    id: 'med-march-v1',
    title: 'Trauma: MARCH Algorithm',
    author: 'Tac Med',
    category: 'MEDICAL',
    tags: ['trauma', 'triage', 'emergency'],
    body: `In massive trauma, treat in this order or the patient dies.

M - MASSIVE HEMORRHAGE: Stop the bleeding. (Tourniquets, Pressure).
A - AIRWAY: Clear obstruction. (Chin lift, recovery position).
R - RESPIRATION: Seal chest wounds. (Occlusive dressing).
C - CIRCULATION: Check pulse, treat for shock (Warmth).
H - HYPOTHERMIA / HEAD: Keep them warm. Evaluate consciousness.

Start with M. If they bleed out, A and R do not matter.`,
    genesis: { signature: 'sig_med_01' },
    history: []
  },
  {
    id: 'med-tq-v1',
    title: 'Trauma: Tourniquet Application',
    author: 'Tac Med',
    category: 'MEDICAL',
    tags: ['bleeding', 'skills', 'tools'],
    body: `Use for bright red, spurting blood on limbs (arms/legs).

1. HIGH AND TIGHT: Place TQ as high on the limb as possible (above the wound).
2. TIGHTEN: Crank the windlass until the bleeding STOPS. It will be extremely painful.
3. LOCK: Secure the rod.
4. TIME: Mark the time on the TQ (e.g., T=1430).

WARNING: Never loosen a TQ once applied. Only a doctor removes it. Improvised TQs (belts) rarely work; use a real CAT or SOFT-T.`,
    genesis: { signature: 'sig_med_02' },
    history: []
  },
  {
    id: 'med-shock-v1',
    title: 'Trauma: Shock (Hypovolemic)',
    author: 'Tac Med',
    category: 'MEDICAL',
    tags: ['diagnosis', 'critical', 'physiology'],
    body: `Shock kills after the bleeding stops. It is lack of blood flow to organs.

SIGNS:
- Pale, cool, clammy skin.
- Fast, weak pulse.
- Confusion / Anxiety.
- Rapid breathing.

TREATMENT:
1. Stop bleeding (already done).
2. LAY FLAT: Raise legs 6-12 inches (Trendelenburg position) to keep blood in the core.
3. WARMTH: Remove wet clothes, wrap in blankets/mylar. Hypothermia prevents blood clotting.
4. NO FLUIDS BY MOUTH.`,
    genesis: { signature: 'sig_med_03' },
    history: []
  },

  // --- CARDIAC / RESPIRATORY ---
  {
    id: 'med-cpr-v1',
    title: 'Medical: CPR Basics',
    author: 'Red Cross',
    category: 'MEDICAL',
    tags: ['cpr', 'heart', 'skills'],
    body: `If unresponsive and NOT breathing:

1. CALL 911.
2. HANDS: Center of chest, nipple line. Interlock fingers.
3. PUSH: Hard and Fast. 2 inches deep. 100-120 beats per minute (Tempo of "Stayin' Alive").
4. RATIO: 30 Compressions : 2 Breaths.
5. REPEAT: Do not stop until EMS arrives or you are physically exhausted.

*Hands-Only CPR (no breaths) is effective and better than doing nothing.*`,
    genesis: { signature: 'sig_med_04' },
    history: []
  },
  {
    id: 'med-stroke-v1',
    title: 'Medical: Stroke ID (FAST)',
    author: 'Neurology',
    category: 'MEDICAL',
    tags: ['diagnosis', 'brain', 'time_sensitive'],
    body: `Time is Brain. You have <3 hours for effective treatment.

F - FACE: Ask them to smile. Does one side droop?
A - ARMS: Raise both arms. Does one drift down?
S - SPEECH: Repeat a phrase. Is it slurred?
T - TIME: Call 911 immediately. Note the time symptoms started.

Do not give aspirin (if it's a bleeding stroke, aspirin kills them).`,
    genesis: { signature: 'sig_med_05' },
    history: []
  },
  {
    id: 'med-heart-attack-v1',
    title: 'Medical: Heart Attack (MI)',
    author: 'Cardiology',
    category: 'MEDICAL',
    tags: ['diagnosis', 'heart', 'drugs'],
    body: `Symptoms: Chest pressure ("Elephant on chest"), radiating pain to left arm/jaw, nausea, sweat.

ACTION:
1. Call 911.
2. ASPIRIN: Chew 1 full adult aspirin (325mg) or 4 baby aspirin. (Anti-platelet).
3. NITRO: If they have a prescription for Nitroglycerin, assist them in taking it.
4. REST: Keep patient sitting up and calm to reduce heart workload.`,
    genesis: { signature: 'sig_med_06' },
    history: []
  },

  // --- WOUND CARE / BURNS ---
  {
    id: 'med-burns-v1',
    title: 'Wounds: Burn Classification',
    author: 'Burn Unit',
    category: 'MEDICAL',
    tags: ['burns', 'treatment', 'triage'],
    body: `1st DEGREE (Sunburn): Red, painful. Aloe/Cool water.
2nd DEGREE (Blistering): Painful, wet. Do NOT pop blisters. Cover with sterile non-stick pad.
3rd DEGREE (Charred/White): Painless (nerves dead), leathery.

TREATMENT:
1. Stop the burning process.
2. Remove jewelry (swelling happens fast).
3. Cover loosely with clean, dry cloth (or plastic wrap for transport).
4. KEEP WARM. Burn patients lose heat rapidly.`,
    genesis: { signature: 'sig_med_07' },
    history: []
  },
  {
    id: 'med-infection-v1',
    title: 'Wounds: Infection Signs',
    author: 'Field Med',
    category: 'MEDICAL',
    tags: ['wounds', 'sepsis', 'monitoring'],
    body: `Monitor every wound daily.

SIGNS OF INFECTION:
- Redness spreading from edges.
- Heat (hot to touch).
- Swelling/Pain increasing.
- Pus (yellow/green fluid).
- Red streaks going up the limb (Sepsis warning).

TREATMENT (Field):
- Hot salt water soaks (draws out infection).
- Keep open/draining (do not seal shut).
- Antibiotics if available.`,
    genesis: { signature: 'sig_med_08' },
    history: []
  },
  {
    id: 'med-dental-v1',
    title: 'Medical: Dental Emergency',
    author: 'Dentist',
    category: 'MEDICAL',
    tags: ['teeth', 'pain', 'infection'],
    body: `Toothache can incapacitate.

KNOCKED OUT TOOTH:
1. Pick up by CROWN (top), never the root.
2. Rinse gently (don't scrub).
3. Re-insert into socket if possible.
4. If not, store in milk or inside cheek (saliva).
5. See dentist <1 hour.

ABSCESS (Swelling/Pain):
- This is an infection. Salt water rinse.
- Clove Oil (Eugenol) for pain relief.
- Antibiotics are required to prevent spread to brain/heart.`,
    genesis: { signature: 'sig_med_09' },
    history: []
  },

  // --- PEDIATRIC ---
  {
    id: 'med-peds-fever-v1',
    title: 'Pediatric: Fever Mngt',
    author: 'Pediatrics',
    category: 'MEDICAL',
    tags: ['kids', 'fever', 'drugs'],
    body: `Fever is a defense mechanism. Treat the child, not the number.

WARNING SIGNS:
- Stiff neck (Meningitis).
- Lethargic/Unresponsive.
- Rash that doesn't fade when pressed (Glass Test).
- Under 3 months old (>100.4°F is an emergency).

DOSING:
- Tylenol (Acetaminophen) and Motrin (Ibuprofen) can be alternated every 3-4 hours to keep fever down.
- HYDRATION is critical. Pedialyte/Gatorade.`,
    genesis: { signature: 'sig_med_10' },
    history: []
  },
  {
    id: 'med-choking-v1',
    title: 'Pediatric: Choking (Heimlich)',
    author: 'Peds ER',
    category: 'MEDICAL',
    tags: ['kids', 'airway', 'emergency'],
    body: `INFANT (<1 Year):
1. Face down on your forearm, head lower than body.
2. 5 Back Blows (between shoulder blades).
3. Flip over. 5 Chest Thrusts (2 fingers, center of chest).
4. Repeat.

CHILD (>1 Year):
1. Stand behind. Arms around waist.
2. Fist above belly button.
3. Thrust IN and UP (J-motion).
4. If they pass out, start CPR. Look for object in mouth only if you can see it.`,
    genesis: { signature: 'sig_med_11' },
    history: []
  }
];