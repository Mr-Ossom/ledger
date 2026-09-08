import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STRINGS, SALE_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { addTransaction, getInventory } from '../database';
import { parseTransactionText } from '../utils/claude';
import { startRecording, stopRecording, transcribeAudio } from '../utils/speech';

const t = STRINGS.en;

export default function AddSaleScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [recording, setRecording] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Inventory linking
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // { id, name, sellingPrice, unit }
  const [quantityUsed, setQuantityUsed] = useState('1');
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  useEffect(() => {
    getInventory().then(setInventory).catch(() => {});
  }, []);

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const selectInventoryItem = (item) => {
    setSelectedItem(item);
    setDescription(item.name);
    const qty = parseFloat(quantityUsed) || 1;
    setAmount(String((item.sellingPrice * qty).toFixed(2)));
    setInventoryModalVisible(false);
  };

  const handleQtyChange = (v) => {
    setQuantityUsed(v);
    if (selectedItem) {
      const qty = parseFloat(v) || 1;
      setAmount(String((selectedItem.sellingPrice * qty).toFixed(2)));
    }
  };

  const save = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { Alert.alert('Enter a valid amount'); return; }
    if (!description.trim()) { Alert.alert('Enter a description'); return; }
    try {
      await addTransaction({
        type: 'sale',
        amount: val,
        description: description.trim(),
        category,
        payment_method: paymentMethod,
        is_credit: paymentMethod === 'Credit' ? 1 : 0,
        inventoryItemId: selectedItem?.id || null,
        quantityUsed: selectedItem ? (parseFloat(quantityUsed) || 1) : 0,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save Failed', err?.message || 'Could not save sale. Please check your network and Firebase rules.');
    }
  };

  const handleVoice = async () => {
    if (recording) {
      setRecording(false);
      const uri = await stopRecording();
      const text = await transcribeAudio(uri);
      await applyParsed(text);
      return;
    }
    const ok = await startRecording();
    if (!ok) { const text = '47.50 for milo and bread'; await applyParsed(text); return; }
    setRecording(true);
    setTimeout(async () => {
      setRecording(false);
      await stopRecording();
      const text = await transcribeAudio(null);
      await applyParsed(text);
    }, 1800);
  };

  const applyParsed = async (text) => {
    setParsing(true);
    const p = await parseTransactionText(text);
    if (p.amount) setAmount(String(p.amount));
    if (p.description) setDescription(p.description);
    if (p.category) setCategory(p.category);
    if (p.payment_method) setPaymentMethod(p.payment_method);
    setParsing(false);
  };

  const onFreeText = async () => {
    if (!description) return;
    setParsing(true);
    const p = await parseTransactionText(description);
    if (p.amount) setAmount(String(p.amount));
    if (p.category) setCategory(p.category);
    setParsing(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.amountBox}>
        <Text style={styles.label}>{t.amount}</Text>
        <View style={styles.amountRow}>
          <Text style={styles.cedi}>GHS</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" style={styles.amountInput} placeholderTextColor={COLORS.muted} />
        </View>
      </View>

      <View style={styles.card}>
        {/* Inventory item picker */}
        <Text style={styles.label}>LINK TO INVENTORY ITEM (optional)</Text>
        <TouchableOpacity
          style={styles.inventoryPicker}
          onPress={() => setInventoryModalVisible(true)}
        >
          <Ionicons name="cube-outline" size={18} color={selectedItem ? COLORS.teal : COLORS.muted} />
          <Text style={[styles.inventoryPickerText, selectedItem && { color: COLORS.navy }]}>
            {selectedItem ? selectedItem.name : 'Select an item to auto-deduct stock'}
          </Text>
          {selectedItem
            ? <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close-circle" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            : <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          }
        </TouchableOpacity>

        {selectedItem && (
          <View style={styles.qtyRow}>
            <Text style={styles.label}>QUANTITY SOLD</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={quantityUsed}
              onChangeText={handleQtyChange}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.unitLabel}>{selectedItem.unit}</Text>
          </View>
        )}

        {selectedItem && (
          <View style={styles.stockInfo}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.teal} />
            <Text style={styles.stockInfoText}>
              {' '}Current stock: {inventory.find(i => i.id === selectedItem.id)?.quantity ?? '?'} {selectedItem.unit} — will deduct {quantityUsed || 1} on save
            </Text>
          </View>
        )}

        <Text style={styles.label}>{t.description}</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder={t.descriptionSalePlaceholder} style={styles.input} placeholderTextColor={COLORS.muted} onBlur={onFreeText} />
        <TouchableOpacity onPress={onFreeText} style={styles.parseLink}><Text style={styles.parseLinkText}>{parsing ? 'Parsing…' : '✦ Parse with AI'}</Text></TouchableOpacity>

        <Text style={styles.label}>{t.category}</Text>
        <View style={styles.pickerWrap}><Picker selectedValue={category} onValueChange={setCategory} style={{ color: COLORS.navy }} itemStyle={{ color: COLORS.navy }} dropdownIconColor={COLORS.navy}>{SALE_CATEGORIES.map(c => <Picker.Item key={c} label={c} value={c} color={COLORS.navy} />)}</Picker></View>

        <Text style={styles.label}>{t.paymentMethod}</Text>
        <View style={styles.segment}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity key={m} onPress={() => setPaymentMethod(m)} style={[styles.segBtn, paymentMethod === m && styles.segActive]}>
              <Text style={[styles.segText, paymentMethod === m && styles.segTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.mic, recording && styles.micActive]} onPress={handleVoice}>
          <Text style={styles.micText}>{recording ? '● Recording… tap to stop' : '🎙️ Tap to speak: "47.50 for milo and bread"'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primary} onPress={save}><Text style={styles.primaryText}>{t.save}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => navigation.goBack()}><Text style={styles.secondaryText}>{t.cancel}</Text></TouchableOpacity>
      </View>

      {/* Inventory picker modal */}
      <Modal visible={inventoryModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.cream, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.navy }}>Select Item</Text>
            <TouchableOpacity onPress={() => setInventoryModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, color: COLORS.navy, fontSize: 14 }}
              placeholder="Search…"
              placeholderTextColor={COLORS.muted}
              value={inventorySearch}
              onChangeText={setInventorySearch}
            />
          </View>
          <FlatList
            data={filteredInventory}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.inventoryRow} onPress={() => selectInventoryItem(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: COLORS.navy }}>{item.name}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>
                    {item.quantity} {item.unit} in stock • GHS {Number(item.sellingPrice).toFixed(2)}/unit
                  </Text>
                </View>
                <View style={[styles.qtyBadge, { backgroundColor: item.quantity <= item.lowStockThreshold ? '#D9940A' : COLORS.teal }]}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{item.quantity} {item.unit}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: COLORS.muted }}>No inventory items. Add items in the Inventory tab.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.cream, padding: 16 },
  amountBox: { backgroundColor: COLORS.navy, borderRadius: 16, padding: 16, marginBottom: 14 },
  label: { fontWeight: '700', color: COLORS.navy, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cedi: { color: COLORS.gold, fontWeight: '900', fontSize: 16, fontFamily: 'monospace' },
  amountInput: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, height: 56, paddingHorizontal: 14, fontSize: 22, fontWeight: '900', color: COLORS.navy, fontFamily: 'monospace' },
  card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.lightGray },
  input: { height: 52, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.navy, backgroundColor: COLORS.white },
  pickerWrap: { borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.white },
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  segActive: { backgroundColor: COLORS.navy },
  segText: { fontWeight: '700', color: COLORS.navy, fontSize: 12 },
  segTextActive: { color: COLORS.cream },
  parseLink: { alignSelf: 'flex-end', paddingVertical: 6 },
  parseLinkText: { color: COLORS.teal, fontWeight: '700', fontSize: 12 },
  mic: { marginTop: 14, backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12, padding: 14, alignItems: 'center' },
  micActive: { backgroundColor: COLORS.rust, borderColor: COLORS.rust },
  micText: { fontWeight: '700', color: COLORS.navy, fontSize: 13, textAlign: 'center' },
  primary: { backgroundColor: COLORS.gold, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { color: COLORS.navy, fontWeight: '900', fontSize: 16 },
  secondary: { alignItems: 'center', padding: 14 },
  secondaryText: { color: COLORS.muted, fontWeight: '700' },
  // Inventory
  inventoryPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12,
    paddingHorizontal: 14, height: 52, backgroundColor: COLORS.white,
  },
  inventoryPickerText: { flex: 1, color: COLORS.muted, fontSize: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  unitLabel: { fontWeight: '700', color: COLORS.muted },
  stockInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 },
  stockInfoText: { color: COLORS.teal, fontSize: 12, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.lightGray, marginBottom: 12,
  },
  inventoryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.lightGray,
  },
  qtyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
});
