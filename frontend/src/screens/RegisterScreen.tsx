import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import BackButton from '../components/BackButton';
import { Screen } from '../components/Screen';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function RegisterScreen({ navigation, route }: any) {
  const role = route.params?.role ?? 'FAMILY_MEMBER';
  const method: string = 'phone';
  const { setSession } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', otp: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
  };

  const passwordValid = Object.values(passwordChecks).every(Boolean);

  const getPasswordRequirementMessage = () => {
    if (!passwordChecks.length) return 'Password must be at least 8 characters.';
    if (!passwordChecks.uppercase) return 'Password must contain at least one uppercase letter.';
    if (!passwordChecks.lowercase) return 'Password must contain at least one lowercase letter.';
    if (!passwordChecks.number) return 'Password must include at least one number.';
    if (!passwordChecks.special) return 'Password must include at least one special character.';
    return 'Password meets all requirements.';
  };

  const validateOtpRequest = () => {
    if (!form.fullName.trim()) {
      Alert.alert('Required', 'Enter full name');
      return false;
    }
    if (!form.phone.trim()) {
      Alert.alert('Required', 'Enter phone number');
      return false;
    }
    if (!passwordValid) {
      Alert.alert('Password requirements', getPasswordRequirementMessage());
      return false;
    }
    return true;
  };

  const validateRegistration = () => {
    if (form.password.length < 8) {
      Alert.alert('Password', 'Minimum 8 characters');
      return false;
    }
    if (!form.otp.trim()) {
      Alert.alert('OTP Required', 'Enter verification code');
      return false;
    }
    return true;
  };

  async function sendOtp() {
    if (!validateOtpRequest()) return;
    try {
      setLoading(true);
      await api.post('/auth/request-otp', { method, email: form.email, phone: form.phone });
      setOtpSent(true);
      Alert.alert('OTP sent', 'Check your email or phone.');
    } catch (e: any) {
      Alert.alert('Could not send OTP', e.message || 'Try again');
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    if (!validateRegistration()) return;
    try {
      setLoading(true);
      const endpoint = '/auth/register';
      const payload: any = {
        role,
        method,
        fullName: form.fullName,
        phone: form.phone,
        password: form.password,
        otp: form.otp,
      };

      const { data } = await api.post(endpoint, payload);
      await setSession(data.token, data.user);
      if (data.user.status === 'ACTIVE') {
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      } else {
        const purpose = data.user.role === 'ORGANIZER'
          ? 'ORGANIZER_REGISTRATION'
          : 'FAMILY_ACTIVATION';
        navigation.reset({ index: 0, routes: [{ name: 'PaymentGate', params: { purpose } }] });
      }
    } catch (e: any) {
      Alert.alert('Registration failed', e.message || 'Check your information');
    } finally {
      setLoading(false);
    }
  }

  const progressStep = otpSent ? 2 : 1;
  const totalSteps = 2;

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✨</Text>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
        Phone verification for {role}
      </Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${(progressStep / totalSteps) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {progressStep} of {totalSteps}
        </Text>
      </View>

      {/* Form Card */}
      <Card variant="elevated" style={styles.card}>
        <View style={styles.formContent}>
          {!otpSent ? (
            <>
              <Text style={styles.stepTitle}>Your Information</Text>
              <Input
                label="Full name"
                value={form.fullName}
                onChangeText={v => set('fullName', v)}
                placeholder="John Doe"
                editable={!loading}
              />
              {method !== 'phone' && (
                <Input
                  label="Email address"
                  value={form.email}
                  onChangeText={v => set('email', v)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  editable={!loading}
                />
              )}
              {method !== 'email' && (
                <Input
                  label="Phone number"
                  value={form.phone}
                  onChangeText={v => set('phone', v)}
                  keyboardType="phone-pad"
                  placeholder="+1234567890"
                  editable={!loading}
                />
              )}
              <View style={styles.passwordField}>
                <Input
                  label="Create password"
                  value={form.password}
                  onChangeText={v => set('password', v)}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  helperText="Use 8+ chars, uppercase, lowercase, number, and special symbol"
                  editable={!loading}
                />
                <SafePressable onPress={() => setShowPassword((prev) => !prev)} style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </SafePressable>
              </View>
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementTitle}>Password must include:</Text>
                <Text style={[styles.requirementText, passwordChecks.length ? styles.requirementMet : styles.requirementFailed]}>
                  • At least 8 characters
                </Text>
                <Text style={[styles.requirementText, passwordChecks.uppercase ? styles.requirementMet : styles.requirementFailed]}>
                  • One uppercase letter
                </Text>
                <Text style={[styles.requirementText, passwordChecks.lowercase ? styles.requirementMet : styles.requirementFailed]}>
                  • One lowercase letter
                </Text>
                <Text style={[styles.requirementText, passwordChecks.number ? styles.requirementMet : styles.requirementFailed]}>
                  • One number
                </Text>
                <Text style={[styles.requirementText, passwordChecks.special ? styles.requirementMet : styles.requirementFailed]}>
                  • One special character
                </Text>
              </View>
              <Button
                title="Continue"
                loading={loading}
                onPress={sendOtp}
                size="lg"
              />
            </>
          ) : (
            <>
              <Text style={styles.stepTitle}>Verify Your Phone</Text>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationIcon}>📨</Text>
                <Text style={styles.verificationText}>
                  We sent a verification code to your phone
                </Text>
              </View>
              <Input
                label="Verification code"
                value={form.otp}
                onChangeText={v => set('otp', v)}
                keyboardType="number-pad"
                placeholder="000000"
                editable={!loading}
              />
              <Button
                title="Verify & Create Account"
                loading={loading}
                onPress={register}
                size="lg"
              />
              <Button
                title="Resend code"
                variant="ghost"
                onPress={sendOtp}
              />
            </>
          )}
        </View>
      </Card>

      {/* Security Badge */}
      <View style={styles.securityNote}>
        <Text style={styles.securityIcon}>🔐</Text>
        <Text style={styles.securityText}>Your data is encrypted and never shared</Text>
      </View>
      <View style={styles.bottomActions}>
        <Button
          title="Already have an account?"
          variant="secondary"
          onPress={() => navigation.navigate('Login', { role })}
        />
        <Button
          title="Change role"
          variant="ghost"
          onPress={() => navigation.navigate('Landing')}
          style={styles.secondaryAction}
        />
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

  progressContainer: {
    marginBottom: spacing.lg,
  },

  progressTrack: {
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },

  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.light,
    borderRadius: radius.full,
  },

  progressText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },

  card: {
    marginBottom: spacing.lg,
  },

  formContent: {
    gap: spacing.md,
  },

  stepTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  verificationInfo: {
    flexDirection: 'row',
    backgroundColor: colors.info + '12',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.info + '30',
    marginBottom: spacing.md,
  },

  verificationIcon: {
    fontSize: 24,
  },

  verificationText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.success + '12',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },

  securityIcon: {
    fontSize: 18,
  },

  securityText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },

  bottomActions: {
    marginTop: spacing.md,
    gap: spacing.md,
  },

  secondaryAction: {
    borderWidth: 1,
    borderColor: colors.primary.light,
  },
  passwordField: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 42,
    padding: spacing.sm,
  },
  passwordToggleText: {
    color: colors.primary.light,
    fontWeight: typography.weights.semibold,
  },
  passwordRequirements: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.border.light,
    borderRadius: radius.lg,
  },
  requirementTitle: {
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  requirementText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  requirementMet: {
    color: colors.success,
  },
  requirementFailed: {
    color: colors.error,
  },
});

