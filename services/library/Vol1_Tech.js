// services/library/Seed_Tech.js

export const TECH_CARDS = [
  // --- COMPUTER SCIENCE (The Language) ---
  {
    id: 'cs-binary-v1',
    title: 'CS 101: Binary & Bits',
    author: 'The Source',
    category: 'TECHNOLOGY',
    tags: ['cs', 'basics', 'logic'],
    body: `At the bottom of reality, there is only ON (1) and OFF (0).

- BIT: A single 1 or 0.
- BYTE: 8 bits (e.g., 01000001). One byte represents one character (like 'A').
- LOGIC GATES:
  - AND: True only if BOTH inputs are 1.
  - OR: True if EITHER input is 1.
  - NOT: Flips 1 to 0.

Why it matters: Every complex system (AI, Crypto, Banking) is just billions of these simple switches flipping in sync. If you understand this, you understand that software is not magic; it is structure.`,
    genesis: { signature: 'sig_tech_01' },
    history: []
  },
  {
    id: 'cs-algo-v1',
    title: 'CS 101: Algorithms',
    author: 'The Source',
    category: 'TECHNOLOGY',
    tags: ['logic', 'coding', 'mental_model'],
    body: `An algorithm is a recipe. It is a specific set of instructions to accomplish a task.

Example: Sorting a Deck of Cards.
1. Look at the first card.
2. Compare it to the next.
3. If the next is smaller, swap them.
4. Repeat until the end.

"The Algorithm" (Social Media) is a recipe optimized for one variable: Retention. It feeds you outrage because outrage keeps you looking. You can "hack" the algorithm by refusing to click on outrage.`,
    genesis: { signature: 'sig_tech_02' },
    history: []
  },
  {
    id: 'cs-open-source-v1',
    title: 'Open Source vs. Closed Source',
    author: 'The Source',
    category: 'TECHNOLOGY',
    tags: ['software', 'freedom', 'rights'],
    body: `CLOSED SOURCE (Proprietary):
- Code is hidden (compiled). You cannot see how it works.
- You are a "User" (Renter).
- Examples: Windows, iOS, Photoshop.

OPEN SOURCE (FOSS):
- Code is public. Anyone can audit, fix, or improve it.
- You are a "Participant" (Owner).
- Examples: Linux, Bitcoin, This App.

Security Rule: Never trust a security tool (like encryption) that is Closed Source. If you can't see the lock, you don't know who has the key.`,
    genesis: { signature: 'sig_tech_03' },
    history: []
  },

  // --- INTERNET INFRASTRUCTURE (The Pipes) ---
  {
    id: 'net-dns-v1',
    title: 'Internet: DNS (The Phonebook)',
    author: 'Net Ops',
    category: 'TECHNOLOGY',
    tags: ['internet', 'infrastructure', 'privacy'],
    body: `Computers don't know names; they only know numbers (IP Addresses like 142.250.190.46).

DNS (Domain Name System) translates "google.com" into that number.
- When you type a URL, your ISP's DNS server logs it. They know every site you visit, even in Incognito mode.
- PRIVACY FIX: Change your DNS settings to a private provider like 1.1.1.1 (Cloudflare) or 9.9.9.9 (Quad9). This stops your ISP from building a profile of your life.`,
    genesis: { signature: 'sig_tech_04' },
    history: []
  },
  {
    id: 'net-https-v1',
    title: 'Internet: HTTPS & SSL',
    author: 'Net Ops',
    category: 'TECHNOLOGY',
    tags: ['security', 'web', 'encryption'],
    body: `HTTP = Postcard (Anyone can read it).
HTTPS = Armored Truck (Only the recipient has the key).

How it works (Public Key Encryption):
1. You ask the server for its PUBLIC Key (Open Lock).
2. You put your data (password) in a box and lock it.
3. You send it.
4. Only the Server has the PRIVATE Key to open it.

Never enter a credit card or password on a site without the Lock Icon (HTTPS).`,
    genesis: { signature: 'sig_tech_05' },
    history: []
  },
  {
    id: 'net-vpn-v1',
    title: 'Internet: How VPNs Work',
    author: 'Sec Ops',
    category: 'TECHNOLOGY',
    tags: ['privacy', 'security', 'tools'],
    body: `A VPN (Virtual Private Network) is an encrypted tunnel.

WITHOUT VPN:
You -> ISP -> Website.
(ISP sees everything. Website sees your Home IP).

WITH VPN:
You -> [Encrypted Tunnel] -> VPN Server -> Website.
1. ISP only sees gibberish data going to the VPN.
2. Website only sees the VPN's IP address (not yours).

WARNING: Free VPNs usually sell your data. If you don't pay for the product, you are the product.`,
    genesis: { signature: 'sig_tech_06' },
    history: []
  },

  // --- CYBERSECURITY (Defense) ---
  {
    id: 'sec-phishing-v1',
    title: 'Security: Phishing (The #1 Hack)',
    author: 'Sec Ops',
    category: 'SECURITY',
    tags: ['hacking', 'defense', 'social_engineering'],
    body: `90% of hacks are not "code breaking"; they are "people breaking."

THE MECHANIC:
Hackers create a sense of URGENCY ("Your account is locked!", "Invoice Overdue!").
Panic shuts down the critical thinking part of your brain.

THE DEFENSE:
1. The "Tactical Pause": If an email makes you feel emotion (Fear/Greed), STOP.
2. Check the Sender: Is it support@amazon.com or support-amazon@gmail.com?
3. Hover the Link: Does it go to amazon.com or amazon-verify.com?
4. Never click. Go to the app directly.`,
    genesis: { signature: 'sig_tech_07' },
    history: []
  },
  {
    id: 'sec-passwords-v1',
    title: 'Security: Password Entropy',
    author: 'Sec Ops',
    category: 'SECURITY',
    tags: ['passwords', 'math', 'defense'],
    body: `Length > Complexity.

"Tr0ub4dor&3" (Hard for humans, easy for computers to guess).
"correct horse battery staple" (4 random words, easy for humans, hard for computers).

MATH:
Every character you add increases the difficulty exponentially.
- 8 chars: Cracked instantly.
- 12 chars: Cracked in weeks.
- 16 chars: Cracked in trillions of years.

Use a Password Manager (Bitwarden/1Password). You should only know ONE password (the Master). Every other password should be 20+ random characters generated by the machine.`,
    genesis: { signature: 'sig_tech_08' },
    history: []
  },
  {
    id: 'sec-2fa-v1',
    title: 'Security: 2FA (Two-Factor)',
    author: 'Sec Ops',
    category: 'SECURITY',
    tags: ['auth', 'defense', 'tools'],
    body: `Passwords are not enough. You need 2FA.

THE HIERARCHY OF 2FA:
1. Hardware Key (YubiKey): The Gold Standard. Unhackable remotely.
2. Authenticator App (Google/Authy): Very strong. Codes generate locally on your phone.
3. SMS Text: WEAK. Vulnerable to "SIM Swapping" (Hacker tricks Verizon into switching your number to their phone).

Action: Go to your Email and Bank settings right now. Turn on 2FA. Use an App, not SMS.`,
    genesis: { signature: 'sig_tech_09' },
    history: []
  },

  // --- ARTIFICIAL INTELLIGENCE (The Future) ---
  {
    id: 'ai-llm-v1',
    title: 'AI: How LLMs Work',
    author: 'AI Ops',
    category: 'TECHNOLOGY',
    tags: ['ai', 'future', 'limitations'],
    body: `ChatGPT does not "know" things. It predicts the next word.

It is a "Probabilistic Engine." It has read the entire internet and learned that "Rose" is usually followed by "Red."
- It prioritizes FLUENCY (sounding human) over TRUTH (being accurate).
- This is called "Hallucination."

USE CASE:
- Summarizing messy data.
- Formatting text.
- Brainstorming ideas.

DO NOT USE FOR:
- Math (it is bad at logic).
- Verified facts (it will lie confidently).
- Medical advice (it makes things up).`,
    genesis: { signature: 'sig_tech_10' },
    history: []
  },
  {
    id: 'ai-deepfakes-v1',
    title: 'AI: Spotting Deepfakes',
    author: 'Intel Ops',
    category: 'TECHNOLOGY',
    tags: ['media', 'truth', 'defense'],
    body: `Trust your eyes less. Trust context more.

AUDIO:
AI can clone a voice with 3 seconds of audio. If a loved one calls you in panic asking for money, hang up and call them back. Create a "Safe Word" with your family that only you know.

VIDEO:
Look for "glitches":
- Fingers (AI struggles with hands).
- Blinking (Unnatural patterns).
- Lip Sync (Mouth doesn't match words perfectly).
- Background text (Often gibberish).

If a video confirms your bias perfectly and makes you angry, assume it is fake until verified.`,
    genesis: { signature: 'sig_tech_11' },
    history: []
  },

  // --- DATA PRIVACY (The Rights) ---
  {
    id: 'priv-model-v1',
    title: 'Privacy: The Business Model',
    author: 'Privacy Ops',
    category: 'TECHNOLOGY',
    tags: ['privacy', 'economy', 'surveillance'],
    body: `If the product is free, YOU are the product.

Google and Meta are not "Search" or "Social" companies. They are Advertising Brokers.
They collect:
- Location (Where you sleep, work, shop).
- Social Graph (Who you know).
- Biometrics (Your face, voice).
- Psychometrics (What makes you angry/happy).

They sell "Prediction Products": The ability to predict (and change) your behavior.
Resistance: Use tools that you pay for, or tools that are Open Source (Signal, ProtonMail, Brave Browser).`,
    genesis: { signature: 'sig_tech_12' },
    history: []
  },
  {
    id: 'priv-meta-v1',
    title: 'Privacy: Metadata',
    author: 'Intel Ops',
    category: 'TECHNOLOGY',
    tags: ['surveillance', 'data', 'intel'],
    body: `"We kill people based on metadata." - Gen. Michael Hayden (Ex-NSA Director).

Content is what you say. Metadata is who/when/where you say it.
- Content: "Hi Mom, I'm fine."
- Metadata: [Call at 2AM] [From a Bridge] [Duration 1 min] [To Suicide Hotline].

Encryption hides the Content. It usually does NOT hide the Metadata.
Protecting metadata requires using tools like Tor or avoiding electronic comms entirely for sensitive matters.`,
    genesis: { signature: 'sig_tech_13' },
    history: []
  },

  // --- CRYPTO & BLOCKCHAIN (The Ledger) ---
  {
    id: 'cry-btc-v1',
    title: 'Crypto: Bitcoin Basics',
    author: 'Econ Ops',
    category: 'TECHNOLOGY',
    tags: ['finance', 'crypto', 'money'],
    body: `Bitcoin is the first successful implementation of "Digital Scarcity."

- Decentralized: No bank or government controls it.
- Finite: There will only ever be 21 Million.
- Immutable: Once a transaction is on the ledger, it cannot be erased.

It solves the "Double Spend" problem without a middleman.
It is "Hard Money" for the internet age. Whether you invest or not, you must understand it as a hedge against inflation.`,
    genesis: { signature: 'sig_tech_14' },
    history: []
  },
  {
    id: 'cry-keys-v1',
    title: 'Crypto: Not Your Keys...',
    author: 'Sec Ops',
    category: 'TECHNOLOGY',
    tags: ['security', 'crypto', 'responsibility'],
    body: `"...Not Your Coins."

If you leave your crypto on an exchange (Coinbase, Binance), you do not own it. You own an IOU. If they go bankrupt (like FTX), your money is gone.

SELF CUSTODY:
1. Create a Wallet (Metamask, Phantom, Hardware Wallet).
2. Write down the 12/24 word "Seed Phrase" on PAPER.
3. Hide the paper.

That paper is your money. If you lose it, the money is gone forever. There is no "Forgot Password." This is the price of sovereignty.`,
    genesis: { signature: 'sig_tech_15' },
    history: []
  }
];