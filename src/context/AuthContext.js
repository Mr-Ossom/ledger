import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getHasOnboarded, setHasOnboarded, clearHasOnboarded } from '../utils/storage';
import { getShop, clearAll } from '../database';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
  const [hasOnboarded, setHasOnboardedState] = useState(false);
  const [ready, setReady] = useState(false);
  const [shop, setShop] = useState(null);

  const refresh = useCallback(async () => {
    const flag = await getHasOnboarded();
    let s = null;
    try { s = getShop(); } catch {}
    if (s && s.id) {
      setHasCompletedOnboardingState(true);
      setHasOnboardedState(true);
      setShop(s);
    } else {
      setHasCompletedOnboardingState(flag);
      setHasOnboardedState(flag);
      setShop(null);
    }
  }, []);

  useEffect(() => { refresh().finally(() => setReady(true)); }, [refresh]);

  const completeOnboarding = useCallback(async () => {
    await setHasOnboarded(true);
    setHasCompletedOnboardingState(true);
    setHasOnboardedState(true);
    try { setShop(getShop()); } catch {}
  }, []);

  const completeLogin = useCallback(async () => {
    await setHasOnboarded(true);
    setHasCompletedOnboardingState(true);
    setHasOnboardedState(true);
    try { setShop(getShop()); } catch {}
  }, []);

  const signOut = useCallback(async () => {
    try { clearAll(); } catch {}
    setShop(null);
    setHasOnboardedState(false);
  }, []);

  return (
    <AuthContext.Provider value={{ hasCompletedOnboarding, hasOnboarded, ready, shop, refresh, completeOnboarding, completeLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
