// services/library/Vol12_Logic.js

export const LOGIC_CARDS = [
  // --- FALLACIES (Bugs in the Code) ---
  {
    id: 'log-fallacy-ad-hom-v1',
    title: 'Fallacy: Ad Hominem',
    author: 'Logic Ops',
    category: 'LOGIC',
    tags: ['logic', 'debate', 'defense'],
    body: `Attacking the person instead of the argument.

EXAMPLE:
"You can't trust his economic plan because he cheated on his wife."
(His infidelity is irrelevant to the math of his plan).

DEFENSE:
Ignore the insult. Pivot back to the data. "My character is not the topic; the data is. Can you refute the data?"`,
    genesis: { signature: 'sig_log_01' },
    history: []
  },
  {
    id: 'log-fallacy-straw-v1',
    title: 'Fallacy: Straw Man',
    author: 'Logic Ops',
    category: 'LOGIC',
    tags: ['logic', 'debate', 'media'],
    body: `Distorting an opponent's argument to make it easier to defeat.

EXAMPLE:
Person A: "We should relax zoning laws to build more houses."
Person B: "So you want to destroy all our historic neighborhoods and put skyscrapers everywhere?"

DEFENSE:
"That is not what I said. Stop arguing against a position I do not hold. Here is my actual position..."`,
    genesis: { signature: 'sig_log_02' },
    history: []
  },
  {
    id: 'log-fallacy-sunk-v1',
    title: 'Fallacy: Sunk Cost',
    author: 'Logic Ops',
    category: 'LOGIC',
    tags: ['logic', 'money', 'decisions'],
    body: `Throwing good money after bad.

THE TRAP:
"I've already spent $10,000 fixing this car; I can't sell it now."
(The $10k is gone. It is irrelevant. The only question is: Is this car worth keeping moving forward?)

RULE:
Decisions should be based on Future Value, not Past Cost.`,
    genesis: { signature: 'sig_log_03' },
    history: []
  },

  // --- MENTAL MODELS (The Frameworks) ---
  {
    id: 'log-model-first-princ-v1',
    title: 'Model: First Principles',
    author: 'Logic Ops',
    category: 'LOGIC',
    tags: ['thinking', 'innovation', 'strategy'],
    body: `Boiling a problem down to the fundamental truths.

ANALOGY:
Cook: Follows a recipe (Authority). If they lose the recipe, they can't cook.
Chef: Understands heat + acid + fat (First Principles). Can cook anything without a recipe.

APPLICATION:
Don't ask "How do others do it?" (Analogy).
Ask "What is physically possible?" (First Principles). Elon Musk used this to build rockets cheaper than NASA.`,
    genesis: { signature: 'sig_log_04' },
    history: []
  },
  {
    id: 'log-model-occam-v1',
    title: 'Model: Occam\'s Razor',
    author: 'Logic Ops',
    category: 'LOGIC',
    tags: ['thinking', 'science', 'simplicity'],
    body: `The simplest explanation is usually the correct one.

SCENARIO:
You hear hoofbeats.
Theory A: It's a horse.
Theory B: It's a zebra that escaped the zoo, painted itself brown, and learned to gallop like a horse.

Both *could* be true. But Theory A requires fewer assumptions. Bet on the horse.`,
    genesis: { signature: 'sig_log_05' },
    history: []
  },
  {
    id: 'log-model-hanlon-v1',
    title: 'Model: Hanlon\'s Razor',
    author: 'Logic Ops',
    category: 'LOGIC',
    tags: ['thinking', 'psychology', 'relationships'],
    body: `"Never attribute to malice that which is adequately explained by stupidity."

SCENARIO:
Someone cuts you off in traffic.
Reaction A: "He hates me! He's trying to kill me!" (Malice).
Reaction B: "He is distracted and a bad driver." (Stupidity).

Reaction B is usually true and keeps you calm. Reaction A makes you paranoid and angry.`,
    genesis: { signature: 'sig_log_06' },
    history: []
  },

  // --- STRATEGY (The Action) ---
  {
    id: 'log-strat-ooda-v1',
    title: 'Strategy: OODA Loop',
    author: 'Mil Ops',
    category: 'LOGIC',
    tags: ['strategy', 'combat', 'decisions'],
    body: `The decision cycle of a fighter pilot (Col. John Boyd).

O - OBSERVE: Gather data (Look around).
O - ORIENT: Analyze data (What does it mean?).
D - DECIDE: Choose a course of action.
A - ACT: Execute.

LOOP:
Repeat instantly.
Victory goes to the person who can cycle through this loop faster than their opponent. If you are still "Observing" while I am "Acting," you die.`,
    genesis: { signature: 'sig_log_07' },
    history: []
  },
  {
    id: 'log-stoic-control-v1',
    title: 'Stoicism: Dichotomy of Control',
    author: 'Philosophy',
    category: 'LOGIC',
    tags: ['mindset', 'stoicism', 'anxiety'],
    body: `There are only two things in the world:
1. Things you control (Your thoughts, your actions).
2. Things you don't control (Everything else - Weather, Politics, Other people).

THE RULE:
Focus 100% of your energy on #1.
Ignore #2.
Anxiety comes from trying to control #2.`,
    genesis: { signature: 'sig_log_08' },
    history: []
  }
];