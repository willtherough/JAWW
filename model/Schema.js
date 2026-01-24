// model/Schema.js
// THE SOURCE PROTOCOL v2.0
// Includes: Taxonomy, Reputation Engine, and Safety Safeguards

import * as Crypto from 'expo-crypto';

export const CARD_VERSION = "2.0";

// --- 1. SAFEGUARD LISTS (The "PhotoDNA" Shield) ---
// In a production app, these hashes would be loaded from a secure file/API.
// This prevents known illegal content from being created or saved.
const BANNED_HASHES = [
  // e.g., "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
];

// --- 2. TAXONOMY (The "Infinite Filing Cabinet") ---
// We use hierarchical paths for sorting.
export const TAXONOMY_ROOTS = {
  HUMAN: 'human',   // Culture, Sports, History
  SURVIVAL: 'survival', // Fitness, Medical, Shelter
  TECH: 'tech',     // Coding, Radio, Engineering
  MARKET: 'market', // For Sale, Barter, Gigs
  BEACON: 'beacon'  // Location, Wi-Fi, Safety Info
};

// --- 3. REPUTATION ENGINE (The "Digital Immune System") ---
export const calculateTrustScore = (card, userNetwork = []) => {
  // A. SAFETY CHECK: If this card has too many "Danger" flags, Rank = 0.
  if (card.safety && card.safety.flag_count > 5) return 0;

  let score = 0;
  
  // B. VELOCITY CHECK (Time-Weighted)
  // New cards (< 24 hours) are capped to prevent "Viral Bot" attacks.
  // Note: We use a safe check in case genesis is missing (backward compatibility)
  const genesisTime = card.genesis ? new Date(card.genesis.timestamp).getTime() : Date.now();
  const ageInHours = (Date.now() - genesisTime) / 36e5;
  const velocityCap = ageInHours < 24 ? 10 : 1000;

  // C. WEB OF TRUST (Relation Check)
  // Count endorsements ONLY from people in the user's known network.
  const endorsements = card.endorsements || [];
  const validEndorsements = endorsements.filter(e => 
    userNetwork.includes(e.author_id)
  );

  // D. EFFORT CHECK (Context)
  // Cards with context (Fork Depth > 0) get a trust multiplier.
  const contextMultiplier = (card.fork_depth || 0) > 0 ? 1.5 : 1.0;

  score = (validEndorsements.length * 10) * contextMultiplier;

  return Math.min(score, velocityCap);
};

// --- 4. THE CONSTRUCTOR ---
export const createCard = async (authorId, title, body, path, type = 'standard') => {
  const timestamp = new Date().toISOString();
  
  // GENERATE CONTENT HASH (Defense #1)
  // We fingerprint the content immediately.
  const contentString = title + body;
  const contentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    contentString
  );

  // CHECK BLOCKLIST
  if (BANNED_HASHES.includes(contentHash)) {
    throw new Error("Content flagged as prohibited by safety protocol.");
  }
  
  return {
    // IDENTITY
    id: `${authorId}-${Date.now()}`,
    version: CARD_VERSION,
    type: type, 

    // CONTENT
    title: title,
    body: body,
    path: path, 
    hash: contentHash, // Stores the fingerprint

    // GENESIS (Anti-Mule Defense)
    genesis: {
      author_id: authorId,
      timestamp: timestamp,
      signature: null, 
      location_fuzzed: null 
    },

    // SAFETY (The "Poisoned Soil" Protocol)
    safety: {
      flag_count: 0, 
      last_flagged: null,
      min_app_version: "1.0" 
    },

    // CHAIN OF CUSTODY
    history: [
      {
        action: 'CREATED',
        user_id: authorId,
        timestamp: timestamp,
        note: 'Original Entry'
      }
    ],

    // SOCIAL PROOF
    endorsements: [], 
    
    // MARKETPLACE (The Business Model)
    commercial: {
      is_for_sale: false,
      price: 0,
      currency: 'USDC', 
      owner_wallet: null
    },

    // METADATA
    hops: 0,
    fork_depth: 0 
  };
};