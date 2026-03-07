import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { Navigation } from '../../App';
import CustomButton from '../components/CustomButton';

const primaryLogo = require('../../assets/WelcomeScreen/primaryLogo.png');
const purpleBall = require('../../assets/WelcomeScreen/purpleBall.png');
const debitCardImage = require('../../assets/WelcomeScreen/debitCardImage.png');

type Props = { navigation: Navigation };

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.purpleSection}>
        <Image
          source={purpleBall}
          style={styles.purpleBall}
          resizeMode="contain"
        />
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={primaryLogo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.logoText}>AvaPay</Text>
          </View>
        </View>
        <Text style={styles.title}>Scan Any UPI QR.{'\n'}Pay with Crypto.</Text>
        <View style={styles.cardWrapper}>
          <View style={styles.cardContainer}>
            <Image
              source={debitCardImage}
              style={styles.debitCard}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      <View style={styles.whiteSection}>
        <Text style={styles.subtitle}>
          Pay any UPI merchant instantly using your crypto balance.
        </Text>
        <CustomButton
          title="Get Started"
          onPress={() => navigation.navigate('AddEmail')}
        />
        <TouchableOpacity style={styles.linkButton}>
          <Text style={styles.linkText}>Have an account?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  purpleSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  purpleBall: {
    position: 'absolute',
    top: -120,
    left: -110,
    width: 620,
    height: 620,
  },
  header: { paddingBottom: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 48, height: 44 },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 24,
    textAlign: 'center',
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom: -70,
  },
  debitCard: {
    width: 440,
    height: 254,
    // transform: [{ rotate: '-8deg' }],
  },
  whiteSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 90,
    paddingBottom: 60,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
});
