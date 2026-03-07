import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import type { Navigation } from '../../App';
import CustomButton from '../components/CustomButton';

type Props = { navigation: Navigation };

const WALLETS = [
  { id: 'core', name: 'CORE', logo: 'CORE' },
  { id: 'metamask', name: 'MetaMask', logo: 'MM' },
  { id: 'walletconnect', name: 'WalletConnect', logo: 'WC' },
];

export default function ConnectWalletScreen({ navigation }: Props) {
  const [selectedWallet, setSelectedWallet] = useState(WALLETS[0]);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 3/5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Connect your crypto wallet</Text>
        <Text style={styles.subtitle}>Choose your Wallet</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowPicker(true)}>
          <View style={styles.walletOption}>
            <View style={styles.walletLogo}>
              <Text style={styles.walletLogoText}>{selectedWallet.logo}</Text>
            </View>
            <Text style={styles.walletName}>{selectedWallet.name}</Text>
          </View>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <CustomButton title="Connect" onPress={() => navigation.replace('Wallet')} />
      </View>

      <Modal visible={showPicker} transparent={true} animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Choose Wallet</Text>
            {WALLETS.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={styles.sheetOption}
                onPress={() => { setSelectedWallet(w); setShowPicker(false); }}
              >
                <View style={styles.walletLogo}>
                  <Text style={styles.walletLogoText}>{w.logo}</Text>
                </View>
                <Text style={styles.walletName}>{w.name}</Text>
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
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  walletOption: { flexDirection: 'row', alignItems: 'center' },
  walletLogo: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#7C3AED', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  walletLogoText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  walletName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  arrow: { fontSize: 12, color: '#6B7280' },
  footer: { paddingBottom: 60 },
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
