import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/Onboarding';
import SignInScreen from '../screens/SignIn';
import ShopSetupScreen from '../screens/ShopSetup';
import BottomTabNavigator from './BottomTabNavigator';
import AddSaleScreen from '../screens/AddSale';
import AddExpenseScreen from '../screens/AddExpense';
import { COLORS } from '../constants';

const Stack = createNativeStackNavigator();

export default function RootNavigator({ initialRoute }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.cream,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: COLORS.cream },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign In' }} />
      <Stack.Screen name="ShopSetup" component={ShopSetupScreen} options={{ title: 'Shop Setup' }} />
      <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AddSale" component={AddSaleScreen} options={{ title: 'Record Sale', presentation: 'modal' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Record Expense', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
