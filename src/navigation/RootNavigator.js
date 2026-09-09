import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import OnboardingScreen from '../screens/Onboarding';
import SignInScreen from '../screens/SignIn';
import ShopSetupScreen from '../screens/ShopSetup';
import BottomTabNavigator from './BottomTabNavigator';
import AddSaleScreen from '../screens/AddSale';
import AddExpenseScreen from '../screens/AddExpense';
import ProfileScreen from '../screens/Profile';
import SettingsScreen from '../screens/Settings';
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
      <Stack.Screen
        name="ShopSetup"
        component={ShopSetupScreen}
        options={({ navigation }) => ({
          title: 'Shop Setup',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn'))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.cream} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AddSale" component={AddSaleScreen} options={{ title: 'Record Sale', presentation: 'modal' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Record Expense', presentation: 'modal' }} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          presentation: 'modal',
          headerStyle: { backgroundColor: COLORS.navy },
          headerTintColor: COLORS.cream,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          presentation: 'modal',
          headerStyle: { backgroundColor: COLORS.navy },
          headerTintColor: COLORS.cream,
        }}
      />
    </Stack.Navigator>
  );
}
