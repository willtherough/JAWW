// services/library/Vol16_Combat.js

export const UFC_CARDS = [
  {
    id: 'ufc-rules-v1',
    title: 'UFC: The Octagon',
    author: 'Tactical Ops',
    category: 'SPORTS',
    tags: ['sports', 'ufc', 'mma', 'fighting'],
    genesis: { signature: 'sig_ufc_01' },
    body: `ROUNDS:
- Non-Title Fights: 3 Rounds (5 mins each).
- Main Events/Title Fights: 5 Rounds.

WAYS TO WIN:
1. KO/TKO (Knockout).
2. Submission (Choke/Joint Lock).
3. Decision (Judges scorecards).

STYLES:
- Striker: Kickboxers/Boxers (Pereira). They want to stand and bang.
- Grappler: Wrestlers/Jiu-Jitsu (Makhachev). They want to drag you to the deep water (the floor) and drown you.`,
    history: []
  }
];

export const WBO_CARDS = [
  {
    id: 'wbo-boxing-v1',
    title: 'Boxing: The Sweet Science',
    author: 'Tactical Ops',
    category: 'SPORTS',
    tags: ['sports', 'boxing', 'wbo'],
    genesis: { signature: 'sig_wbo_01' },
    body: `ALPHABET SOUP (The Belts):
There is no one league. There are 4 major bodies: WBO, WBC, WBA, IBF. A fighter is "Undisputed" only if they hold all 4 belts at once.

SCORING (10-Point Must):
- Winner of the round gets 10 points.
- Loser gets 9.
- If you get knocked down, you lose a point (10-8 round).

THE CLINCH:
Hugging the opponent to stop their offense or catch your breath. The ref will break it up.`,
    history: []
  }
];