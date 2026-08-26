import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let SecureStore = null;
let AsyncStorage = null;
try { SecureStore = require('expo-secure-store'); } catch {}
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

const isWeb = Platform.OS === 'web';

const ExpoSecureStoreAdapter = {
  getItem: async (key) => {
    if (!isWeb && SecureStore) try { return await SecureStore.getItemAsync(key); } catch {}
    if (AsyncStorage) try { return await AsyncStorage.getItem(key); } catch {}
    try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null; } catch { return null; }
  },
  setItem: async (key, value) => {
    if (!isWeb && SecureStore) try { await SecureStore.setItemAsync(key, value); return; } catch {}
    if (AsyncStorage) try { await AsyncStorage.setItem(key, value); return; } catch {}
    try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key) => {
    if (!isWeb && SecureStore) try { await SecureStore.deleteItemAsync(key); } catch {}
    if (AsyncStorage) try { await AsyncStorage.removeItem(key); } catch {}
    try { if (typeof window !== 'undefined') window.localStorage.removeItem(key); } catch {}
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(url, anon, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function isSupabaseConfigured() { return !!url && !!anon; }
