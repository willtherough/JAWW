// services/library/Vol8_Finance.js

export const FINANCE_CARDS = [
  // --- MONETARY THEORY (The System) ---
  {
    id: 'fin-fiat-v1',
    title: 'Finance: Fiat vs. Hard Money',
    author: 'Econ Ops',
    category: 'FINANCE',
    tags: ['money', 'economics', 'history'],
    body: `Money is a measuring stick for value.

HARD MONEY (Gold, Bitcoin):
- Supply is constrained by physics/math.
- Cannot be printed at will.
- Maintains purchasing power over centuries.

FIAT MONEY (USD, Euro, Yen):
- Supply is controlled by a Central Bank.
- Can be printed endlessly ("Quantitative Easing").
- History shows all fiat currencies eventually return to their intrinsic value: Zero.

Store your savings in Hard Money. Conduct business in Fiat.`,
    genesis: { signature: 'sig_fin_01' },
    history: []
  },
  {
    id: 'fin-inflation-v1',
    title: 'Finance: Inflation is Tax',
    author: 'Econ Ops',
    category: 'FINANCE',
    tags: ['money', 'inflation', 'government'],
    body: `Inflation is not "prices going up." It is the "buying power of money going down."

CAUSE:
When the government prints more money than the economy produces in goods, the extra money chases the same goods. Prices rise.

THE EFFECT:
It is a hidden tax on savers. If inflation is 5% and your bank pays 0.1%, you are losing 4.9% of your wealth every year.
You cannot "save" your way to wealth in a fiat currency; you must invest in assets (Stocks, Real Estate, Commodities).`,
    genesis: { signature: 'sig_fin_02' },
    history: []
  },

  // --- WEALTH BUILDING (The Math) ---
  {
    id: 'fin-rule-72-v1',
    title: 'Finance: Rule of 72',
    author: 'Wall St Ops',
    category: 'FINANCE',
    tags: ['math', 'investing', 'growth'],
    body: `How long does it take to double your money?

THE FORMULA:
72 divided by Interest Rate = Years to Double.

EXAMPLES:
- Savings Account (1% return): 72 / 1 = 72 Years. (You will be dead).
- Stock Market Avg (8% return): 72 / 8 = 9 Years.
- High Risk (12% return): 72 / 12 = 6 Years.

Compound interest is the "Eighth Wonder of the World." Time in the market > Timing the market.`,
    genesis: { signature: 'sig_fin_03' },
    history: []
  },
  {
    id: 'fin-emergency-v1',
    title: 'Finance: The Emergency Fund',
    author: 'Fin Ops',
    category: 'FINANCE',
    tags: ['budget', 'security', 'basics'],
    body: `You are not an investor until you are secure.

THE MOAT:
Keep 3-6 months of basic living expenses in CASH (High Yield Savings Account).
- Do not invest this.
- Do not touch this.
- It is insurance against job loss, medical emergency, or car repair.

Without this buffer, a single bad event forces you to sell your investments at the wrong time or go into debt.`,
    genesis: { signature: 'sig_fin_04' },
    history: []
  },
  {
    id: 'fin-debt-snowball-v1',
    title: 'Debt: Avalanche vs. Snowball',
    author: 'Fin Ops',
    category: 'FINANCE',
    tags: ['debt', 'strategy', 'psychology'],
    body: `Two ways to kill debt:

1. AVALANCHE (Mathematical):
Pay minimums on everything. Throw all extra cash at the HIGHEST INTEREST rate debt.
- Result: You pay less total interest.

2. SNOWBALL (Psychological):
Pay minimums on everything. Throw all extra cash at the SMALLEST BALANCE.
- Result: You eliminate a loan quickly. The "Win" motivates you to attack the next one.

If you lack discipline, use Snowball. If you are a robot, use Avalanche.`,
    genesis: { signature: 'sig_fin_05' },
    history: []
  },

  // --- ASSET PROTECTION ---
  {
    id: 'fin-diversify-v1',
    title: 'Investing: Asset Allocation',
    author: 'Fin Ops',
    category: 'FINANCE',
    tags: ['investing', 'risk', 'portfolio'],
    body: `Don't put all eggs in one basket.

THE "PERMANENT PORTFOLIO" CONCEPT (Harry Browne):
- 25% Stocks (Prosperity).
- 25% Cash (Recession).
- 25% Gold (Inflation).
- 25% Long-Term Bonds (Deflation).

This is a defensive strategy designed to survive any economic season. While you don't need to copy it exactly, you must own assets that zig when others zag.`,
    genesis: { signature: 'sig_fin_06' },
    history: []
  },
  {
    id: 'fin-btc-custody-v1',
    title: 'Bitcoin: Cold Storage',
    author: 'Crypto Ops',
    category: 'FINANCE',
    tags: ['bitcoin', 'security', 'crypto'],
    body: `If you hold Bitcoin on an exchange (Coinbase), you do not own Bitcoin. You own a promise.

COLD STORAGE:
Moving the keys offline onto a hardware device (Trezor/Coldcard).
- The device never touches the internet.
- You press physical buttons to sign a transaction.
- It is immune to hackers unless they physically steal the device AND your PIN.

This is the only way to be your own bank.`,
    genesis: { signature: 'sig_fin_07' },
    history: []
  }
];