import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DB_KEY = '@the_source_cards';

// 1. GET ALL CARDS
export const getCards = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(DB_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch(e) {
    console.error("Read Error", e);
    return [];
  }
}

// 2. ADD A NEW CARD
export const addCard = async (title, domain, payload) => {
  try {
    const existingCards = await getCards();
    const newCard = {
      id: uuidv4(), // Generate a unique ID
      title,
      domain,
      payload,
      createdAt: Date.now()
    };
    
    const updatedList = [...existingCards, newCard];
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch (e) {
    console.error("Write Error", e);
  }
}

// 3. CLEAR DB (For testing)
export const clearDB = async () => {
  await AsyncStorage.removeItem(DB_KEY);
}