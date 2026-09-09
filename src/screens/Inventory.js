import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, Modal, Alert, ActivityIndicator,
} from 'react-native';
import Select from '../components/Select';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, INVENTORY_UNITS, INVENTORY_CATEGORIES } from '../constants';
import { getInventory, saveInventoryItem, deleteInventoryItem } from '../database';

const EMPTY_ITEM = {
  id: null,
  name: '',
  category: 'Provisions',
  quantity: '',
  unit: 'pcs',
  costPrice: '',
  sellingPrice: '',
  lowStockThreshold: '5',
};

export default function InventoryScreen() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_ITEM);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getInventory();
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = filtered.filter(i => i.quantity <= i.lowStockThreshold);
  const normalItems = filtered.filter(i => i.quantity > i.lowStockThreshold);

  const openAdd = () => { setForm(EMPTY_ITEM); setModalVisible(true); };
  const openEdit = (item) => {
    setForm({
      id: item.id,
      name: item.name,
      category: item.category || 'Provisions',
      quantity: String(item.quantity),
      unit: item.unit || 'pcs',
      costPrice: String(item.costPrice),
      sellingPrice: String(item.sellingPrice),
      lowStockThreshold: String(item.lowStockThreshold),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Item name is required'); return; }
    setSaving(true);
    try {
      await saveInventoryItem({
        id: form.id,
        name: form.name.trim(),
        category: form.category,
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit,
        costPrice: parseFloat(form.costPrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        lowStockThreshold: parseFloat(form.lowStockThreshold) || 5,
      });
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert('Firebase Error', err?.message || 'Could not save inventory item to Firestore. Check your Firestore rules.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Item', `Remove "${item.name}" from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteInventoryItem(item.id);
          load();
        }
      },
    ]);
  };

  const renderItem = ({ item, isLow }) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.itemRow, isLow && styles.itemRowLow]}
      onPress={() => openEdit(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.itemIcon, { backgroundColor: isLow ? '#FFF3CD' : COLORS.cream }]}>
        <Ionicons name="cube-outline" size={20} color={isLow ? '#D9940A' : COLORS.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemMeta}>{item.category} • GHS {Number(item.sellingPrice).toFixed(2)}/unit</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={[styles.qtyBadge, { backgroundColor: isLow ? '#D9940A' : COLORS.teal }]}>
          <Text style={styles.qtyText}>{item.quantity} {item.unit}</Text>
        </View>
        {isLow && <Text style={styles.lowLabel}>LOW STOCK</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory…"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.navy} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Summary row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{items.length}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#D9940A' }]}>
              <Text style={[styles.summaryValue, { color: '#D9940A' }]}>{lowStockItems.length}</Text>
              <Text style={styles.summaryLabel}>Low Stock</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: COLORS.teal }]}>
              <Text style={[styles.summaryValue, { color: COLORS.teal }]}>
                GHS {items.reduce((s, i) => s + i.quantity * i.sellingPrice, 0).toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>Stock Value</Text>
            </View>
          </View>

          {/* Low stock section */}
          {lowStockItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning-outline" size={16} color="#D9940A" />
                <Text style={[styles.sectionTitle, { color: '#D9940A' }]}>  Low Stock Alert</Text>
              </View>
              {lowStockItems.map(item => (
                <View key={item.id}>{renderItem({ item, isLow: true })}</View>
              ))}
            </View>
          )}

          {/* All items */}
          {normalItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cube-outline" size={16} color={COLORS.navy} />
                <Text style={styles.sectionTitle}>  In Stock</Text>
              </View>
              {normalItems.map(item => (
                <View key={item.id}>{renderItem({ item, isLow: false })}</View>
              ))}
            </View>
          )}

          {filtered.length === 0 && !loading && (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyTitle}>No inventory yet</Text>
              <Text style={styles.emptyHint}>Tap the + button to add your first product.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={COLORS.navy} />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{form.id ? 'Edit Item' : 'Add Item'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.navy} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ITEM NAME *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. Indomie Noodles"
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>CATEGORY</Text>
            <Select
              value={form.category}
              onChange={v => setForm(f => ({ ...f, category: v }))}
              options={INVENTORY_CATEGORIES}
              title="Category"
            />
          </View>

          <View style={styles.row2}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>QUANTITY</Text>
              <TextInput
                style={styles.input}
                value={form.quantity}
                onChangeText={v => setForm(f => ({ ...f, quantity: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.muted}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>UNIT</Text>
              <Select
                value={form.unit}
                onChange={v => setForm(f => ({ ...f, unit: v }))}
                options={INVENTORY_UNITS}
                title="Unit"
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>COST PRICE (GHS)</Text>
              <TextInput
                style={styles.input}
                value={form.costPrice}
                onChangeText={v => setForm(f => ({ ...f, costPrice: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.muted}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>SELLING PRICE (GHS)</Text>
              <TextInput
                style={styles.input}
                value={form.sellingPrice}
                onChangeText={v => setForm(f => ({ ...f, sellingPrice: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.muted}
              />
            </View>
          </View>

          {form.costPrice && form.sellingPrice && parseFloat(form.costPrice) > 0 && (
            <View style={styles.marginBadge}>
              <Text style={styles.marginText}>
                Margin: GHS {(parseFloat(form.sellingPrice || 0) - parseFloat(form.costPrice || 0)).toFixed(2)}
                {'  '}
                ({(((parseFloat(form.sellingPrice || 0) - parseFloat(form.costPrice || 0)) / parseFloat(form.costPrice || 1)) * 100).toFixed(0)}%)
              </Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>LOW STOCK ALERT BELOW</Text>
            <TextInput
              style={styles.input}
              value={form.lowStockThreshold}
              onChangeText={v => setForm(f => ({ ...f, lowStockThreshold: v }))}
              keyboardType="decimal-pad"
              placeholder="5"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.hint}>You'll see a warning when stock falls below this level.</Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.navy} />
              : <Text style={styles.saveBtnText}>{form.id ? 'Update Item' : 'Add to Inventory'}</Text>
            }
          </TouchableOpacity>

          {form.id && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => { setModalVisible(false); handleDelete(form); }}>
              <Text style={styles.deleteBtnText}>Delete Item</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, marginBottom: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.lightGray,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.navy },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 12,
    borderLeftWidth: 4, borderLeftColor: COLORS.navy,
    borderWidth: 1, borderColor: COLORS.lightGray,
  },
  summaryValue: { fontSize: 18, fontWeight: '900', color: COLORS.navy, fontFamily: 'monospace' },
  summaryLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  section: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.cream,
  },
  sectionTitle: { fontWeight: '800', color: COLORS.navy, fontSize: 13 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  itemRowLow: { backgroundColor: '#FFFBF0' },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontWeight: '700', color: COLORS.navy, fontSize: 14 },
  itemMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  qtyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  qtyText: { color: '#FFF', fontWeight: '800', fontSize: 12, fontFamily: 'monospace' },
  lowLabel: { color: '#D9940A', fontWeight: '800', fontSize: 9, textTransform: 'uppercase', marginTop: 3 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 10,
  },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontWeight: '800', color: COLORS.navy, fontSize: 18, marginTop: 16 },
  emptyHint: { color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  // Modal
  modal: { flex: 1, backgroundColor: COLORS.cream, padding: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingTop: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.navy },
  formGroup: { marginBottom: 14 },
  row2: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 11, fontWeight: '800', color: COLORS.navy, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    height: 50, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: COLORS.navy, backgroundColor: COLORS.white,
  },
  hint: { color: COLORS.muted, fontSize: 11, marginTop: 6 },
  marginBadge: {
    backgroundColor: COLORS.teal, borderRadius: 10, padding: 10, marginBottom: 14, alignItems: 'center',
  },
  marginText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  saveBtn: {
    backgroundColor: COLORS.gold, height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { color: COLORS.navy, fontWeight: '900', fontSize: 16 },
  deleteBtn: { alignItems: 'center', padding: 16 },
  deleteBtnText: { color: COLORS.rust, fontWeight: '800' },
});
