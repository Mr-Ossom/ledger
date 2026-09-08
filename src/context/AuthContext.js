import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getHasOnboarded, setHasOnboarded } from '../utils/storage';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
  const [hasOnboarded, setHasOnboardedState] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const flag = await getHasOnboarded();
    setHasCompletedOnboardingState(flag);
    setHasOnboardedState(flag);
    if (isFirebaseConfigured() && auth) {
      const u = auth.currentUser;
      setUser(u || null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
    if (!isFirebaseConfigured() || !auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, [refresh]);

  const completeOnboarding = useCallback(async () => {
    await setHasOnboarded(true);
    setHasCompletedOnboardingState(true);
    setHasOnboardedState(true);
  }, []);

  const completeLogin = useCallback(async () => {
    await setHasOnboarded(true);
    setHasOnboardedState(true);
    setHasCompletedOnboardingState(true);
  }, []);

  const signOut = useCallback(async () => {
    if (isFirebaseConfigured() && auth) try { await fbSignOut(auth); } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ hasCompletedOnboarding, hasOnboarded, ready, user, refresh, completeOnboarding, completeLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
