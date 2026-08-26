import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/Home';
import LedgerScreen from '../screens/Ledger';
import AddScreen from '../screens/Add';
import ReportsScreen from '../screens/Reports';
import ProfileScreen from '../screens/Profile';
import { COLORS } from '../constants';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home:    { focused: 'home',      unfocused: 'home-outline' },
  Ledger:  { focused: 'receipt',   unfocused: 'receipt-outline' },
  Reports: { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
  Profile: { focused: 'person',    unfocused: 'person-outline' },
};

function TabIcon({ label, focused }) {
  const iconName = focused ? ICONS[label].focused : ICONS[label].unfocused;
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={iconName}
        size={24}
        color={focused ? COLORS.navy : COLORS.muted}
      />
      <Text style={[styles.label, focused && styles.labelActive]}>
        {label}
      </Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

function AddTabIcon({ focused }) {
  return (
    <View style={styles.addWrapper}>
      <View style={[styles.addButton, focused && styles.addButtonActive]}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  label: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: COLORS.navy,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    marginTop: 1,
  },
  addWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  addButtonActive: {
    backgroundColor: '#C8941F',
  },
});

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.cream,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, letterSpacing: 0.4, color: COLORS.cream },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 86 : 70,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 16,
        },
        tabBarShowLabel: false,
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          headerTitle: 'Ledger  •  Home',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 3,
            borderBottomColor: COLORS.gold,
          },
          headerTitleStyle: { fontWeight: '900', fontSize: 17, letterSpacing: 0.3, color: COLORS.navy },
          headerTintColor: COLORS.navy,
        }}
      />
      <Tab.Screen
        name="LedgerTab"
        component={LedgerScreen}
        options={{
          headerTitle: 'Ledger',
          tabBarIcon: ({ focused }) => <TabIcon label="Ledger" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={AddScreen}
        options={{
          headerTitle: 'Add Transaction',
          tabBarIcon: ({ focused }) => <AddTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          headerTitle: 'Reports',
          tabBarIcon: ({ focused }) => <TabIcon label="Reports" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          headerTitle: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
