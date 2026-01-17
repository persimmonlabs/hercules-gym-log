/**
 * Utility to clear potentially corrupted data from AsyncStorage
 * Run this if the app is crashing due to serialization errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllAsyncStorage = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('[clearCorruptedData] Found keys:', keys);
    await AsyncStorage.multiRemove(keys);
    console.log('[clearCorruptedData] Cleared all AsyncStorage data');
  } catch (error) {
    console.error('[clearCorruptedData] Error clearing AsyncStorage:', error);
  }
};

export const inspectAsyncStorage = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('[inspectAsyncStorage] Keys:', keys);
    
    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        console.log(`[inspectAsyncStorage] ${key}:`, value?.substring(0, 200));
      } catch (e) {
        console.error(`[inspectAsyncStorage] Error reading ${key}:`, e);
      }
    }
  } catch (error) {
    console.error('[inspectAsyncStorage] Error:', error);
  }
};
