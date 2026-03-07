// services/library/Vol19_Racing.js

export const NASCAR_CARDS = [
  {
    id: 'nascar-basics-v1',
    title: 'NASCAR: The Basics',
    author: 'Tactical Ops',
    category: 'SPORTS',
    tags: ['sports', 'racing', 'nascar'],
    genesis: { signature: 'sig_nascar_01' },
    body: `THE CARS:
Stock cars, but not really "stock". They are purpose-built racing machines with a steel tube frame chassis and a powerful V8 engine.

THE TRACKS:
Mostly ovals, ranging from short tracks (under 1 mile) to superspeedways (over 2 miles). There are also a few road courses on the schedule.

THE RACE:
Races are divided into three stages. Points are awarded to the top 10 drivers at the end of each stage. The final stage determines the race winner.`,
    history: []
  },
  {
    id: 'nascar-points-v1',
    title: 'NASCAR: Points System',
    author: 'Tactical Ops',
    category: 'SPORTS',
    tags: ['sports', 'racing', 'nascar', 'rules'],
    genesis: { signature: 'sig_nascar_02' },
    body: `RACE WINNER: 40 points + 5 playoff points.
2ND PLACE: 35 points.
3RD-35TH PLACE: 34-2 points.
36TH-40TH PLACE: 1 point.

STAGE WINS: The winner of Stage 1 or 2 gets 10 regular season points and 1 playoff point.

PLAYOFFS: The top 16 drivers at the end of the regular season qualify for the playoffs. The championship is decided in a winner-take-all final race.`,
    history: []
  }
];

export const LEMANS_CARDS = [
  {
    id: 'lemans-basics-v1',
    title: '24 Hours of Le Mans: The Basics',
    author: 'Tactical Ops',
    category: 'SPORTS',
    tags: ['sports', 'racing', 'le mans', 'endurance'],
    genesis: { signature: 'sig_lemans_01' },
    body: `THE RACE:
An endurance race held annually in Le Mans, France. The winner is the car that covers the greatest distance in 24 hours.

THE TEAMS:
Teams are made up of three drivers who take turns driving the car.

THE CARS:
Multiple classes of cars race simultaneously, from high-tech prototypes (Hypercar) to modified road cars (LM GTE Am). This creates a lot of traffic and overtaking.`,
    history: []
  },
  {
    id: 'lemans-history-v1',
    title: 'Le Mans: Fun Facts',
    author: 'Tactical Ops',
    category: 'SPORTS',
    tags: ['sports', 'racing', 'le mans', 'history'],
    genesis: { signature: 'sig_lemans_02' },
    body: `THE CHAMPAGNE TRADITION:
The tradition of spraying champagne on the podium started at Le Mans in 1967 when winner Dan Gurney spontaneously sprayed the crowd.

FORD VS. FERRARI:
One of the most famous rivalries in racing history. In the 1960s, Ford developed the GT40 to beat Ferrari at Le Mans, and they succeeded, winning four consecutive years from 1966 to 1969.`,
    history: []
  }
];
