import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import Select from '../components/Select';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STRINGS, SALE_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { addTransaction, getInventory } from '../database';
import { parseTransactionText } from '../utils/claude';
import { startRecording, stopRecording, transcribeAudio } from '../utils/speech';
import { initializePayment, submitPaymentOtp, watchPayment, formatPhone } from '../lib/payments';

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

  // MoMo (Paystack) payment flow
  const [buyerPhone, setBuyerPhone] = useState('');
  const [payStatus, setPayStatus] = useState('idle'); // idle | pending | completed
  const [payStep, setPayStep] = useState('waiting'); // waiting | otp | submitting_otp
  const [payOtp, setPayOtp] = useState('');
  const [payRefCode, setPayRefCode] = useState('');
  const [payDisplayText, setPayDisplayText] = useState('');
  const payUnsub = useRef(null);
  const payResolved = useRef(false);

  useEffect(() => {
    getInventory().then(setInventory).catch(() => {});
    return () => {
      if (payUnsub.current) { payUnsub.current(); payUnsub.current = null; }
    };
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
    if (paymentMethod === 'MoMo') { handleMoMoPayment(val); return; }
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

  const handleMoMoPayment = async (val) => {
    if (!buyerPhone.trim()) { Alert.alert('Enter Buyer\'s MoMo Number'); return; }
    setPayStatus('pending');
    setPayStep('waiting');
    setPayOtp('');
    payResolved.current = false;

    try {
      const paymentInfo = await initializePayment({
        amount: val,
        phone: buyerPhone.trim(),
        description: description.trim(),
        category,
        inventoryItemId: selectedItem?.id || null,
        quantityUsed: selectedItem ? (parseFloat(quantityUsed) || 1) : 0,
      });

      setPayRefCode(paymentInfo.reference);

      // If Paystack asks for OTP / PIN / Voucher code
      if (paymentInfo.chargeStatus === 'send_otp' || paymentInfo.chargeStatus === 'send_pin') {
        setPayStep('otp');
        setPayDisplayText(paymentInfo.displayText || 'Enter the authorization code / OTP sent to buyer phone:');
      } else {
        setPayStep('waiting');
      }

      payUnsub.current = watchPayment(paymentInfo, async (p) => {
        if (payResolved.current) return;
        if (p.status === 'completed') {
          payResolved.current = true;
          if (payUnsub.current) { payUnsub.current(); payUnsub.current = null; }
          try {
            await addTransaction({
              type: 'sale',
              amount: p.amount || val,
              description: p.description || description.trim(),
              category: p.category || category,
              payment_method: 'MoMo',
              is_credit: 0,
              inventoryItemId: p.inventoryItemId || selectedItem?.id || null,
              quantityUsed: p.quantityUsed || (selectedItem ? (parseFloat(quantityUsed) || 1) : 0),
              payment_status: 'completed',
              payment_reference: p.paystackRef || paymentInfo.reference,
            });
            setPayStatus('completed');
            setTimeout(() => navigation.goBack(), 1400);
          } catch (err) {
            setPayStatus('idle');
            Alert.alert('Payment received', 'The payment was received, but it could not be saved to your ledger. It still appears in your Paystack dashboard.');
          }
        } else if (p.status === 'failed') {
          payResolved.current = true;
          if (payUnsub.current) { payUnsub.current(); payUnsub.current = null; }
          setPayStatus('idle');
          setBuyerPhone('');
          Alert.alert('Payment Failed', 'The Mobile Money payment was not completed. Please try again.');
        }
      });

      // Safety timeout — if no resolution within 90s, stop listening
      setTimeout(() => {
        if (!payResolved.current && payUnsub.current) {
          payUnsub.current();
          payUnsub.current = null;
          setPayStatus('idle');
          Alert.alert('Payment Timeout', 'We couldn\'t confirm the payment. Ask the buyer to check their phone for the MoMo prompt, then try again.');
        }
      }, 90000);
    } catch (err) {
      setPayStatus('idle');
      const clean = err?.details?.message || err?.details || err?.message || 'Could not start the Mobile Money payment.';
      Alert.alert('Payment Request Failed', String(clean));
    }
  };

  const handleOtpSubmit = async () => {
    if (!payOtp.trim()) {
      Alert.alert('Enter Code', 'Please enter the OTP or Voucher code.');
      return;
    }
    setPayStep('submitting_otp');
    try {
      await submitPaymentOtp({ reference: payRefCode, otp: payOtp.trim() });
      setPayStep('waiting');
    } catch (e) {
      Alert.alert('Verification Failed', e?.message || 'Could not verify code. Please try again.');
      setPayStep('otp');
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
    if (p.payment_method) setPaymentMethod(p.payment_method);
    setParsing(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.amountBox}>
        <Text style={[styles.label, { color: COLORS.gold }]}>{t.amount} (GHS)</Text>
        <View style={styles.amountRow}>
          <Text style={styles.cedi}>GH₵</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.muted}
          />
        </View>
      </View>

      <View style={styles.card}>
        {/* Inventory Item Picker Button */}
        <Text style={styles.label}>LINK INVENTORY ITEM (OPTIONAL)</Text>
        <TouchableOpacity
          style={styles.inventoryPickerBtn}
          onPress={() => setInventoryModalVisible(true)}
        >
          <Ionicons name="cube-outline" size={18} color={selectedItem ? COLORS.navy : COLORS.muted} style={{ marginRight: 8 }} />
          <Text style={[styles.inventoryPickerText, selectedItem && { color: COLORS.navy, fontWeight: '700' }]}>
            {selectedItem ? `${selectedItem.name} (Stock: ${selectedItem.quantity} ${selectedItem.unit})` : 'Select from inventory…'}
          </Text>
          {selectedItem && (
            <TouchableOpacity onPress={() => setSelectedItem(null)} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {selectedItem && (
          <View style={styles.qtyRow}>
            <Text style={[styles.label, { marginTop: 8 }]}>QUANTITY SOLD ({selectedItem.unit})</Text>
            <TextInput
              style={styles.qtyInput}
              value={quantityUsed}
              onChangeText={handleQtyChange}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={COLORS.muted}
            />
          </View>
        )}

        <Text style={styles.label}>{t.description}</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. 2 bags of rice"
          placeholderTextColor={COLORS.muted}
          onBlur={onFreeText}
        />
        {parsing && <Text style={styles.parsingText}>✨ AI is auto-categorizing…</Text>}

        <Text style={styles.label}>{t.category}</Text>
        <Select
          options={SALE_CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        <Text style={styles.label}>{t.paymentMethod}</Text>
        <View style={styles.pillRow}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.pill,
                paymentMethod === method && styles.pillActive,
                method === 'MoMo' && paymentMethod === 'MoMo' && styles.pillMoMo,
              ]}
              onPress={() => setPaymentMethod(method)}
            >
              <Text
                style={[
                  styles.pillText,
                  paymentMethod === method && styles.pillTextActive,
                ]}
              >
                {method === 'MoMo' ? '📱 MoMo' : method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {paymentMethod === 'MoMo' && (
          <View>
            <Text style={styles.label}>BUYER'S MOMO NUMBER</Text>
            <TextInput
              style={styles.input}
              value={buyerPhone}
              onChangeText={setBuyerPhone}
              placeholder="e.g. 024 123 4567"
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.momoHint}>
              A Mobile Money prompt will be sent to this number. The buyer confirms with their MoMo PIN.
            </Text>
          </View>
        )}

        <TouchableOpacity style={[styles.mic, recording && styles.micActive]} onPress={handleVoice}>
          <Text style={styles.micText}>{recording ? '● Recording… tap to stop' : '🎙️ Tap to speak: "47.50 for milo and bread"'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primary, payStatus === 'pending' && styles.primaryDisabled]}
          onPress={save}
          disabled={payStatus === 'pending'}
        >
          <Text style={styles.primaryText}>
            {paymentMethod === 'MoMo'
              ? (payStatus === 'pending' ? 'Sending request…' : 'Send MoMo Request')
              : t.save}
          </Text>
        </TouchableOpacity>
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

      {/* MoMo payment — waiting for buyer or entering OTP */}
      <Modal visible={payStatus === 'pending'} transparent animationType="fade">
        <View style={styles.payOverlay}>
          <View style={styles.payCard}>
            {payStep === 'otp' || payStep === 'submitting_otp' ? (
              <>
                <Ionicons name="keypad-outline" size={40} color={COLORS.gold} />
                <Text style={styles.payTitle}>Enter MoMo Code</Text>
                <Text style={styles.payText}>
                  {payDisplayText || 'Please enter the authorization code / OTP sent to the buyer:'}
                </Text>
                <TextInput
                  style={[styles.input, { width: '100%', textAlign: 'center', fontSize: 20, letterSpacing: 3, fontWeight: '700', marginTop: 12 }]}
                  value={payOtp}
                  onChangeText={setPayOtp}
                  placeholder="e.g. 123456"
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.muted}
                />
                <TouchableOpacity
                  style={[styles.primary, { width: '100%', marginTop: 14 }]}
                  onPress={handleOtpSubmit}
                  disabled={payStep === 'submitting_otp'}
                >
                  {payStep === 'submitting_otp' ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.primaryText}>Submit Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="phone-portrait-outline" size={40} color={COLORS.gold} />
                <ActivityIndicator size="large" color={COLORS.navy} style={{ marginTop: 14 }} />
                <Text style={styles.payTitle}>Waiting for buyer…</Text>
                <Text style={styles.payText}>
                  A Mobile Money prompt has been sent to {formatPhone(buyerPhone)}. Ask the buyer to enter their PIN to confirm.
                </Text>
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                payResolved.current = true;
                if (payUnsub.current) { payUnsub.current(); payUnsub.current = null; }
                setPayStatus('idle');
              }}
              style={styles.payCancel}
            >
              <Text style={styles.payCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MoMo payment — success */}
      <Modal visible={payStatus === 'completed'} transparent animationType="fade">
        <View style={styles.payOverlay}>
          <View style={styles.payCard}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.teal} />
            <Text style={styles.payTitle}>Payment received!</Text>
            <Text style={styles.payText}>
              GHS {parseFloat(amount).toFixed(2)} from {formatPhone(buyerPhone)} has been confirmed and saved to your ledger.
            </Text>
          </View>
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
  parsingText: { fontSize: 12, color: COLORS.gold, fontWeight: '700', marginTop: 4 },
  mic: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#F0EAE1', alignItems: 'center' },
  micActive: { backgroundColor: '#FCE4E4' },
  micText: { color: COLORS.navy, fontWeight: '700', fontSize: 13 },
  primary: { marginTop: 16, backgroundColor: COLORS.navy, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  secondary: { marginTop: 10, height: 44, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: COLORS.muted, fontWeight: '700', fontSize: 14 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.lightGray, alignItems: 'center', backgroundColor: COLORS.white },
  pillActive: { borderColor: COLORS.navy, backgroundColor: COLORS.navy },
  pillMoMo: { borderColor: COLORS.gold, backgroundColor: COLORS.navy },
  pillText: { fontWeight: '700', fontSize: 13, color: COLORS.navy },
  pillTextActive: { color: COLORS.white },
  momoHint: { fontSize: 12, color: COLORS.muted, marginTop: 6, lineHeight: 17 },
  payOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  payCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  payTitle: { fontSize: 18, fontWeight: '900', color: COLORS.navy, marginTop: 12, textAlign: 'center' },
  payText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  payCancel: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 20 },
  payCancelText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  inventoryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FAF8F5',
  },
  inventoryPickerText: { flex: 1, fontSize: 14, color: COLORS.muted },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  qtyInput: { width: 90, height: 44, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '700', color: COLORS.navy, textAlign: 'center', backgroundColor: COLORS.white },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 12, borderWidth: 1, borderColor: COLORS.lightGray },
  inventoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  qtyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
