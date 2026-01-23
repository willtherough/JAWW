import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// The key used to lock the data in the Android/iOS KeyStore
const KEY_TAG = 'source_user_identity_v1';

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
      : JSON.stringify(dataInput);

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
      : JSON.stringify(dataInput);

    const messageBytes = util.decodeUTF8(messageString);
    const signatureBytes = util.decodeBase64(signature);
    const publicKeyBytes = util.decodeBase64(authorPublicKey);
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.log("Verification Failed:", error);
    return false;
  }
};