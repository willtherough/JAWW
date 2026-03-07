// model/Storage.js
// DATA ENGINE v2.0
// Handles storage, retrieval, and the new Taxonomy logic.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertTrustedSource, fetchTrustedSources } from './database';

const KEYS = {
  LIBRARY: 'THE_SOURCE_LIBRARY_V2',
  PROFILE: 'THE_SOURCE_PROFILE_V2'
};

// --- TRUSTED SOURCES (SQLite) ---

export const saveTrustedSource = (source) => {
  // The `source` object should contain { uid, handle, publicKey, timestamp }
  return insertTrustedSource(source);
};

export const loadTrustedSources = () => {
  return fetchTrustedSources();
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

// --- SMART QUERYING (The "Shout" Logic) ---

// This mimics a database query: "Find me cards about NFL Rules"
// Supports hierarchy: Query "human/sports" matches "human/sports/football"
export const queryLibrary = async (pathQuery) => {
  const allCards = await loadLibrary();
  
  if (!pathQuery) return allCards;

  return allCards.filter(card => {
    // Check if card.path exists (Legacy cards might not have it)
    return card.path && card.path.startsWith(pathQuery);
  });
};

// --- IDENTITY MANAGEMENT ---

export const loadProfile = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.PROFILE);
    // Default profile if none exists
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch(e) {
    return null;
  }
};

export const saveProfile = async (profile) => {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save profile", e);
  }
};

// --- EXPERTISE CALCULATION (Updated for Taxonomy) ---

// Returns scores based on the new "Path" structure.
// e.g. "human/sports/nfl" gives points to "human" AND "sports"
export const calculateExpertise = (cards, userHandle) => {
  const scores = {};

  // 1. Filter for cards I AUTHORIZED
  const myCards = cards.filter(c => c.genesis && c.genesis.author_id === userHandle);

  myCards.forEach(card => {
    if (card.path) {
        // Split the path: "human/sports/nfl" -> ["human", "sports", "nfl"]
        const categories = card.path.split('/');
        
        // Calculate Boost (Hops = Viral spread)
        let boost = 1;
        if (card.hops) {
            boost += (card.hops * 0.5); // 0.5 points per download
        }

        // Award points to the ROOT category (e.g., "human")
        const rootCategory = categories[0];
        if (rootCategory) {
           scores[rootCategory] = (scores[rootCategory] || 0) + boost;
        }

        // Award partial points to the SUB category (e.g., "sports")
        const subCategory = categories[1];
        if (subCategory) {
           scores[subCategory] = (scores[subCategory] || 0) + (boost * 0.5);
        }
    }
  });

  return scores;
};