import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import BackButton from '../components/BackButton';
import { Screen } from '../components/Screen';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function LoginScreen({ navigation, route }: any) {
  const role = route.params?.role ?? 'FAMILY_MEMBER';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();

  async function submit() {
    if (!identifier.trim()) {
      Alert.alert('Required', 'Enter email or phone');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Required', 'Enter password');
      return;
    }
    if (loading) return;

    try {
      setLoading(true);
      const authUser = await login(identifier, password, role);

      if (authUser.status !== 'ACTIVE') {
        const purpose = authUser.role === 'ORGANIZER'
          ? authUser.status === 'PENDING_PAYMENT'
            ? 'ORGANIZER_REGISTRATION'
            : 'ORGANIZER_MONTHLY_SUBSCRIPTION'
          : 'FAMILY_ACTIVATION';

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'PaymentGate',
              params: { purpose },
            },
          ],
        });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e: any) {
      Alert.alert('Login failed', e.message || 'Check your credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🔐</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your account</Text>
      </View>

      {/* Login Card */}
      <Card variant="elevated" style={styles.card}>
        <View style={styles.formContent}>
          <Input
            label="Email or Phone"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            placeholder="+1234567890"
            editable={!loading}
          />
          <View style={styles.passwordField}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              editable={!loading}
            />
            <SafePressable onPress={() => setShowPassword((prev) => !prev)} style={styles.passwordToggle}>
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </SafePressable>
          </View>

          <Button
            title={loading ? 'Signing in...' : 'Sign In'}
            loading={loading}
            onPress={submit}
            size="lg"
          />

          {/* Help Links */}
          <View style={styles.helpLinks}>
            <SafePressable onPress={() => navigation.navigate('ForgotPassword', { role })}>
              <Text style={styles.helpLinkText}>Forgot password?</Text>
            </SafePressable>
            <Text style={styles.separator}>•</Text>
            <SafePressable>
              <Text style={styles.helpLinkText}>Need help?</Text>
            </SafePressable>
          </View>
          <View style={styles.actionFooter}>
            <Button
              title="Create account"
              variant="secondary"
              onPress={() => navigation.navigate('AuthChoice', { role })}
            />
            <Button
              title="Change role"
              variant="ghost"
              onPress={() => navigation.navigate('Landing')}
              style={styles.secondaryAction}
            />
          </View>
        </View>
      </Card>

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Text style={styles.securityIcon}>🛡️</Text>
        <View>
          <Text style={styles.securityTitle}>Secure Connection</Text>
          <Text style={styles.securityDescription}>
            Your data is encrypted and protected
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

  helpLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },

  actionFooter: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },

  secondaryAction: {
    borderWidth: 1,
    borderColor: colors.primary.light,
  },

  helpLinkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    fontWeight: typography.weights.semibold,
  },

  separator: {
    color: colors.border.medium,
  },

  securityBadge: {
    flexDirection: 'row',
    backgroundColor: colors.success + '12',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },

  securityIcon: {
    fontSize: 24,
  },

  securityTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },

  securityDescription: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
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
});
