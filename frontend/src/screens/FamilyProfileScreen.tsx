import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

type SessionStatus = 'PENDING' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

type FamilySession = {
  id: string;
  deceased_full_name: string;
  session_code: string;
  status: SessionStatus;
  created_at: string;
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
    </View>
  );
}

export default function FamilyProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<FamilySession[]>([]);
  const [loading, setLoading] = useState(false);

  const pastSessions = useMemo(
    () =>
      sessions.filter(
        (session) => session.status === 'COMPLETED' || session.status === 'ARCHIVED'
      ),
    [sessions]
  );

  async function loadFamilySessions() {
    try {
      setLoading(true);
      const { data } = await api.get('/sessions');
      setSessions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Could not load past sessions', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFamilySessions();
  }, []);

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Family Profile</Text>
          <Text style={styles.subtitle}>Your account information and past funeral sessions.</Text>
        </View>

        <Card style={[styles.card, styles.profileCard]}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'F'}
              </Text>
            </View>
            <Text style={styles.profileName}>{user?.fullName || 'Family Member'}</Text>
            <Text style={styles.profileRole}>Family Member</Text>
          </View>

          <View style={styles.detailsBlock}>
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Phone" value={user?.phone} />
            <InfoRow label="Account Status" value={user?.status} />
          </View>
        </Card>

        <Card style={[styles.card, styles.sessionCard]}> 
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Past Funeral Sessions</Text>
              <Text style={styles.sectionSubtitle}>Completed or archived sessions in your account.</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{pastSessions.length}</Text>
            </View>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading past sessions...</Text>
          ) : pastSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No past sessions found.</Text>
              <Text style={styles.emptyText}>
                Completed or archived funeral sessions will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.sessionList}>
              {pastSessions.map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <View style={styles.sessionRowLeft}>
                    <Text style={styles.sessionName}>{session.deceased_full_name}</Text>
                    <Text style={styles.sessionMeta}>Session ID: {session.session_code}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{session.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sessionActions}>
            <Button
              title="View All Sessions"
              variant="secondary"
              onPress={() => navigation.navigate('Sessions')}
              size="lg"
            />
          </View>
        </Card>

        <View style={styles.footerActions}>
          <Button
            title="Back to Dashboard"
            variant="ghost"
            onPress={() => navigation.navigate('Dashboard')}
            size="lg"
          />
          <Button title="Logout" variant="danger" onPress={handleLogout} size="lg" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    maxWidth: '90%',
  },
  card: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  profileCard: {
    overflow: 'hidden',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarLetter: {
    fontSize: 34,
    fontWeight: '900',
    color: '#3730A3',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 16,
    textAlign: 'center',
  },
  profileRole: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  detailsBlock: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  infoValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  sessionCard: {
    paddingVertical: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '90%',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  countText: {
    color: '#3730A3',
    fontWeight: '800',
    fontSize: 14,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  sessionList: {
    gap: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sessionRowLeft: {
    flex: 1,
    marginRight: 14,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  sessionMeta: {
    color: '#6B7280',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E0E7FF',
  },
  statusText: {
    color: '#3730A3',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sessionActions: {
    marginTop: 20,
  },
  footerActions: {
    marginTop: 12,
    gap: 12,
  },
});
