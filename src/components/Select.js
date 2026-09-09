import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

/**
 * Cross-platform dropdown replacement for @react-native-picker/picker.
 * The native Picker renders as an inline spinning wheel on iOS, which gets
 * clipped when placed in a compact input-height box — this uses a bottom
 * sheet instead so it looks and behaves the same on iOS, Android and web.
 */
export default function Select({ value, options, onChange, placeholder = 'Select…', title }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.control} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                {title && <Text style={styles.sheetTitle}>{title}</Text>}
                <FlatList
                  data={options}
                  keyExtractor={(item) => String(item)}
                  ItemSeparatorComponent={() => <View style={styles.sep} />}
                  renderItem={({ item }) => {
                    const active = item === value;
                    return (
                      <TouchableOpacity
                        style={[styles.option, active && styles.optionActive]}
                        onPress={() => { onChange(item); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{item}</Text>
                        {active && <Ionicons name="checkmark" size={18} color={COLORS.gold} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  control: {
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.navy,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { flex: 1, fontSize: 15, color: COLORS.navy, marginRight: 8 },
  placeholder: { color: COLORS.muted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
    paddingBottom: 24,
    paddingTop: 12,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  optionActive: { backgroundColor: COLORS.cream },
  optionText: { fontSize: 15, color: COLORS.navy, fontWeight: '500' },
  optionTextActive: { fontWeight: '800' },
  sep: { height: 1, backgroundColor: COLORS.lightGray, marginHorizontal: 20 },
});
