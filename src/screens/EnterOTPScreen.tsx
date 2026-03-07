import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import type { Navigation } from '../../App';
import CustomButton from '../components/CustomButton';

type Props = { navigation: Navigation };

const OTP_LENGTH = 4;

export default function EnterOTPScreen({ navigation }: Props) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '').slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 2/5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Enter the OTP</Text>
        <Text style={styles.subtitle}>
          We've sent a verification code to your email. Enter it below.
        </Text>
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={styles.otpInput}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              selectTextOnFocus
            />
          ))}
        </View>
        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>
            Didn't get the OTP? <Text style={styles.resendLink}>Resend OTP</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <CustomButton
          title="Continue"
          onPress={() => navigation.navigate('ConnectWallet')}
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
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 32 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpInput: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1,
    borderColor: '#E5E7EB', backgroundColor: '#FFFFFF',
    fontSize: 20, fontWeight: '600', color: '#1A1A1A', textAlign: 'center',
  },
  resendButton: { marginBottom: 24 },
  resendText: { fontSize: 14, color: '#6B7280' },
  resendLink: { color: '#7C3AED', fontWeight: '600' },
  footer: { paddingBottom: 60 },
});
