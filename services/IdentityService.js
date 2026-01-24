import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

// THE STORAGE KEY (The Safe)
const IDENTITY_STORAGE_KEY = 'THE_SOURCE_IDENTITY_V1';

class IdentityService {
  constructor() {
    this.keyPair = null;
    this.publicKey = null;
  }

  /**
   * 1. LOAD OR CREATE (The Genesis)
   * Checks if we already exist. If not, mints a new Sovereign Identity.
   */
  async loadIdentity() {
    try {
      const storedIdentity = await AsyncStorage.getItem(IDENTITY_STORAGE_KEY);
      
      if (storedIdentity) {
        console.log('[Identity] Loading existing Patriot ID...');
        const parsed = JSON.parse(storedIdentity);
        
        // Rehydrate keys from Base64
        this.keyPair = {
            publicKey: decodeBase64(parsed.publicKey),
            secretKey: decodeBase64(parsed.secretKey)
        };
        this.publicKey = parsed.publicKey; 
        
      } else {
        console.log('[Identity] No ID found. MINTING NEW GENESIS KEYS...');
        await this._generateNewIdentity();
      }
      
      return this.publicKey;
      
    } catch (e) {
      console.error('[Identity] Critical Failure loading ID:', e);
      return null;
    }
  }

  /**
   * INTERNAL: Generate Ed25519 Keypair
   */
  async _generateNewIdentity() {
    // 1. Math: Create the keys
    const newKeyPair = nacl.sign.keyPair();
    
    // 2. Convert to Strings for Storage
    const publicB64 = encodeBase64(newKeyPair.publicKey);
    const secretB64 = encodeBase64(newKeyPair.secretKey);
    
    this.keyPair = newKeyPair;
    this.publicKey = publicB64;

    // 3. Persist to Secure Storage
    const savePacket = JSON.stringify({
        publicKey: publicB64,
        secretKey: secretB64,
        created: Date.now()
    });
    
    await AsyncStorage.setItem(IDENTITY_STORAGE_KEY, savePacket);
    console.log('[Identity] GENESIS COMPLETE. Welcome to the resistance.');
  }

  /**
   * 2. SIGN THE TRUTH (The Stamp)
   * Takes a message string, signs it with your Private Key.
   * Returns the Signature.
   */
  signMessage(messageString) {
    if (!this.keyPair) {
        throw new Error("Identity not loaded! Call loadIdentity() first.");
    }

    // Convert string to Uint8Array for signing
    const messageBytes = decodeBase64(encodeBase64(stringToUint8(messageString)));
    const signatureBytes = nacl.sign.detached(messageBytes, this.keyPair.secretKey);
    
    return encodeBase64(signatureBytes);
  }

  /**
   * 3. VERIFY (The Check)
   * Static utility for the Receiver to check if a message is real.
   */
  static verifyMessage(messageString, signatureB64, authorPublicKeyB64) {
    try {
        const messageBytes = decodeBase64(encodeBase64(stringToUint8(messageString)));
        const signatureBytes = decodeBase64(signatureB64);
        const publicKeyBytes = decodeBase64(authorPublicKeyB64);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (e) {
        return false; // Forged or Malformed
    }
  }
}

// Helper to handle text encoding
function stringToUint8(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
    return arr;
}

export default new IdentityService();