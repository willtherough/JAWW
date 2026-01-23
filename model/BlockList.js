import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'THE_SOURCE_BLOCKLIST_V1';

// 1. Load the list of banned public keys
export const loadBlockList = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch(e) {
    return [];
  }
};

// 2. Add a Public Key to the ban list
export const blockUser = async (publicKey, handle) => {
  const currentList = await loadBlockList();
  
  // Safety Check: Prevent duplicates
  if (currentList.some(entry => entry.publicKey === publicKey)) return currentList;

  const newList = [...currentList, { publicKey, handle, blockedAt: new Date().toISOString() }];
  
  await AsyncStorage.setItem(KEY, JSON.stringify(newList));
  return newList;
};

// 3. Remove from ban list (Forgiveness)
export const unblockUser = async (publicKey) => {
  const currentList = await loadBlockList();
  const newList = currentList.filter(entry => entry.publicKey !== publicKey);
  await AsyncStorage.setItem(KEY, JSON.stringify(newList));
  return newList;
};

// 4. Check if a key is banned (The "ID Check")
export const isBlocked = (publicKey, blockList) => {
  if (!publicKey) return false;
  return blockList.some(entry => entry.publicKey === publicKey);
};