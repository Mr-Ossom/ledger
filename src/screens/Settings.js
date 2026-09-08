import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { getSetting, setSetting } from '../utils/settings';
import { getTransactions, clearAll } from '../database';
import { toCSV } from '../utils/csv';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function RowItem({ icon, label, value, onPress, danger, toggle, toggleValue, onToggle }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.65}
      disabled={toggle}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? '#FEF0EF' : COLORS.cream }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.rust : COLORS.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.rust }]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {toggle
        ? <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: COLORS.lightGray, true: COLORS.teal }}
            thumbColor={COLORS.white}
          />
        : <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      }
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const [lowStockDefault, setLowStockDefault] = useState(5);
  const [currency, setCurrency] = useState('GHS');
  const [exportOnClear, setExportOnClear] = useState(false);

  const load = useCallback(async () => {
    const ls = await getSetting('lowStockDefault', 5);
    const curr = await getSetting('currency', 'GHS');
    setLowStockDefault(ls);
    setCurrency(curr);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleCurrency = async () => {
    const next = currency === 'GHS' ? 'USD' : 'GHS';
    await setSetting('currency', next);
    setCurrency(next);
  };

  const handleExport = async () => {
    const txs = await getTransactions({});
    const csv = toCSV(txs);
    try {
      await Share.share({ message: csv, title: 'Ledger Export' });
    } catch {
      Alert.alert('CSV Ready', csv.slice(0, 400) + '...');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all transactions. Inventory and shop info will be kept. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Transactions', style: 'destructive',
          onPress: async () => {
            await clearAll();
            Alert.alert('Done', 'All transactions have been cleared.');
          },
        },
      ]
    );
  };

  const adjustLowStock = async (delta) => {
    const next = Math.max(1, lowStockDefault + delta);
    setLowStockDefault(next);
    await setSetting('lowStockDefault', next);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      <Section title="Inventory">
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: COLORS.cream }]}>
            <Ionicons name="warning-outline" size={18} color={COLORS.navy} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Default Low Stock Alert</Text>
            <Text style={styles.rowValue}>Warn when stock falls below {lowStockDefault} units</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustLowStock(-1)}>
              <Ionicons name="remove" size={16} color={COLORS.navy} />
            </TouchableOpacity>
            <Text style={styles.stepVal}>{lowStockDefault}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustLowStock(1)}>
              <Ionicons name="add" size={16} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
        </View>
      </Section>

      <Section title="Data">
        <RowItem
          icon="download-outline"
          label="Export Transactions as CSV"
          value="Share via WhatsApp or Email"
          onPress={handleExport}
        />
        <View style={styles.divider} />
        <RowItem
          icon="trash-outline"
          label="Clear All Transactions"
          value="Permanently delete transaction history"
          onPress={handleClearData}
          danger
        />
      </Section>

      <Section title="About">
        <RowItem icon="information-circle-outline" label="App Version" value="Ledger v1.0 • Ghana" onPress={() => {}} />
        <View style={styles.divider} />
        <RowItem icon="storefront-outline" label="Built for Ghanaian Small Businesses" value="Offline-first • Firebase-synced" onPress={() => {}} />
      </Section>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '700', color: COLORS.navy, fontSize: 14 },
  rowValue: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginHorizontal: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.lightGray,
    alignItems: 'center', justifyContent: 'center',
  },
  stepVal: { fontWeight: '900', color: COLORS.navy, fontSize: 16, fontFamily: 'monospace', minWidth: 24, textAlign: 'center' },
});
