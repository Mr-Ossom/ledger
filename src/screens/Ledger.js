import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STRINGS } from '../constants';
import { getTransactions } from '../database';

const t = STRINGS.en;

function groupByDay(transactions) {
  const map = new Map();
  for (const tx of transactions) {
    const day = tx.created_at.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(tx);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function LedgerScreen() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [txs, setTxs] = useState([]);

  const load = useCallback(() => {
    setTxs(getTransactions({ type, search, dateFilter: dateFilter === 'all' ? undefined : dateFilter }));
  }, [type, search, dateFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const groups = groupByDay(txs);

  const Chip = ({ label, active, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput value={search} onChangeText={setSearch} placeholder={t.searchPlaceholder} style={styles.searchInput} placeholderTextColor={COLORS.muted} onSubmitEditing={load} />
        <TouchableOpacity onPress={load} style={styles.searchBtn}><Text style={styles.searchBtnText}>Search</Text></TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <View style={styles.chipRow}>
          <Chip label={t.filterAll} active={type === 'all'} onPress={() => setType('all')} />
          <Chip label={t.filterSales} active={type === 'sale'} onPress={() => setType('sale')} />
          <Chip label={t.filterExpenses} active={type === 'expense'} onPress={() => setType('expense')} />
        </View>
        <View style={styles.chipRow}>
          <Chip label={t.filterAll} active={dateFilter === 'all'} onPress={() => setDateFilter('all')} />
          <Chip label={t.filterToday} active={dateFilter === 'today'} onPress={() => setDateFilter('today')} />
          <Chip label={t.filterWeek} active={dateFilter === 'week'} onPress={() => setDateFilter('week')} />
          <Chip label={t.filterMonth} active={dateFilter === 'month'} onPress={() => setDateFilter('month')} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {groups.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>{t.noTransactions}</Text></View>
        ) : groups.map(([day, list]) => {
          const sales = list.filter(x => x.type === 'sale').reduce((s, x) => s + x.amount, 0);
          const expenses = list.filter(x => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
          const profit = sales - expenses;
          const dayLabel = new Date(day).toLocaleDateString('en-GH', { weekday: 'long', month: 'short', day: 'numeric' });
          return (
            <View key={day} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupDay}>{dayLabel}</Text>
                <Text style={[styles.groupProfit, { color: profit >= 0 ? COLORS.teal : COLORS.rust, fontFamily: 'monospace' }]}>GHS {profit.toFixed(2)}</Text>
              </View>
              <View style={styles.groupCard}>
                {list.map(item => (
                  <View key={String(item.id)} style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: item.type === 'sale' ? COLORS.teal : COLORS.rust }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
                      <Text style={styles.meta}>{item.category} {item.payment_method ? `• ${item.payment_method}` : ''} • {new Date(item.created_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <Text style={[styles.money, { color: item.type === 'sale' ? COLORS.teal : COLORS.rust }]}>{item.type === 'sale' ? '+' : '-'}GHS {Number(item.amount).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.dailyTotalRow}>
                <Text style={styles.dailyTotalLabel}>{t.dailyTotal}</Text>
                <Text style={styles.dailyTotalValue}>Sales GHS {sales.toFixed(2)} • Exp GHS {expenses.toFixed(2)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  searchBox: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  searchInput: { flex: 1, height: 44, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.lightGray, color: COLORS.navy },
  searchBtn: { backgroundColor: COLORS.navy, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: COLORS.cream, fontWeight: '800', fontSize: 12 },
  filters: { paddingHorizontal: 16, gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.navy },
  chipTextActive: { color: COLORS.cream },
  group: { marginBottom: 16 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  groupDay: { fontWeight: '800', color: COLORS.navy, fontSize: 13 },
  groupProfit: { fontWeight: '900', fontSize: 13 },
  groupCard: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  desc: { fontWeight: '700', color: COLORS.navy, fontSize: 14 },
  meta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  money: { fontWeight: '900', fontSize: 12, fontFamily: 'monospace' },
  dailyTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 6 },
  dailyTotalLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '700' },
  dailyTotalValue: { fontSize: 11, color: COLORS.muted, fontFamily: 'monospace' },
  empty: { backgroundColor: COLORS.white, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: COLORS.lightGray, marginTop: 16 },
  emptyText: { color: COLORS.muted },
});
