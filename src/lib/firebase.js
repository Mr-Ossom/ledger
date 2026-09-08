import 'react-native-url-polyfill/auto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured() {
  return !!(config.apiKey && config.projectId && config.appId);
}

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured()) {
  app = getApps().length ? getApp() : initializeApp(config);
  try {
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    }
  } catch {
    auth = getAuth(app);
  }
  db = getFirestore(app);
  if (Platform.OS === 'web') {
    enableIndexedDbPersistence(db).catch(() => {});
  }
}

export { app, auth, db };
