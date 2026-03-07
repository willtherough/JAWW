// services/library/Vol9_Business.js

export const BUSINESS_CARDS = [
  // --- STRATEGY (The Mindset) ---
  {
    id: 'bus-pareto-v1',
    title: 'Business: The Pareto Principle',
    author: 'Biz Ops',
    category: 'BUSINESS',
    tags: ['strategy', 'efficiency', 'mental_model'],
    body: `The 80/20 Rule.

80% of your results come from 20% of your efforts.
- 80% of revenue comes from 20% of clients.
- 80% of headaches come from 20% of employees.

ACTION:
Ruthlessly identify the "Vital Few" (the 20%) and double down on them.
Ruthlessly identify the "Trivial Many" (the 80%) and eliminate or automate them.`,
    genesis: { signature: 'sig_bus_01' },
    history: []
  },
  {
    id: 'bus-moat-v1',
    title: 'Business: Economic Moats',
    author: 'Biz Ops',
    category: 'BUSINESS',
    tags: ['strategy', 'investing', 'competition'],
    body: `A business without a moat is just a commodity.

TYPES OF MOATS (Defense against competition):
1. NETWORK EFFECT: The product gets better as more people use it (e.g., Facebook, The Source).
2. SWITCHING COSTS: It is too painful to leave (e.g., Apple Ecosystem).
3. BRAND: People pay more for the name (e.g., Nike).
4. COST ADVANTAGE: You can produce it cheaper than anyone else (e.g., Costco).

If you are starting a business, define your moat immediately.`,
    genesis: { signature: 'sig_bus_02' },
    history: []
  },

  // --- OPERATIONS (The Machine) ---
  {
    id: 'bus-profit-margin-v1',
    title: 'Finance: Gross vs. Net',
    author: 'CFO Ops',
    category: 'BUSINESS',
    tags: ['finance', 'accounting', 'profit'],
    body: `Revenue is Vanity. Profit is Sanity. Cash is Reality.

GROSS MARGIN:
(Revenue - Cost of Goods Sold).
This measures how efficient your product is. If this is low, you don't have a business; you have a charity.

NET MARGIN:
(Gross Margin - Operating Expenses like Rent/Salaries).
This is what you actually keep.

Cash Flow kills businesses faster than lack of profit. You can be profitable on paper but go bankrupt because your clients haven't paid you yet.`,
    genesis: { signature: 'sig_bus_03' },
    history: []
  },
  {
    id: 'bus-supply-chain-v1',
    title: 'Ops: JIT vs. Safety Stock',
    author: 'Logistics Ops',
    category: 'BUSINESS',
    tags: ['logistics', 'risk', 'supply_chain'],
    body: `Modern business loves JIT (Just-In-Time).
- Pros: Low inventory costs.
- Cons: One disruption breaks the whole chain (e.g., 2020 Pandemic).

RESILIENCE STRATEGY:
Carry "Safety Stock."
It costs money to store extra parts/materials, but it is "Insurance Premium" against supply chain collapse.
Redundancy is not inefficiency; it is survival.`,
    genesis: { signature: 'sig_bus_04' },
    history: []
  },

  // --- NEGOTIATION (The Deal) ---
  {
    id: 'bus-batna-v1',
    title: 'Negotiation: BATNA',
    author: 'Deal Ops',
    category: 'BUSINESS',
    tags: ['negotiation', 'psychology', 'strategy'],
    body: `Best Alternative To a Negotiated Agreement.

Before you walk into a room, you must know: "What do I do if I walk away?"
- If your BATNA is strong (e.g., "I have another job offer"), you have leverage.
- If your BATNA is weak (e.g., "I will be homeless"), you are desperate.

Never reveal your BATNA unless it helps you. Always try to discover the other side's BATNA.`,
    genesis: { signature: 'sig_bus_05' },
    history: []
  },
  {
    id: 'bus-sales-funnel-v1',
    title: 'Sales: The AIDA Model',
    author: 'Sales Ops',
    category: 'BUSINESS',
    tags: ['sales', 'marketing', 'psychology'],
    body: `The universal funnel for moving a human to action.

A - ATTENTION: Stop the scroll. (Hook).
I - INTEREST: "Here is the problem you have."
D - DESIRE: "Here is how my solution fixes it and makes your life better."
A - ACTION: "Click here to buy."

If sales are low, diagnose where the funnel is broken. (e.g., High traffic but no clicks? Your Interest/Desire is weak).`,
    genesis: { signature: 'sig_bus_06' },
    history: []
  },

  // --- LEGAL (The Shield) ---
  {
    id: 'bus-llc-v1',
    title: 'Legal: The Corporate Veil',
    author: 'Legal Ops',
    category: 'BUSINESS',
    tags: ['legal', 'structure', 'defense'],
    body: `An LLC (Limited Liability Company) creates a wall between YOU and the BUSINESS.

THE VEIL:
If the business gets sued or goes bankrupt, they can take the business assets, but they generally cannot take your house or personal car.

PIERCING THE VEIL:
If you mix funds (paying personal groceries with the business card), a judge can declare the LLC a "sham" and let creditors attack your personal assets.
Keep. Accounts. Separate.`,
    genesis: { signature: 'sig_bus_07' },
    history: []
  },
  {
    id: 'bus-contract-v1',
    title: 'Legal: Get It In Writing',
    author: 'Legal Ops',
    category: 'BUSINESS',
    tags: ['legal', 'contracts', 'freelance'],
    body: `A verbal contract is worth the paper it's written on.

THE SCOPE OF WORK (SOW):
Define exactly what "Done" looks like.
- "Build a website" (Bad. Vague).
- "Build a 5-page site with contact form and dark mode" (Good).

THE KILL FEE:
Always include a clause: "If the project is cancelled by the client, 50% of the remaining fee is due immediately." This protects your time.`,
    genesis: { signature: 'sig_bus_08' },
    history: []
  }
];