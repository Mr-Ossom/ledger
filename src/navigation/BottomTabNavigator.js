import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/Home';
import LedgerScreen from '../screens/Ledger';
import AddScreen from '../screens/Add';
import ReportsScreen from '../screens/Reports';
import InventoryScreen from '../screens/Inventory';
import { COLORS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getShop } from '../database';

const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

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
 * Premium slide-in drawer menu from the right with backdrop blur and shop details
 */
function MenuDrawer({ navigation }) {
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [shop, setShop] = useState(null);

  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      getShop().then(setShop).catch(() => {});
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const handleNav = (screen) => {
    close();
    navigation.navigate(screen);
  };

  const handleTheme = () => {
    close();
    Alert.alert(
      'Theme & Display',
      'Current Theme: Classic Navy & Gold\n\nHigh contrast mode and currency formatting are configured for Ghana Cedi (GH₵).'
    );
  };

  const handleHelp = () => {
    close();
    Alert.alert(
      'Help & Support',
      'Need assistance with CoreLedger?\n\n• Record sales using voice or manual input\n• Direct Ghana MoMo prompt integration\n• Inventory tracking with low-stock alerts\n• Cloud backup & CSV export in Settings\n\nContact: support@coreledger.app'
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
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.menuIconBadge}>
          <Ionicons name="menu" size={24} color={COLORS.navy} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={close}
      >
        <View style={styles.drawerContainer}>
          {/* Dark Backdrop */}
          <TouchableWithoutFeedback onPress={close}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          {/* Slide-in Drawer Panel */}
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                width: DRAWER_WIDTH,
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 16,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Header: Shop Info & Close Button */}
            <View style={styles.drawerHeader}>
              <View style={styles.shopAvatar}>
                <Ionicons name="storefront" size={24} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop?.name || 'My Shop'}
                </Text>
                <Text style={styles.shopCategory} numberOfLines={1}>
                  {shop?.category || 'Provisions Store'}
                </Text>
                {user?.email && (
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={close} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerDivider} />

            {/* Menu Items */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.menuList}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNav('Profile')} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(217, 148, 10, 0.15)' }]}>
                  <Ionicons name="person-outline" size={18} color={COLORS.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerItemText}>My Profile</Text>
                  <Text style={styles.drawerItemSub}>Daily target & shop details</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNav('Settings')} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                  <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerItemText}>Settings</Text>
                  <Text style={styles.drawerItemSub}>Backup, export & notifications</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={handleTheme} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(46, 125, 90, 0.2)' }]}>
                  <Ionicons name="color-palette-outline" size={18} color="#6EE7B7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerItemText}>Theme & Display</Text>
                  <Text style={styles.drawerItemSub}>Classic Navy & Gold</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={handleHelp} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Ionicons name="help-circle-outline" size={18} color="#93C5FD" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerItemText}>Help & Support</Text>
                  <Text style={styles.drawerItemSub}>FAQ and customer support</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </ScrollView>

            {/* Bottom Section: Log out & App Version */}
            <View style={styles.bottomSection}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                <Ionicons name="log-out-outline" size={18} color="#FF6B6B" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
              <Text style={styles.versionText}>CoreLedger • Ghana Edition</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    marginRight: 14,
    padding: 4,
  },
  menuIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 25, 47, 0.55)',
  },
  drawerPanel: {
    height: '100%',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  shopAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  shopCategory: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '600',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 14,
  },
  menuList: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerItemSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  bottomSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 10,
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
  const menuRight = () => <MenuDrawer navigation={navigation} />;
  const insets = useSafeAreaInsets();
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
