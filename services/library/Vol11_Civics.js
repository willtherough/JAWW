// services/library/Vol11_Civics.js

export const CIVICS_CARDS = [
  // --- THE CONSTITUTION (The Contract) ---
  {
    id: 'civ-1st-v1',
    title: 'Rights: 1st Amendment',
    author: 'Legal Ops',
    category: 'CIVICS',
    tags: ['law', 'rights', 'constitution'],
    body: `Congress shall make no law respecting:
1. RELIGION: Establishment or Free Exercise.
2. SPEECH: Protection of unpopular ideas (Popular ideas don't need protection).
3. PRESS: The right to publish without censorship.
4. ASSEMBLY: The right to gather peacefully.
5. PETITION: The right to complain to the government.

"Hate speech" is protected speech. Incitement to violence is not.`,
    genesis: { signature: 'sig_civ_01' },
    history: []
  },
  {
    id: 'civ-2nd-v1',
    title: 'Rights: 2nd Amendment',
    author: 'Legal Ops',
    category: 'CIVICS',
    tags: ['law', 'rights', 'defense'],
    body: `"A well regulated Militia, being necessary to the security of a free State, the right of the people to keep and bear Arms, shall not be infringed."

Key Concept: The right belongs to "The People," not the militia.
Purpose: It is not about hunting. It is the final check and balance against a government that ignores the other amendments.`,
    genesis: { signature: 'sig_civ_02' },
    history: []
  },
  {
    id: 'civ-4th-v1',
    title: 'Rights: 4th Amendment (Privacy)',
    author: 'Legal Ops',
    category: 'CIVICS',
    tags: ['law', 'privacy', 'search'],
    body: `Protection against "Unreasonable Searches and Seizures."

THE WARRANT REQUIREMENT:
Police cannot enter your home or unlock your phone without a Warrant signed by a judge, supported by Probable Cause.

EXCEPTIONS:
1. Consent: If you say "Yes," you waive your rights. NEVER CONSENT TO A SEARCH.
2. Plain View: If they see illegal items through the window.
3. Exigent Circumstances: Active emergency (screaming/gunshots).`,
    genesis: { signature: 'sig_civ_03' },
    history: []
  },
  {
    id: 'civ-5th-v1',
    title: 'Rights: 5th Amendment (Silence)',
    author: 'Legal Ops',
    category: 'CIVICS',
    tags: ['law', 'rights', 'silence'],
    body: `"No person... shall be compelled in any criminal case to be a witness against himself."

THE RULE:
You cannot talk your way out of jail, but you can talk your way INTO jail.
Police are allowed to lie to you. They are trained to extract confessions.

THE SCRIPT:
"I assert my 5th Amendment right to remain silent. I want a lawyer."
Then SHUT UP.`,
    genesis: { signature: 'sig_civ_04' },
    history: []
  },

  // --- ENCOUNTERS (The Application) ---
  {
    id: 'civ-traffic-stop-v1',
    title: 'Civics: Traffic Stop Protocol',
    author: 'Legal Ops',
    category: 'CIVICS',
    tags: ['police', 'law', 'protocol'],
    body: `Goal: Survive and de-escalate.

1. PULL OVER: Safely, turn off engine, turn on dome light.
2. HANDS: On the steering wheel (10 and 2). Visible.
3. MOVEMENT: "Officer, I am reaching for my wallet in my back pocket."
4. QUESTIONS:
   Cop: "Do you know how fast you were going?"
   You: "No, officer." (Admitting speed is a confession).
   Cop: "Can I search the car?"
   You: "I do not consent to searches."`,
    genesis: { signature: 'sig_civ_05' },
    history: []
  },
  {
    id: 'civ-jury-null-v1',
    title: 'Civics: Jury Nullification',
    author: 'Legal Ops',
    category: 'CIVICS',
    tags: ['law', 'court', 'jury'],
    body: `The secret power of the Jury.

A Jury has the power to find a defendant "Not Guilty" even if they broke the law, if the Jury believes the law itself is unjust.
Example: Juries refusing to convict people for helping escaped slaves in the 1850s.

Judges will rarely tell you this. Prosecutors hate it. It is the People's "Veto" on bad laws.`,
    genesis: { signature: 'sig_civ_06' },
    history: []
  },
  {
    id: 'civ-foia-v1',
    title: 'Civics: FOIA Request',
    author: 'Intel Ops',
    category: 'CIVICS',
    tags: ['law', 'intel', 'transparency'],
    body: `Freedom of Information Act.

You have the right to request federal agency records.
- "I request all emails from [Official] regarding [Topic] between [Date] and [Date]."

They can redact "National Security" info, but they must release the rest. It is a powerful tool for journalists and citizens to audit the government.`,
    genesis: { signature: 'sig_civ_07' },
    history: []
  }
];