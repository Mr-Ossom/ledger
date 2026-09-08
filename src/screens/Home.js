import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STRINGS } from '../constants';
import { getShop, getTodayTotals, getTransactions } from '../database';
import { generateInsight } from '../utils/claude';

const t = STRINGS.en;

function Money({ value, color }) {
  return <Text style={[styles.money, { color: color || COLORS.navy }]}>GHS {Number(value).toFixed(2)}</Text>;
}

export default function HomeScreen({ navigation }) {
  const [shop, setShop] = useState(null);
  const [totals, setTotals] = useState({ sales: 0, expenses: 0, profit: 0 });
  const [recent, setRecent] = useState([]);
  const [insight, setInsight] = useState(t.insightFallback);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await getShop();
    setShop(s);
    const tot = await getTodayTotals();
    setTotals(tot);
    const tx = await getTransactions({});
    setRecent(tx.slice(0, 5));
    try {
      const target = s?.daily_target || 500;
      const ins = await generateInsight(tx, { target, todayIncome: tot.sales });
      setInsight(ins);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const target = shop?.daily_target || 500;
  const todayIncome = totals.sales;
  const pct = target > 0 ? Math.min(100, (todayIncome / target) * 100) : 0;
  const remaining = Math.max(0, target - todayIncome);
  const hit = todayIncome >= target;

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: item.type === 'sale' ? COLORS.teal : COLORS.rust }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.meta}>{item.category} • {new Date(item.created_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })} {item.payment_method ? `• ${item.payment_method}` : ''}</Text>
      </View>
      <Text style={[styles.moneySmall, { color: item.type === 'sale' ? COLORS.teal : COLORS.rust, fontFamily: 'monospace' }]}>{item.type === 'sale' ? '+' : '-'}GHS {Number(item.amount).toFixed(2)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}>
      <View style={styles.greetingBox}>
        <Text style={styles.greeting}>{t.homeGreeting}, {shop?.name?.split(' ')[0] || 'Ama'} 👋</Text>
        <Text style={styles.shopLine}>{shop?.name || "Ama's Provisions"} • {shop?.category || 'Provisions'}</Text>
      </View>

      <View style={styles.totalsGrid}>
        <View style={[styles.totalCard, { borderLeftColor: COLORS.teal }]}>
          <Text style={styles.totalLabel}>{t.todaySales}</Text>
          <Money value={totals.sales} color={COLORS.teal} />
        </View>
        <View style={[styles.totalCard, { borderLeftColor: COLORS.rust }]}>
          <Text style={styles.totalLabel}>{t.todayExpenses}</Text>
          <Money value={totals.expenses} color={COLORS.rust} />
        </View>
      </View>
      <View style={[styles.totalCard, styles.profitCard]}>
        <Text style={styles.totalLabel}>{t.todayProfit}</Text>
        <Money value={totals.profit} color={totals.profit >= 0 ? COLORS.teal : COLORS.rust} />
        <Text style={styles.profitHint}>{hit ? '🎉 Target hit!' : `${remaining.toFixed(2)} to target`}</Text>
      </View>

      <View style={styles.targetCard}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetTitle}>Daily Target</Text>
          <Text style={[styles.targetValue, { fontFamily: 'monospace' }]}>GHS {todayIncome.toFixed(2)} / {target.toFixed(2)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: hit ? COLORS.gold : COLORS.teal }]} />
        </View>
        <Text style={styles.targetPct}>{pct.toFixed(0)}% • {hit ? 'Great job!' : `GHS ${remaining.toFixed(2)} to go`}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.teal }]} onPress={() => navigation.navigate('AddSale')}><Text style={styles.actionIcon}>＋</Text><Text style={styles.actionText}>{t.recordSale}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.rust }]} onPress={() => navigation.navigate('AddExpense')}><Text style={styles.actionIcon}>－</Text><Text style={styles.actionText}>{t.recordExpense}</Text></TouchableOpacity>
      </View>

      <View style={styles.insightBox}>
        <View style={styles.insightHeader}><Text style={styles.insightTitle}>✦ {t.aiInsight} {hit ? '• On track' : '• Behind target'}</Text><TouchableOpacity onPress={load}><Text style={styles.refresh}>Refresh</Text></TouchableOpacity></View>
        <Text style={styles.insightText}>{insight}</Text>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>{t.recentTransactions}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('LedgerTab')}><Text style={styles.viewAll}>{t.viewAll}</Text></TouchableOpacity>
      </View>
      {recent.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>{t.noTransactions}</Text></View> : <View style={styles.list}>{recent.map(item => <View key={String(item.id)}>{renderItem({ item })}</View>)}</View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  greetingBox: { backgroundColor: COLORS.navy, padding: 20, paddingTop: 14 },
  greeting: { color: COLORS.cream, fontSize: 18, fontWeight: '800' },
  shopLine: { color: COLORS.cream, opacity: 0.8, marginTop: 4, fontSize: 13 },
  totalsGrid: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 0 },
  totalCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: COLORS.lightGray },
  profitCard: { marginHorizontal: 16, marginTop: 12, borderLeftColor: COLORS.gold },
  totalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  money: { fontSize: 20, fontWeight: '900', marginTop: 6, fontFamily: 'monospace' },
  profitHint: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  targetCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.lightGray },
  targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetTitle: { fontWeight: '800', color: COLORS.navy, fontSize: 13 },
  targetValue: { fontWeight: '900', color: COLORS.navy, fontSize: 12 },
  progressTrack: { height: 10, backgroundColor: COLORS.cream, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.lightGray, marginTop: 10 },
  progressFill: { height: '100%', borderRadius: 5 },
  targetPct: { color: COLORS.muted, fontSize: 11, marginTop: 6, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  actionBtn: { flex: 1, height: 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionIcon: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  actionText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  insightBox: { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.lightGray },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  insightTitle: { fontWeight: '800', color: COLORS.navy, fontSize: 12 },
  refresh: { color: COLORS.gold, fontWeight: '700', fontSize: 12 },
  insightText: { color: COLORS.navy, lineHeight: 20, fontSize: 13.5 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontWeight: '800', color: COLORS.navy, fontSize: 15 },
  viewAll: { color: COLORS.navy, fontWeight: '700', fontSize: 13 },
  list: { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  desc: { fontWeight: '700', color: COLORS.navy, fontSize: 14 },
  meta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  moneySmall: { fontWeight: '900', fontSize: 13 },
  empty: { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.lightGray },
  emptyText: { color: COLORS.muted, textAlign: 'center' },
});
