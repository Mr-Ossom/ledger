import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Modal, Alert, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STRINGS } from '../constants';
import { getTransactions, updateTransaction } from '../database';

const t = STRINGS.en;

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AddScreen({ navigation }) {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [selected, setSelected] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCredits = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getTransactions({});
      // Show unpaid credit sales only (paid ones have credit_paid = 1)
      const creditSales = all.filter(tx => (tx.is_credit === 1 || tx.is_credit === true) && !tx.credit_paid);
      setCredits(creditSales);
    } catch {
      setCredits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadCredits(); }, [loadCredits]));

  const totalOutstanding = credits.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);

  const openEdit = (tx) => {
    setSelected(tx);
    setEditName(tx.buyer_name || '');
    setEditPhone(tx.buyer_phone || '');
  };

  const closeEdit = () => { setSelected(null); setSaving(false); };

  const handleSave = async () => {
    if (!editName.trim()) { Alert.alert('Name required', 'Please enter the buyer\'s name.'); return; }
    setSaving(true);
    try {
      await updateTransaction(selected.id, {
        buyer_name: editName.trim(),
        buyer_phone: editPhone.trim(),
      });
      setCredits(prev => prev.map(tx =>
        tx.id === selected.id
          ? { ...tx, buyer_name: editName.trim(), buyer_phone: editPhone.trim() }
          : tx
      ));
      closeEdit();
    } catch (err) {
      Alert.alert('Save failed', err?.message || 'Could not update.');
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    Alert.alert(
      'Mark as Paid',
      `Mark GHS ${Number(selected.amount).toFixed(2)} from ${selected.buyer_name || 'this buyer'} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          style: 'default',
          onPress: async () => {
            setSaving(true);
            try {
              await updateTransaction(selected.id, { credit_paid: 1, is_credit: 0 });
              setCredits(prev => prev.filter(tx => tx.id !== selected.id));
              closeEdit();
            } catch (err) {
              Alert.alert('Failed', err?.message || 'Could not mark as paid.');
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <Text style={styles.headerSub}>Choose what you want to record</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={[styles.card, { backgroundColor: COLORS.teal }]} onPress={() => navigation.navigate('AddSale')}>
          <Text style={styles.cardIcon}>＋</Text>
          <Text style={styles.cardTitle}>{t.recordSale}</Text>
          <Text style={styles.cardDesc}>Cash, MoMo or Credit</Text>
          <View style={styles.cardCTA}><Text style={styles.cardCTAText}>Add sale →</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, { backgroundColor: COLORS.rust }]} onPress={() => navigation.navigate('AddExpense')}>
          <Text style={styles.cardIcon}>－</Text>
          <Text style={styles.cardTitle}>{t.recordExpense}</Text>
          <Text style={styles.cardDesc}>Transport, restock, etc.</Text>
          <View style={styles.cardCTA}><Text style={styles.cardCTAText}>Add expense →</Text></View>
        </TouchableOpacity>
      </View>

      {/* Credit Sales */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Credit Sales</Text>
        {credits.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>GHS {totalOutstanding.toFixed(2)} owed</Text>
          </View>
        )}
      </View>

      <View style={styles.creditCard}>
        {loading ? (
          <ActivityIndicator color={COLORS.navy} style={{ paddingVertical: 24 }} />
        ) : credits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No outstanding credit sales.</Text>
            <Text style={styles.emptyHint}>Sales recorded as "Credit" will appear here until marked paid.</Text>
          </View>
        ) : (
          credits.map((tx, i) => (
            <TouchableOpacity
              key={String(tx.id)}
              style={[styles.creditRow, i < credits.length - 1 && styles.creditRowBorder]}
              onPress={() => openEdit(tx)}
              activeOpacity={0.7}
            >
              <View style={styles.creditDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.creditDesc} numberOfLines={1}>{tx.description || '—'}</Text>
                <Text style={styles.creditBuyer}>
                  👤 {tx.buyer_name || 'Unknown buyer'}
                  {tx.buyer_phone ? `  ·  ${tx.buyer_phone}` : ''}
                </Text>
                <Text style={styles.creditMeta}>{tx.category} · {fmtDate(tx.created_at)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.creditAmount}>GHS {Number(tx.amount).toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Edit / Mark Paid Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEdit}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Credit Sale</Text>
            <TouchableOpacity onPress={closeEdit}>
              <Ionicons name="close" size={24} color={COLORS.navy} />
            </TouchableOpacity>
          </View>

          {selected && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Amount summary */}
              <View style={styles.amountBanner}>
                <Text style={styles.amountBannerLabel}>Amount Owed</Text>
                <Text style={styles.amountBannerValue}>GHS {Number(selected.amount).toFixed(2)}</Text>
                <Text style={styles.amountBannerSub}>{selected.description} · {fmtDate(selected.created_at)}</Text>
              </View>

              {/* Buyer details */}
              <Text style={styles.fieldLabel}>BUYER NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Ama Serwaa"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.fieldLabel}>BUYER PHONE</Text>
              <TextInput
                style={styles.fieldInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="e.g. 024 123 4567"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.muted}
              />

              {/* Save buyer info */}
              <TouchableOpacity
                style={[styles.btnSave, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.btnSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              {/* Mark as paid */}
              <TouchableOpacity
                style={[styles.btnPaid, saving && { opacity: 0.6 }]}
                onPress={handleMarkPaid}
                disabled={saving}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.btnPaidText}>Mark as Paid</Text>
              </TouchableOpacity>

              <Text style={styles.paidHint}>
                Marking as paid will remove this entry from the outstanding credit list.
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  headerBox: { backgroundColor: COLORS.navy, borderRadius: 16, padding: 18, marginBottom: 16 },
  headerTitle: { color: COLORS.cream, fontSize: 20, fontWeight: '900' },
  headerSub: { color: COLORS.cream, opacity: 0.8, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { flex: 1, borderRadius: 18, padding: 18, minHeight: 180 },
  cardIcon: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  cardTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900', marginTop: 12 },
  cardDesc: { color: COLORS.white, opacity: 0.9, marginTop: 6, fontSize: 12 },
  cardCTA: { marginTop: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  cardCTAText: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontWeight: '900', color: COLORS.navy, fontSize: 15 },
  badge: { backgroundColor: COLORS.rust, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: COLORS.white, fontWeight: '800', fontSize: 11 },
  creditCard: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden' },
  creditRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  creditRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  creditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.rust },
  creditDesc: { fontWeight: '700', color: COLORS.navy, fontSize: 14 },
  creditBuyer: { color: COLORS.rust, fontSize: 11, fontWeight: '700', marginTop: 2 },
  creditMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  creditAmount: { fontWeight: '900', color: COLORS.rust, fontSize: 13, fontFamily: 'monospace' },
  empty: { paddingVertical: 28, alignItems: 'center', paddingHorizontal: 16 },
  emptyText: { color: COLORS.navy, fontWeight: '700', fontSize: 14 },
  emptyHint: { color: COLORS.muted, fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  // Modal
  modal: { flex: 1, backgroundColor: COLORS.cream },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, backgroundColor: COLORS.white },
  modalTitle: { fontWeight: '900', fontSize: 18, color: COLORS.navy },
  amountBanner: { backgroundColor: COLORS.navy, borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  amountBannerLabel: { color: COLORS.cream, opacity: 0.8, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  amountBannerValue: { color: COLORS.gold, fontSize: 32, fontWeight: '900', fontFamily: 'monospace', marginTop: 6 },
  amountBannerSub: { color: COLORS.cream, opacity: 0.7, fontSize: 12, marginTop: 6, textAlign: 'center' },
  fieldLabel: { fontWeight: '700', color: COLORS.navy, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },
  fieldInput: { height: 52, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.navy, backgroundColor: COLORS.white },
  btnSave: { marginTop: 24, backgroundColor: COLORS.navy, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  btnSaveText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  btnPaid: { marginTop: 12, backgroundColor: COLORS.teal, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnPaidText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  paidHint: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 17 },
});
