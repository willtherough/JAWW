import * as Crypto from 'expo-crypto';

export const CARD_VERSION = "2.0";

// --- 1. SAFEGUARD LISTS (The "PhotoDNA" Shield) ---
const BANNED_HASHES = [];

// --- 2. TAXONOMY (The "Infinite Filing Cabinet") ---
export const TAXONOMY_ROOTS = {
  HUMAN: 'human',   
  SURVIVAL: 'survival', 
  TECH: 'tech',     
  MARKET: 'market', 
  BEACON: 'beacon'  
};

// --- 3. THE INTEREST BOOST (Personalization Algorithm) ---
export const calculateInterestScore = (card, userInterests = []) => {
  if (!userInterests || userInterests.length === 0) return 1.0;
  
  // MERGE: Added card.path to ensure we catch topics hidden in the file path
  const cardContent = (card.title + " " + (card.topic || "") + " " + (card.path || "") + " " + (card.body || "")).toLowerCase();
  
  let boost = 1.0;
  userInterests.forEach(interest => {
    if (cardContent.includes(interest.toLowerCase())) {
      boost += 0.5; // 50% boost for matching keywords
    }
  });
  return boost;
};

// --- 4. REPUTATION ENGINE (The "Digital Immune System") ---
export const calculateTrustScore = (card, userNetwork = [], userInterests = []) => {
  if (card.safety && card.safety.flag_count > 5) return 0;

  let score = 0;
  const validEndorsements = (card.endorsements || []).filter(e => 
    userNetwork.includes(e.author_id)
  );
  score = (validEndorsements.length * 10) + 10;

  const contextMultiplier = (card.fork_depth || 0) > 0 ? 1.5 : 1.0;
  const interestMultiplier = calculateInterestScore(card, userInterests);

  const finalScore = score * contextMultiplier * interestMultiplier;

  const ageInHours = (Date.now() - (card.genesis ? new Date(card.genesis.timestamp).getTime() : Date.now())) / 36e5;
  const velocityCap = ageInHours < 24 ? 50 : 5000;

  return Math.min(finalScore, velocityCap);
};

// --- 5. THE CARD CONSTRUCTOR ---
export const createCard = async (authorId, title, body, path, type = 'standard') => {
  const timestamp = new Date().toISOString();
  const contentString = title + body;
  const contentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    contentString
  );

  if (BANNED_HASHES.includes(contentHash)) {
    throw new Error("Content flagged as prohibited by safety protocol.");
  }
  
  return {
    id: `${authorId}-${Date.now()}`,
    version: CARD_VERSION,
    type: type, 
    title: title,
    body: body,
    path: path, 
    hash: contentHash,
    genesis: {
      author_id: authorId,
      timestamp: timestamp,
      signature: null, 
      location_fuzzed: null 
    },
    safety: {
      flag_count: 0, 
      last_flagged: null,
      min_app_version: "1.0" 
    },
    history: [
      {
        action: 'CREATED',
        user_id: authorId,
        timestamp: timestamp,
        note: 'Original Entry'
      }
    ],
    endorsements: [], 
    commercial: {
      is_for_sale: false,
      price: 0,
      currency: 'USDC', 
      owner_wallet: null
    },
    hops: 0,
    fork_depth: 0 
  };
};

// --- 6. IDENTITY CONSTRUCTOR ---
export const createIdentityCard = (profile, publicKey) => {
  return {
    type: 'SOURCE_IDENTITY_V1',
    id: publicKey, 
    version: CARD_VERSION,
    payload: {
      handle: profile.handle,
      role: profile.role || 'Observer',
      interests: profile.interests || [],
      // MERGE: This is the critical addition for IdentityModal compatibility
      bio: profile.bio || { 
        age: profile.age, 
        weight: profile.weight, 
        height: profile.height, 
        diet: profile.diet, 
        expertise: profile.expertise 
      },
      timestamp: new Date().toISOString(),
    },
    signature: null,
    reputation: {
      vouch_count: 0,
      verified_status: false
    }
  };
};