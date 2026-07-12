import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import BackButton from '../components/BackButton';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function AuthChoiceScreen({ navigation, route }: any) {
  const role = route.params?.role;

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🚀</Text>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subtitle}>
          Register or login as {role?.replace('_', ' ').toLowerCase()}
        </Text>
      </View>

      {/* Login Option */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Already have an account?</Text>
        <Button
          title="Login"
          onPress={() => navigation.navigate('Login', { role })}
          size="lg"
        />
      </View>

      {/* Or Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Registration Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Create new account</Text>
        <View style={styles.methodsGrid}>
          <SafePressable
            style={({ pressed }: any) => [
              styles.methodCard,
              pressed && styles.methodCardPressed,
            ]}
            onPress={() => navigation.navigate('Register', { role, method: 'phone' })}
          >
            <Text style={styles.methodIcon}>📱</Text>
            <Text style={styles.methodLabel}>Phone + OTP</Text>
          </SafePressable>
        </View>
      </View>

      {/* Security Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>🔒</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Your data is secure</Text>
          <Text style={styles.infoDescription}>
            We use industry-standard encryption to protect your information
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

  section: {
    marginBottom: spacing.xl,
  },

  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
    gap: spacing.md,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },

  dividerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },

  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  methodCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.light,
    ...shadows.sm,
  },

  methodCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },

  methodIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },

  methodLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '12',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.info + '30',
    marginTop: spacing.lg,
  },

  infoIcon: {
    fontSize: 24,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  infoDescription: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

