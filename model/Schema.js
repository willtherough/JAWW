import * as Crypto from 'expo-crypto';
import { signData } from './Security'; // Ensure this path correctly points to your Security.js

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
export const calculateTrustScore = (card, userNetwork = [], userInterests = [], rssi) => {
  if (card.safety && card.safety.flag_count > 5) return 0;

  let score = 0;
  const validEndorsements = (card.endorsements || []).filter(e => 
    userNetwork.includes(e.author_id)
  );
  score = (validEndorsements.length * 10) + 10;

  const contextMultiplier = (card.fork_depth || 0) > 0 ? 1.5 : 1.0;
  const interestMultiplier = calculateInterestScore(card, userInterests);

  const baseScore = score * contextMultiplier * interestMultiplier;

  // --- Physics-Based Reputation (Claim 5) ---
  const denominator = Math.max(Math.abs(rssi || -75), 1); // Ensure divisor is at least 1
  const finalScore = baseScore / denominator;

  const ageInHours = (Date.now() - (card.genesis ? new Date(card.genesis.timestamp).getTime() : Date.now())) / 36e5;
  const velocityCap = ageInHours < 24 ? 50 : 5000;

  return Math.min(finalScore, velocityCap);
};

// --- 5. THE LEDGER ENTRY CONSTRUCTOR ---
export const buildLedgerEntry = ({ action, fromKey, toKey, senderHandle, recipientHandle, signature, timestamp, event, note }) => {
    if (!action) throw new Error("Incomplete Intel: Missing action type.");
    if (!fromKey || fromKey === "Unknown") throw new Error("Incomplete Intel: Missing Sender Public Key.");
    if (toKey === "Unknown") throw new Error("Incomplete Intel: Invalid Recipient Public Key.");
    if (!timestamp) throw new Error("Incomplete Intel: Missing timestamp.");
    if (!senderHandle || senderHandle === "Unknown" || senderHandle === "Unknown Operator") throw new Error("Incomplete Intel: Missing or Invalid Sender Handle.");
    if (recipientHandle === "Unknown" || recipientHandle === "Unknown Operator") throw new Error("Incomplete Intel: Invalid Recipient Handle.");

    return {
        action: action,
        event: event || null,
        from: fromKey,
        note: note || null,
        recipientHandle: recipientHandle || null,
        senderHandle: senderHandle,
        signature: signature || null,
        timestamp: timestamp,
        to: toKey || null,
        user: senderHandle
    };
};

// --- 6. THE CARD CONSTRUCTOR ---
export const createCard = async (authorPublicKey, title, body, topicPath, subject, authorHandle, type = 'standard') => {
  if (!authorPublicKey) throw new Error("A cryptographic public key is required to author intel.");
  if (!authorHandle || authorHandle === "Unknown") throw new Error("A permanent handle is required to author intel.");
  
  const timestamp = new Date().toISOString();
  const contentString = title + body;
  const contentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    contentString
  );

  if (BANNED_HASHES.includes(contentHash)) {
    throw new Error("Content flagged as prohibited by safety protocol.");
  }
  
  const genesisBlock = {
    author_id: authorPublicKey,
    author_handle: authorHandle,
    timestamp: timestamp,
    signature: null, 
    location_fuzzed: null 
  };

  // 2. Cryptographically sign the Genesis Block centrally
  const signature = await signData(genesisBlock);
  genesisBlock.signature = signature;

  // 3. Assemble and return the full card
  return {
    id: Crypto.randomUUID(),
    version: CARD_VERSION,
    type: type, 
    title: title,
    body: body,
    topic: topicPath,
    subject: subject || title.substring(0, 16),
    path: topicPath, 
    hash: contentHash,
    genesis: genesisBlock, // Now fully signed and secure
    safety: {
      flag_count: 0, 
      last_flagged: null,
      min_app_version: "1.0" 
    },
    history: [
      buildLedgerEntry({
        action: 'CREATED',
        fromKey: authorPublicKey,
        toKey: authorPublicKey,
        senderHandle: authorHandle,
        recipientHandle: authorHandle,
        signature: null,
        timestamp: timestamp,
        note: 'Original Entry'
      })
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

// --- 7. IDENTITY CONSTRUCTOR ---
export const createIdentityCard = (profile, publicKey) => {
  return {
    type: 'SOURCE_IDENTITY_V1',
    id: publicKey, 
    version: CARD_VERSION,
    payload: {
      handle: profile.handle,
      rank_tier: profile.rank_tier || 'ROOKIE',
      genesis_date: profile.genesis_date || new Date().toISOString(),
      background_pro: profile.background_pro || '',
      background_hobby: profile.background_hobby || '',
      background_fit: profile.background_fit || '',
      timestamp: new Date().toISOString(),
    },
    signature: null,
    reputation: {
      vouch_count: 0,
      verified_status: false
    }
  };
};

// --- 8. KNOWLEDGE FORK ---
export const forkCard = async (originalCard, contextNote, userProfile) => {
    if (!userProfile.handle || userProfile.handle === "Unknown") throw new Error("A permanent handle is required to fork intel.");
    // 1. Deep copy the card so we don't accidentally mutate the original in memory
    const newCard = JSON.parse(JSON.stringify(originalCard));

    // 2. WE DO NOT TOUCH newCard.genesis. It belongs to the original author.
    
    const timestamp = new Date().toISOString();
    const safeHistory = newCard.history || [];

    // 3. Find the last valid signature in the chain to maintain unbroken cryptography
    const lastSignedEntry = [...safeHistory].reverse().find(e => e.signature);
    const previousSignature = lastSignedEntry ? lastSignedEntry.signature : newCard.genesis.signature;

    // 4. The Operator (Answerer) signs their specific FORK action.
    const messageToSign = previousSignature + userProfile.publicKey;
    const newSignature = await signData(messageToSign);

    const forkEntry = buildLedgerEntry({
        action: 'FORK',
        fromKey: userProfile.publicKey,
        toKey: userProfile.publicKey,
        senderHandle: userProfile.handle,
        recipientHandle: userProfile.handle,
        timestamp: timestamp,
        signature: newSignature,
        note: contextNote
    });

    // 5. Append the signed answer to the ledger
    newCard.history.push(forkEntry);
    
    // 6. Update the hop count to reflect the new block
    newCard.hops = newCard.history.length;
    newCard.hop_count = newCard.history.length;
    newCard.fork_depth = (newCard.fork_depth || 0) + 1;

    return newCard;
};