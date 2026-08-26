import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, STRINGS } from '../constants';
const t = STRINGS.en;
export default function AddScreen({ navigation }) {
  return (
    <View style={styles.container}>
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
      <View style={styles.voiceBox}>
        <Text style={styles.voiceTitle}>🎙️ Quick voice entry</Text>
        <Text style={styles.voiceHint}>Say “47.50 for milo and bread” on the next screen — AI will parse it.</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream, padding: 16 },
  headerBox: { backgroundColor: COLORS.navy, borderRadius: 16, padding: 18, marginBottom: 16 },
  headerTitle: { color: COLORS.cream, fontSize: 20, fontWeight: '900' },
  headerSub: { color: COLORS.cream, opacity: 0.8, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, borderRadius: 18, padding: 18, minHeight: 180 },
  cardIcon: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  cardTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900', marginTop: 12 },
  cardDesc: { color: COLORS.white, opacity: 0.9, marginTop: 6, fontSize: 12 },
  cardCTA: { marginTop: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  cardCTAText: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  voiceBox: { marginTop: 16, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.lightGray },
  voiceTitle: { fontWeight: '800', color: COLORS.navy },
  voiceHint: { color: COLORS.muted, marginTop: 6, lineHeight: 18, fontSize: 13 },
});
