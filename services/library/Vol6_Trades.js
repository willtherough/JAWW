// services/library/Vol6_Trades.js

export const TRADE_CARDS = [
  // --- ELECTRICAL (The Spark) ---
  {
    id: 'trade-elec-safety-v1',
    title: 'Electrical: Safety Rules',
    author: 'Trade Ops',
    category: 'TRADES',
    tags: ['electrical', 'safety', 'home'],
    body: `Electricity is invisible and lethal.

1. KILL THE BREAKER: Never work on a "live" wire. Turn off the main breaker if unsure.
2. TEST BEFORE TOUCH: Use a non-contact voltage tester (pen) on the wire to confirm it's dead.
3. LOCK OUT / TAG OUT: Tape the breaker switch "OFF" so nobody flips it while you are working.
4. ONE HAND RULE: Keep one hand in your pocket when near live panels. This prevents current from crossing your heart (Hand-to-Hand).`,
    genesis: { signature: 'sig_trade_01' },
    history: []
  },
  {
    id: 'trade-wire-colors-v1',
    title: 'Electrical: Wire Colors (US)',
    author: 'Trade Ops',
    category: 'TRADES',
    tags: ['electrical', 'wiring', 'standards'],
    body: `Standard 120V Home Wiring:

- BLACK: Hot (Live). Carries power from the panel. Dangerous.
- WHITE: Neutral. Returns current to the source.
- BARE / GREEN: Ground. Safety path for fault current.

CONNECTION:
- Black to Brass (Gold screw).
- White to Silver (Silver screw).
- Green to Ground (Green screw).
"Black on Brass saves your Ass."`,
    genesis: { signature: 'sig_trade_02' },
    history: []
  },
  {
    id: 'trade-amps-volts-v1',
    title: 'Electrical: Amps vs Volts',
    author: 'Trade Ops',
    category: 'TRADES',
    tags: ['electrical', 'physics', 'theory'],
    body: `Think of electricity like water in a pipe.

- VOLTAGE (V): Pressure. (How hard the water is pushing).
- AMPERAGE (A): Flow Rate. (How much water is moving).
- WATTAGE (W): Total Power. (Volts x Amps).

RELATIONSHIP:
High Volts, Low Amps = Stun Gun (Painful but usually safe).
Low Volts, High Amps = Car Battery (Can weld metal).
It is the Current (Amps) crossing the heart that kills.`,
    genesis: { signature: 'sig_trade_03' },
    history: []
  },

  // --- PLUMBING (The Flow) ---
  {
    id: 'trade-plumb-stop-v1',
    title: 'Plumbing: Emergency Shutoff',
    author: 'Trade Ops',
    category: 'TRADES',
    tags: ['plumbing', 'emergency', 'water'],
    body: `If a pipe bursts, you have minutes before massive damage.

LOCATE NOW:
1. MAIN SHUTOFF: Usually where the water line enters the house (Basement/Crawlspace) or at the street meter (requires a 'Key' tool).
2. ISOLATION VALVES: Under every sink and behind every toilet.
3. WATER HEATER: Valve on the cold water inlet (top).

Exercise these valves once a year to ensure they don't seize up.`,
    genesis: { signature: 'sig_trade_04' },
    history: []
  },
  {
    id: 'trade-plumb-trap-v1',
    title: 'Plumbing: P-Trap Logic',
    author: 'Trade Ops',
    category: 'TRADES',
    tags: ['plumbing', 'sanitation', 'theory'],
    body: `The 'U' shape pipe under the sink is a P-Trap.

PURPOSE:
It holds a small amount of water that blocks Sewer Gas (Methane) from coming up the drain into your house.

IF IT SMELLS:
The water likely evaporated (common in guest bathrooms). Run the water for 10 seconds to refill the trap.
IF CLOGGED:
Place bucket under trap -> Unscrew slip nuts -> Clean out debris -> Reassemble (Hand tight).`,
    genesis: { signature: 'sig_trade_05' },
    history: []
  },

  // --- CARPENTRY (The Structure) ---
  {
    id: 'trade-wood-measure-v1',
    title: 'Carpentry: Measure Twice',
    author: 'Trade Ops',
    category: 'TRADES',
    tags: ['carpentry', 'skills', 'basics'],
    body: `"Measure Twice, Cut Once."

THE KERF:
The saw blade has thickness (usually 1/8 inch). This is the "Kerf."
If you measure 10 inches and cut *on* the line, your board will be 9 7/8 inches.
Cut on the WASTE side of the line, leaving the line on your board.`,
    genesis: { signature: 'sig_trade_06' },
    history: []
  },
  {
    id: 'trade-stud-v1',
    title: 'Carpentry: Finding Studs',
    author: 'Trade Ops',
    category: 'TRADES',
    tags: ['carpentry', 'walls', 'hanging'],
    body: `Drywall cannot hold weight. You must anchor into the Stud (2x4 frame).

LOCATION:
- Studs are usually spaced 16 inches "On Center" (OC).
- Look for electrical boxes (they are nailed to studs).
- Knock: Hollow sound = Drywall. Thud sound = Stud.
- Magnet: Find the drywall screws; they are screwed into the studs.`,
    genesis: { signature: 'sig_trade_07' },
    history: []
  },

  // --- ENGINES (The Machine) ---
  {
    id: 'trade-engine-air-v1',
    title: 'Engine: The Combustion Tri',
    author: 'Mech Ops',
    category: 'TRADES',
    tags: ['mechanic', 'engine', 'troubleshoot'],
    body: `If an engine (Car/Generator) won't start, one of three is missing:

1. FUEL: Is there gas? Is it old (bad)? Is the filter clogged?
2. AIR: Is the air filter choked? Is the choke plate stuck?
3. SPARK: Pull the plug. Ground it to the block. Crank. Do you see a blue spark?

90% of small engine problems are CARBURETOR (Fuel) related due to ethanol gas sitting too long.`,
    genesis: { signature: 'sig_trade_08' },
    history: []
  },
  {
    id: 'trade-oil-v1',
    title: 'Engine: Oil Viscosity',
    author: 'Mech Ops',
    category: 'TRADES',
    tags: ['mechanic', 'maintenance', 'fluids'],
    body: `Oil is the blood of the engine.

CODE (e.g., 5W-30):
- 5W: "Winter" (Cold) flow rating. Lower = Thinner in cold.
- 30: Operating temperature thickness.

LOW OIL:
Friction increases -> Heat spikes -> Metal expands -> Engine seizes (Welds itself together).
Check oil every fill-up. Color should be amber, not black sludge.`,
    genesis: { signature: 'sig_trade_09' },
    history: []
  }
];