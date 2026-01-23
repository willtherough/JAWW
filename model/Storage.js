import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  LIBRARY: 'THE_SOURCE_LIBRARY_V2',
  PROFILE: 'THE_SOURCE_PROFILE_V2'
};

// --- LIBRARY MANAGEMENT ---

export const loadLibrary = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.LIBRARY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch(e) {
    console.error("Failed to load library", e);
    return [];
  }
};

export const saveLibrary = async (cards) => {
  try {
    const jsonValue = JSON.stringify(cards);
    await AsyncStorage.setItem(KEYS.LIBRARY, jsonValue);
  } catch (e) {
    console.error("Failed to save library", e);
  }
};

// --- IDENTITY MANAGEMENT ---

export const loadProfile = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.PROFILE);
    // Default profile if none exists
    return jsonValue != null ? JSON.parse(jsonValue) : { handle: 'Unknown Operator', id: 'ANON' };
  } catch(e) {
    return { handle: 'Unknown Operator', id: 'ANON' };
  }
};

export const saveProfile = async (profile) => {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save profile", e);
  }
};

// CALCULATE EXPERTISE SCORE
// Returns an object like: { 'cooking': 15, 'history': 5 } based on card downloads
export const calculateExpertise = (cards, userHandle) => {
  const scores = {};

  // 1. Look at cards I AUTHORIZED (My creations)
  const myCards = cards.filter(c => c.author === userHandle);

  myCards.forEach(card => {
    // If the card has a 'topic', boost that topic score
    if (card.topic) {
        // Base score for creating a card
        const currentScore = scores[card.topic] || 0;
        let boost = 1; 

        // Boost by number of "Hops/Downloads" (if we tracked them locally via receipts)
        // Since we are offline, we rely on the 'hops' count returned in the card metadata
        // In a true mesh, we would sum the 'receipts' you mentioned.
        if (card.hops) {
            boost += (card.hops - 1) * 2; // Each download adds 2 points
        }
        
        scores[card.topic] = currentScore + boost;
    }
  });

  return scores;
};