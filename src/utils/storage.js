import { Platform } from 'react-native';
let SecureStore = null;
let AsyncStorage = null;
try { SecureStore = require('expo-secure-store'); } catch {}
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

const isWeb = Platform.OS === 'web';
const KEY_ONBOARDED = 'ledger_has_onboarded';
const KEY_SHOP = 'ledger_shop_cache';

export async function setHasOnboarded(v) {
  const val = v ? '1' : '0';
  if (!isWeb && SecureStore) {
    try { await SecureStore.setItemAsync(KEY_ONBOARDED, val); return; } catch {}
  }
  if (AsyncStorage) try { await AsyncStorage.setItem(KEY_ONBOARDED, val); return; } catch {}
  try { if (typeof window !== 'undefined') window.localStorage.setItem(KEY_ONBOARDED, val); } catch {}
}

export async function getHasOnboarded() {
  if (!isWeb && SecureStore) {
    try { const v = await SecureStore.getItemAsync(KEY_ONBOARDED); if (v !== null) return v === '1'; } catch {}
  }
  if (AsyncStorage) {
    try { const v = await AsyncStorage.getItem(KEY_ONBOARDED); if (v !== null) return v === '1'; } catch {}
  }
  try { if (typeof window !== 'undefined') return window.localStorage.getItem(KEY_ONBOARDED) === '1'; } catch {}
  return false;
}

export async function clearHasOnboarded() {
  if (!isWeb && SecureStore) try { await SecureStore.deleteItemAsync(KEY_ONBOARDED); } catch {}
  if (AsyncStorage) try { await AsyncStorage.removeItem(KEY_ONBOARDED); } catch {}
  try { if (typeof window !== 'undefined') window.localStorage.removeItem(KEY_ONBOARDED); } catch {}
}
