import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import SafePressable from '../components/SafePressable';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/routes';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function AccountDetailScreen({ navigation }: any) {
  const { user, setSession } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'AccountDetail'>>();
  const { id, role } = route.params;
  const [account, setAccount] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.replace('Dashboard');
      return;
    }
    async function loadAccount() {
      try {
        setLoading(true);
        const { data } = await api.get(`/admin/users/${id}`);
        setAccount(data);
      } catch (error: any) {
        console.error(error);
        Alert.alert('Unable to load account', error?.message || 'Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadAccount();
  }, [id, navigation, user]);

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>{role === 'ORGANIZER' ? 'Organizer Account' : 'Family Account'}</Text>
        <Text style={styles.subtitle}>Direct access view for this account.</Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <Text style={styles.detailLabel}>Full Name</Text>
        <Text style={styles.detailValue}>{account?.full_name || 'N/A'}</Text>
        <Text style={styles.detailLabel}>Email</Text>
        <Text style={styles.detailValue}>{account?.email || 'N/A'}</Text>
        <Text style={styles.detailLabel}>Phone</Text>
        <Text style={styles.detailValue}>{account?.phone || 'N/A'}</Text>
        <Text style={styles.detailLabel}>Status</Text>
        <Text style={styles.detailValue}>{account?.status || 'N/A'}</Text>
        {role === 'ORGANIZER' && (
          <>
            <Text style={styles.detailLabel}>Organizer Identifier</Text>
            <Text style={styles.detailValue}>{account?.organizer_identifier || 'N/A'}</Text>
            <Text style={styles.detailLabel}>Subscription Status</Text>
            <Text style={styles.detailValue}>{account?.subscription_status || 'N/A'}</Text>
          </>
        )}
      </Card>

      <View style={styles.actionsRow}>
        <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} />
        <Button
          title="Open Dashboard"
          onPress={async () => {
            try {
              const { data } = await api.post(`/admin/users/${id}/impersonate`);
              await setSession(data.token, data.user);
              Alert.alert('Access Granted', `${data.user.fullName} account session started.`);
              navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
            } catch (error: any) {
              console.error(error);
              Alert.alert('Unable to impersonate', error?.message || 'Please try again.');
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.black,
    color: colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
  },
  card: {
    margin: 24,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  detailLabel: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  detailValue: {
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  actionsRow: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    gap: spacing.md,
  },
});
