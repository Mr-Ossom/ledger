import React, { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { initDatabase, getShop } from './src/database';
import { COLORS } from './src/constants';
import SplashScreen from './src/screens/SplashScreen';

function Root() {
  const { ready, hasCompletedOnboarding, user } = useAuth();
  const [initialRoute, setInitialRoute] = useState(null);
  const [determining, setDetermining] = useState(true);

  useEffect(() => {
    async function determineRoute() {
      if (!ready) return;
      if (!hasCompletedOnboarding) {
        setInitialRoute('Onboarding');
        setDetermining(false);
        return;
      }
      if (!user) {
        setInitialRoute('SignIn');
        setDetermining(false);
        return;
      }
      try {
        const shop = await getShop();
        if (shop && shop.id) {
          setInitialRoute('Main');
        } else {
          setInitialRoute('ShopSetup');
        }
      } catch {
        setInitialRoute('Main');
      } finally {
        setDetermining(false);
      }
    }
    determineRoute();
  }, [ready, hasCompletedOnboarding, user]);

  if (!ready || determining || !initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={{ marginTop: 12, color: COLORS.navy, fontWeight: '700' }}>CoreLedger</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator initialRoute={initialRoute} />
    </NavigationContainer>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    try { initDatabase(); } catch (e) { console.log('DB init failed', e); }
    setDbReady(true);
  }, []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {dbReady && <Root />}
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
