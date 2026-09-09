import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/Home';
import LedgerScreen from '../screens/Ledger';
import AddScreen from '../screens/Add';
import ReportsScreen from '../screens/Reports';
import InventoryScreen from '../screens/Inventory';
import { COLORS } from '../constants';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home:      { focused: 'home',      unfocused: 'home-outline' },
  Ledger:    { focused: 'receipt',   unfocused: 'receipt-outline' },
  Reports:   { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
  Inventory: { focused: 'cube',      unfocused: 'cube-outline' },
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
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1} allowFontScaling={false}>
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

/**
 * Modern floating profile dropdown menu matching the user's design reference
 */
function MenuDropdown({ navigation }) {
  const { signOut } = useAuth();
  const headerHeight = useHeaderHeight();
  const [visible, setVisible] = useState(false);

  const close = () => setVisible(false);

  const handleProfile = () => {
    close();
    navigation.navigate('Profile');
  };

  const handleSettings = () => {
    close();
    navigation.navigate('Settings');
  };

  const handleTheme = () => {
    close();
    Alert.alert('Theme', 'Current Theme: CoreLedger Classic (Navy & Gold)\n\nCustom color schemes can be managed in Settings.');
  };

  const handleHelp = () => {
    close();
    Alert.alert(
      'Help Center',
      'Need help with CoreLedger?\n\n• Record transactions with voice or manual entry\n• Track inventory in the Inventory tab\n• Export your data in Settings\n\nSupport: support@coreledger.app'
    );
  };

  const handleLogout = () => {
    close();
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.replace('SignIn');
        },
      },
    ]);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.menuBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="menu" size={26} color={COLORS.navy} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={close}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuCard, { top: headerHeight + 6 }]}>
                {/* Profile Item */}
                <TouchableOpacity style={[styles.menuItem, styles.menuItemActive]} onPress={handleProfile} activeOpacity={0.7}>
                  <View style={styles.activeBar} />
                  <Ionicons name="person-outline" size={18} color="#FFFFFF" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Profile</Text>
                </TouchableOpacity>

                {/* Settings Item */}
                <TouchableOpacity style={styles.menuItem} onPress={handleSettings} activeOpacity={0.7}>
                  <Ionicons name="settings-outline" size={18} color="#FFFFFF" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Settings</Text>
                </TouchableOpacity>

                {/* Theme Item */}
                <TouchableOpacity style={styles.menuItem} onPress={handleTheme} activeOpacity={0.7}>
                  <Ionicons name="moon-outline" size={18} color="#FFFFFF" style={styles.menuIcon} />
                  <Text style={[styles.menuText, { flex: 1 }]}>Theme</Text>
                  <Ionicons name="chevron-forward" size={15} color={COLORS.muted} />
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.menuDivider} />

                {/* Help Center Item */}
                <TouchableOpacity style={styles.menuItem} onPress={handleHelp} activeOpacity={0.7}>
                  <Ionicons name="help-circle-outline" size={18} color="#FFFFFF" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Help center</Text>
                </TouchableOpacity>

                {/* Log out Item */}
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
                  <Ionicons name="log-out-outline" size={18} color="#FF6B6B" style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: '#FF6B6B', fontWeight: '700' }]}>Log out</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    marginRight: 16,
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  menuCard: {
    position: 'absolute',
    right: 16,
    width: 220,
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    position: 'absolute',
    left: 4,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 6,
    marginHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
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

export default function BottomTabNavigator({ navigation }) {
  const menuRight = () => <MenuDropdown navigation={navigation} />;
  const insets = useSafeAreaInsets();
  // Reserve exactly the device's own home-indicator/gesture-bar inset, plus a
  // small fixed buffer — a hardcoded per-platform value clips or floats on
  // devices whose safe area differs (Dynamic Island, gesture nav, etc).
  const tabBarBottomPadding = insets.bottom + 8;
  const tabBarHeight = 52 + tabBarBottomPadding;

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 3,
          borderBottomColor: COLORS.gold,
        },
        headerTintColor: COLORS.navy,
        headerTitleStyle: { fontWeight: '900', fontSize: 17, letterSpacing: 0.3, color: COLORS.navy },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 16,
        },
        tabBarShowLabel: false,
        headerShown: true,
        headerRight: menuRight,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          headerTitle: 'Ledger  •  Home',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
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
        name="InventoryTab"
        component={InventoryScreen}
        options={{
          headerTitle: 'Inventory',
          tabBarIcon: ({ focused }) => <TabIcon label="Inventory" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
