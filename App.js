import React, { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { initDatabase } from './src/database';
import { COLORS } from './src/constants';
import SplashScreen from './src/screens/SplashScreen';

function Root() {
  const { ready, hasCompletedOnboarding, hasOnboarded } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={{ marginTop: 12, color: COLORS.navy, fontWeight: '700' }}>CoreLedger</Text>
      </View>
    );
  }
  let initialRoute = 'Onboarding';
  if (!hasCompletedOnboarding) initialRoute = 'Onboarding';
  else if (!hasOnboarded) initialRoute = 'SignIn';
  else initialRoute = 'Main';
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
