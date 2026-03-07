import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import type { Navigation } from '../../App';
import CustomButton from '../components/CustomButton';

type Props = { navigation: Navigation };

export default function AddEmailScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 1/5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Add your email</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code to confirm your email address
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.footer}>
        <CustomButton
          title="Send verification Code"
          onPress={() => navigation.navigate('EnterOTP')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  header: { paddingTop: 60, paddingBottom: 20, alignItems: 'center' },
  stepIndicator: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  content: { flex: 1, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16,
    fontSize: 16, color: '#1A1A1A',
  },
  footer: { paddingBottom: 60 },
});
