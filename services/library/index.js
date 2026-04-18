// services/library/index.js

// --- EXISTING IMPORTS ---
import { TECH_CARDS } from './Vol1_Tech';
import { MED_CARDS } from './Vol2_Medical';
import { PHYS_CARDS } from './Vol3_Physiology';
import { OUTDOOR_CARDS } from './Vol4_Outdoors';
import { SURVIVAL_CARDS } from './Vol5_Survival';
import { TRADE_CARDS } from './Vol6_Trades';
import { DOMESTIC_CARDS } from './Vol7_Domestic';
import { FINANCE_CARDS } from './Vol8_Finance';
import { BUSINESS_CARDS } from './Vol9_Business';
import { SCIENCE_CARDS } from './Vol10_Science';
import { CIVICS_CARDS } from './Vol11_Civics';
import { LOGIC_CARDS } from './Vol12_Logic';
import { NFL_CARDS } from './Vol13_SuperBowl';

// --- NEW SPORTS IMPORTS (Add these lines) ---
import { NCAA_FB_CARDS, NCAA_BB_CARDS } from './Vol14_NCAA';
import { NFL_GEN_CARDS, NBA_CARDS, MLB_CARDS } from './Vol15_ProLeagues';
import { UFC_CARDS, WBO_CARDS } from './Vol16_Combat';
import { F1_CARDS } from './Vol17_Racing';
import { NHL_CARDS } from './Vol18_NHL';
import { NASCAR_CARDS, LEMANS_CARDS } from './Vol19_Racing';
import { FOOD_CARDS } from './Vol20_Nutrition_Foods';
import { NUTRIENT_CARDS } from './Vol21_Nutrition_Nutrients';


// Aggregates all "Civilization" knowledge
export const MASTER_LIBRARY = [
  ...TECH_CARDS,
  ...MED_CARDS,
  ...PHYS_CARDS,
  ...OUTDOOR_CARDS,
  ...SURVIVAL_CARDS,
  ...TRADE_CARDS,
  ...DOMESTIC_CARDS,
  ...FINANCE_CARDS,
  ...BUSINESS_CARDS,
  ...SCIENCE_CARDS,
  ...CIVICS_CARDS,
  ...LOGIC_CARDS,
  ...FOOD_CARDS,
  ...NUTRIENT_CARDS,
];

export const funLibrary = [
  
  // =================================================
  // PROFESSIONAL AND COLLEGE SPORTS
  // =================================================
  ...NFL_CARDS,         // Super Bowl specific
  ...NFL_GEN_CARDS,     // General NFL Rules/Season
  ...NCAA_FB_CARDS,     // College Football
  ...NCAA_BB_CARDS,     // College Basketball
  ...NBA_CARDS,         // Pro Basketball
  ...MLB_CARDS,         // Baseball
  ...UFC_CARDS,         // MMA
  ...WBO_CARDS,         // Boxing
  ...F1_CARDS,          // Formula 1
  ...NHL_CARDS,         // Hockey
  ...NASCAR_CARDS,      // Nascar
  ...LEMANS_CARDS,      // Le Mans
];