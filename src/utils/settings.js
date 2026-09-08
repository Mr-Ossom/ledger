import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'app_setting_';

export async function getSetting(key, defaultValue = null) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key, value) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

export async function getAllSettings() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(k => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(appKeys);
    const out = {};
    for (const [k, v] of pairs) {
      try { out[k.replace(PREFIX, '')] = JSON.parse(v); } catch {}
    }
    return out;
  } catch {
    return {};
  }
}
