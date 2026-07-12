import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import SafePressable from '../components/SafePressable';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function FamilyAccountsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadFamilies() {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/users', { params: { role: 'FAMILY_MEMBER' } });
      setFamilies(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Unable to load family members', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFamilies();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadFamilies();
    setRefreshing(false);
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.message}>Access denied. Admins only.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Family Accounts</Text>
        <Text style={styles.subtitle}>Select a family account to access without logging in.</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        style={styles.list}
      >
        {families.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No family members found</Text>
            <Text style={styles.emptyText}>There are currently no family accounts to view.</Text>
          </Card>
        ) : (
          families.map((account) => (
            <Card key={account.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View>
                  <Text style={styles.userName}>{account.full_name}</Text>
                  <Text style={styles.userMeta}>{account.email || account.phone || 'No contact'}</Text>
                </View>
                <Text style={styles.userRole}>{account.role}</Text>
              </View>
              <Text style={styles.userStatus}>Status: {account.status}</Text>
              <View style={styles.userActions}>
                <Button
                  title="Access Account"
                  onPress={() => navigation.navigate('AccountDetail', { id: account.id, role: 'FAMILY_MEMBER' })}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
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
  list: {
    paddingHorizontal: 24,
  },
  userCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  userMeta: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  userRole: {
    color: colors.primary.base,
    fontWeight: typography.weights.bold,
  },
  userStatus: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  userActions: {
    marginTop: spacing.sm,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  container: {
    padding: 24,
  },
  message: {
    color: colors.text.secondary,
    fontSize: typography.sizes.base,
  },
});
