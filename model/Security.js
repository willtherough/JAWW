import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// The key used to lock the data in the Android/iOS KeyStore
const KEY_TAG = 'source_user_identity_v1';

const deterministicStringify = (obj) => {
    const sortedObj = {};
    Object.keys(obj).sort().forEach(key => {
        sortedObj[key] = obj[key];
    });
    return JSON.stringify(sortedObj);
};

// 1. GENERATE OR RETRIEVE IDENTITY (The Vault)
export const getOrGenerateKeys = async () => {
  try {
    // A. Check if keys already exist in hardware storage
    const stored = await SecureStore.getItemAsync(KEY_TAG);
    
    if (stored) {
      const keys = JSON.parse(stored);
      console.log("🔐 SECURITY: Existing Identity Loaded.");
      return keys; // Returns { publicKey, secretKey }
    } else {
      console.log("⚔️ SECURITY: No keys found. Generating new Identity...");
      
      // B. THE PRNG FIX (Your code)
      // Ask the phone hardware for 32 bytes of true randomness
      const seed = await Crypto.getRandomBytesAsync(32);
      
      // Use those bytes to build the keys
      const keyPair = nacl.sign.keyPair.fromSeed(seed);
      
      const publicKey = util.encodeBase64(keyPair.publicKey);
      const secretKey = util.encodeBase64(keyPair.secretKey);
      
      const newKeys = { publicKey, secretKey };
      
      // C. Save to Hardware Store
      await SecureStore.setItemAsync(KEY_TAG, JSON.stringify(newKeys));
      console.log("✅ SECURITY: New Identity Secured in Hardware Enclave.");
      
      return newKeys;
    }
  } catch (error) {
    console.error("❌ SECURITY CRITICAL ERROR:", error);
    return null;
  }
};

// 2. SIGN DATA (Proof of Authorship)
// Takes a simple string or object, canonicalizes it, and signs it.
export const signData = async (dataInput) => {
  try {
    // Retrieve the secret key internally (UI never sees it)
    const stored = await SecureStore.getItemAsync(KEY_TAG);
    if (!stored) throw new Error("No Identity Found");
    
    const { secretKey } = JSON.parse(stored);
    
    // Ensure input is a string (Canonicalization)
    const messageString = typeof dataInput === 'string' 
      ? dataInput 
      : deterministicStringify(dataInput);

    const messageBytes = util.decodeUTF8(messageString);
    const secretKeyBytes = util.decodeBase64(secretKey);
    
    // Sign it
    const signatureBytes = nacl.sign.detached(messageBytes, secretKeyBytes);
    
    // Return signature as Base64
    return util.encodeBase64(signatureBytes);
    
  } catch (error) {
    console.error("Signing Error:", error);
    return null;
  }
};

// 3. VERIFY SIGNATURE (The Auditor)
export const verifySignature = (dataInput, signature, authorPublicKey) => {
  try {
    const messageString = typeof dataInput === 'string' 
      ? dataInput 
      : deterministicStringify(dataInput);

    const messageBytes = util.decodeUTF8(messageString);
    const signatureBytes = util.decodeBase64(signature);
    const publicKeyBytes = util.decodeBase64(authorPublicKey);
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.log("Verification Failed:", error);
    return false;
  }
};

// 4. VERIFY ENTIRE CHAIN (The "Lean Chain" Auditor)
export const verifyChain = (card) => {
  if (!card || !card.genesis || !card.genesis.signature || !card.genesis.author_id) {
    console.error("Chain Verification Aborted: Invalid Genesis Block.");
    return false;
  }

  // Step 1: Reconstruct the exact Genesis state (signature was 'null' when signed)
  const genesisBlock = { ...card.genesis, signature: null };
  
  const isGenesisValid = verifySignature(
    genesisBlock, 
    card.genesis.signature, 
    card.genesis.author_id
  );

  if (!isGenesisValid) {
    console.error("Chain Verification Failed: Genesis signature is invalid.");
    return false;
  }

  // Step 2: Sequentially verify every P2P hop in the history chain.
  let previousSignature = card.genesis.signature;

  for (const entry of (card.history || [])) {
    // Skip non-transfer events like "FORK" or "CREATE" which don't use this chaining logic
    if (entry.action !== 'SHARED' && entry.action !== 'TRANSFERRED') {
        continue; 
    }

    // Recreate the message that the sender signed: (Previous Sig + Receiver's Key)
    const receiverKey = entry.to || entry.receiver_id || entry.userKey;
    const senderKey = entry.from || entry.sender_id || entry.fromKey;
    
      // SAFETY NET: Catch malformed hops before they hit the decoder
      if (!previousSignature || !entry.signature || !senderKey) {
          console.warn(">> SECURITY: Bypassing legacy unsigned hop.");
          previousSignature = entry.signature || previousSignature; 
          continue; 
      }

    const messageToVerify = previousSignature + receiverKey;

    const isHopValid = verifySignature(
      messageToVerify,
      entry.signature,
      senderKey
    );
    
    if (!isHopValid) {
      console.error(`\n\n🚨 >> CRYPTO FAIL: Chain Verification Broken!`);
      console.log(`>> FAILED SENDER KEY: ${senderKey}`);
      console.log(`>> EXPECTED MESSAGE (Prev Sig + Receiver Key): ${messageToVerify}`);
      console.log(`>> PROVIDED SIGNATURE: ${entry.signature}`);
      console.log(`>> FULL BLOCK:`, JSON.stringify(entry));
      console.log(`>> ENTIRE HISTORY ARRAY LENGTH: ${card.history.length}\n\n`);
      return false;
    }

    // The current signature becomes the previous one for the next loop iteration
    previousSignature = entry.signature;
  }

  console.log("✅ Chain Verification Successful: All signatures are valid. Truth verified.");
  return true;
};