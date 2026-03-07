import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

const bellIcon = require('../../assets/WalletScreen/bellIcon.png');

export type WalletTab = 'summary' | 'transactions' | 'card' | 'billing' | 'history';

const TABS: { id: WalletTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'card', label: 'Card' },
  { id: 'billing', label: 'Billing' },
  { id: 'history', label: 'History' },
];

interface WalletHeaderProps {
  activeTab: WalletTab;
  onTabChange: (tab: WalletTab) => void;
  onMenuPress?: () => void;
}

export default function WalletHeader({
  activeTab,
  onTabChange,
  onMenuPress,
}: WalletHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.iconButton}>
          <Image source={bellIcon} style={styles.bellIcon} resizeMode="contain" />
        </TouchableOpacity>
        {/* <TouchableOpacity style={styles.earnButton}>
          <Text style={styles.earnButtonText}>Earn $100</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress ?? (() => {})}>
          <View style={styles.hamburgerContainer}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, styles.hamburgerLineLast]} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsScroll}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.capsule, activeTab === tab.id && styles.capsuleActive]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.capsuleText,
                activeTab === tab.id && styles.capsuleTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    padding: 8,
  },
  bellIcon: {
    width: 24,
    height: 24,
  },
  earnButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  earnButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuButton: {
    padding: 8,
  },
  hamburgerContainer: {},
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#374151',
    borderRadius: 1,
    marginBottom: 5,
  },
  hamburgerLineLast: { marginBottom: 0 },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  capsule: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  capsuleActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
  capsuleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  capsuleTextActive: {
    color: '#374151',
    fontWeight: '600',
  },
});
