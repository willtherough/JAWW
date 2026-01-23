import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTEXT_KEY = 'THE_SOURCE_CONTEXT_V1';

// Load all notes
export const loadContext = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(CONTEXT_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : {};
  } catch(e) {
    return {};
  }
};

// Save a note attached to a specific card ID
export const addNote = async (cardId, noteText, author) => {
  const currentContext = await loadContext();
  
  // If no notes exist for this card, create an array
  if (!currentContext[cardId]) {
    currentContext[cardId] = [];
  }

  const newNote = {
    id: Date.now().toString(),
    text: noteText,
    author: author,
    timestamp: new Date().toISOString()
  };

  currentContext[cardId].push(newNote);
  
  await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(currentContext));
  return currentContext;
};

// Get notes for a specific card
export const getNotesForCard = (cardId, contextStore) => {
  return contextStore[cardId] || [];
};