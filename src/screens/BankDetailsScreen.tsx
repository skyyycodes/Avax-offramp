import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import type { Navigation } from '../../App';
import CustomButton from '../components/CustomButton';

type Props = { navigation: Navigation };

const BANKS = [
  { id: 'core', name: 'CORE', logo: 'CORE' },
  { id: 'hdfc', name: 'HDFC Bank', logo: 'HDFC' },
  { id: 'icici', name: 'ICICI Bank', logo: 'ICICI' },
];

export default function BankDetailsScreen({ navigation }: Props) {
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 4/5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Provide your bank details</Text>
        <Text style={styles.subtitle}>
          Link your bank account to enable off-ramp transactions
        </Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowPicker(true)}>
          <View style={styles.bankOption}>
            <View style={styles.bankLogo}>
              <Text style={styles.bankLogoText}>{selectedBank.logo}</Text>
            </View>
            <Text style={styles.bankName}>{selectedBank.name}</Text>
          </View>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <CustomButton title="Connect" onPress={() => {}} />
      </View>

      <Modal visible={showPicker} transparent={true} animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Choose Bank</Text>
            {BANKS.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.sheetOption}
                onPress={() => { setSelectedBank(b); setShowPicker(false); }}
              >
                <View style={styles.bankLogo}>
                  <Text style={styles.bankLogoText}>{b.logo}</Text>
                </View>
                <Text style={styles.bankName}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  header: { paddingTop: 60, paddingBottom: 20, alignItems: 'center' },
  stepIndicator: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  content: { flex: 1, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  bankOption: { flexDirection: 'row', alignItems: 'center' },
  bankLogo: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#7C3AED', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  bankLogoText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  bankName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  arrow: { fontSize: 12, color: '#6B7280' },
  footer: { paddingBottom: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 20 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
});
