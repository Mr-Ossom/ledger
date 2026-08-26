import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import OnboardingScreen from '../screens/Onboarding';
import SignInScreen from '../screens/SignIn';
import ShopSetupScreen from '../screens/ShopSetup';

const Stack = createNativeStackNavigator();

export const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...COLORS,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ShopSetup" component={ShopSetupScreen} />
    </Stack.Navigator>
  );
};