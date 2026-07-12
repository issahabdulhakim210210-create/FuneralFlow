import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import SafePressable from '../components/SafePressable';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function UserManagementScreen({ navigation }: any) {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Unable to load users', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }

  async function deleteUser(userId: string, fullName: string) {
    Alert.alert(
      'Delete Account',
      `Permanently delete ${fullName}'s account? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${userId}`);
              await loadUsers();
              Alert.alert('Account deleted', `${fullName}'s account has been deleted.`);
            } catch (error: any) {
              console.error(error);
              Alert.alert('Unable to delete account', error?.message || 'Please try again.');
            }
          },
        },
      ]
    );
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
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>View and remove organizer or family accounts.</Text>
      </View>

      <View style={styles.actionRow}>
        <Button title="Refresh" variant="secondary" onPress={handleRefresh} loading={loading} />
        <Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        style={styles.list}
      >
        {users.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>There are currently no accounts to manage.</Text>
          </Card>
        ) : (
          users.map((account) => (
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
                  title="Delete Account"
                  variant="danger"
                  onPress={() => deleteUser(account.id, account.full_name)}
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: 24,
    marginBottom: spacing.sm,
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
