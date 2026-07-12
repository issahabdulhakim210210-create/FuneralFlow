import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import BackButton from '../components/BackButton';
import { Screen } from '../components/Screen';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { api } from '../services/api';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function ForgotPasswordScreen({ navigation, route }: any) {
  const role = route.params?.role ?? 'FAMILY_MEMBER';
  const [form, setForm] = useState({ phone: '', otp: '', password: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) => setForm({ ...form, [key]: value });

  const validatePhone = () => {
    if (!form.phone.trim()) {
      Alert.alert('Required', 'Enter the phone number for your account');
      return false;
    }
    return true;
  };

  const validateReset = () => {
    if (!form.otp.trim()) {
      Alert.alert('Required', 'Enter the verification code');
      return false;
    }
    if (!form.password.trim()) {
      Alert.alert('Required', 'Enter a new password');
      return false;
    }
    if (form.password.length < 8) {
      Alert.alert('Password', 'New password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  async function sendOtp() {
    if (!validatePhone()) return;
    try {
      setLoading(true);
      await api.post('/auth/password-reset/request', { phone: form.phone.trim() });
      setOtpSent(true);
      Alert.alert('OTP sent', 'A verification code was sent to your phone.');
    } catch (error: any) {
      Alert.alert('Unable to send OTP', error?.message || 'Try again');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!validateReset()) return;
    try {
      setLoading(true);
      await api.post('/auth/password-reset/confirm', {
        phone: form.phone.trim(),
        otp: form.otp.trim(),
        password: form.password,
      });
      Alert.alert('Password updated', 'You can now sign in with your new password.');
      navigation.navigate('Login', { role });
    } catch (error: any) {
      Alert.alert('Unable to reset password', error?.message || 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🔑</Text>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your phone to receive a reset code.</Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        <View style={styles.formContent}>
          {!otpSent ? (
            <>
              <Input
                label="Phone number"
                value={form.phone}
                onChangeText={(value) => set('phone', value)}
                placeholder="+233XXXXXXXXX"
                keyboardType="phone-pad"
                editable={!loading}
              />
              <Button
                title={loading ? 'Sending code...' : 'Send reset code'}
                loading={loading}
                onPress={sendOtp}
                size="lg"
              />
            </>
          ) : (
            <>
              <Text style={styles.stepTitle}>Enter the code and choose a new password</Text>
              <Input
                label="Verification code"
                value={form.otp}
                onChangeText={(value) => set('otp', value)}
                placeholder="000000"
                keyboardType="number-pad"
                editable={!loading}
              />
              <Input
                label="New password"
                value={form.password}
                onChangeText={(value) => set('password', value)}
                secureTextEntry
                placeholder="••••••••"
                editable={!loading}
              />
              <Button
                title={loading ? 'Updating password...' : 'Reset password'}
                loading={loading}
                onPress={resetPassword}
                size="lg"
              />
              <Button
                title="Resend code"
                variant="ghost"
                onPress={sendOtp}
                disabled={loading}
              />
            </>
          )}
        </View>
      </Card>

      <View style={styles.securityBadge}>
        <Text style={styles.securityIcon}>🛡️</Text>
        <View>
          <Text style={styles.securityTitle}>Secure reset</Text>
          <Text style={styles.securityDescription}>
            We verify your phone and update your password safely.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.black,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.xl,
  },
  formContent: {
    gap: spacing.md,
  },
  stepTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  securityBadge: {
    flexDirection: 'row',
    backgroundColor: colors.info + '12',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  securityIcon: {
    fontSize: 24,
  },
  securityTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
