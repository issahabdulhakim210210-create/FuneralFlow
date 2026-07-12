import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function AdminScreen({ navigation }: any) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') {
      navigation.replace('Dashboard');
    }
  }, [user, navigation]);

  if (!user || user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>👑</Text>
        <Text style={styles.title}>Super Admin</Text>
        <Text style={styles.subtitle}>Platform Management & Analytics</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statLabel}>Analytics</Text>
        </View>
      </View>

      {/* Main Info Card */}
      <Card variant="elevated" style={styles.card}>
        <Text style={styles.cardTitle}>Platform Overview</Text>
        <Text style={styles.cardBody}>
          Manage users, organizers, subscriptions, payment history, analytics, sessions, and grief support content.
        </Text>
        <View style={styles.buttonGroup}>
          <Button title="View Analytics" onPress={() => navigation.navigate('Documents')} size="lg" />
          <Button title="Manage Content" variant="secondary" onPress={() => navigation.navigate('Donations')} />
          <Button title="Audit Logs" variant="secondary" onPress={() => navigation.navigate('AuditLog')} />
          <Button title="Manage Users" variant="secondary" onPress={() => navigation.navigate('UserManagement')} />
          <Button title="Organizers" variant="secondary" onPress={() => navigation.navigate('OrganizerAccounts')} />
          <Button title="Families" variant="secondary" onPress={() => navigation.navigate('FamilyAccounts')} />
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Search Users</Text>
          </View>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>View Reports</Text>
          </View>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionLabel}>Settings</Text>
          </View>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionLabel}>Notifications</Text>
          </View>
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
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.primary.light + '12',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.light + '30',
  },

  statIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },

  statLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },

  card: {
    marginBottom: spacing.xl,
  },

  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  cardBody: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },

  buttonGroup: {
    gap: spacing.md,
  },

  section: {
    marginTop: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  actionCard: {
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

  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },

  actionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
