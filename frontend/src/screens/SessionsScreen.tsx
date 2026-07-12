import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type SessionStatus = 'PENDING' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

type ApiSession = {
  id: string;
  request_id?: string;
  organizer_id: string;
  family_member_id?: string;
  deceased_full_name: string;
  session_code: string;
  status: SessionStatus;
  progress: number;
  created_at: string;
  organizer_name?: string;
  family_member_name?: string;
};

const tabs: Array<'CURRENT' | 'COMPLETED' | 'ARCHIVED'> = [
  'CURRENT',
  'COMPLETED',
  'ARCHIVED',
];

export default function SessionsScreen({ route, navigation }: any) {
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ApiSession | null>(null);
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'COMPLETED' | 'ARCHIVED'>('CURRENT');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadSessions() {
    try {
      setLoading(true);
      const { data } = await api.get('/sessions');
      const freshSessions = Array.isArray(data) ? data : [];
      setSessions(freshSessions);

      if (selectedSession) {
        const refreshed = freshSessions.find((session) => session.id === selectedSession.id);
        if (refreshed && refreshed.status === 'COMPLETED' && activeTab !== 'COMPLETED') {
          setActiveTab('COMPLETED');
          setSelectedSession(refreshed);
        }
      }
    } catch (error: any) {
      Alert.alert('Could not load sessions', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleArchiveSessionFromList(sessionId: string) {
    Alert.alert(
      'Archive Session',
      'Archive this session? It will move to the archived tab.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: async () => {
          try {
            await api.patch(`/sessions/${sessionId}/archive`);
            await loadSessions();
            Alert.alert('Archived', 'Session archived');
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not archive session');
          }
        } }
      ]
    );
  }

  async function handleDeleteSessionFromList(sessionId: string) {
    Alert.alert(
      'Delete Session',
      'This will permanently delete the session and all related data. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/sessions/${sessionId}`);
            await loadSessions();
            Alert.alert('Deleted', 'Session deleted');
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not delete session');
          }
        } }
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessions.filter((session) => {
      const statusMatch =
        activeTab === 'CURRENT'
          ? ['PENDING', 'PLANNING', 'ACTIVE'].includes(session.status)
          : activeTab === 'COMPLETED'
            ? session.status === 'COMPLETED'
            : session.status === 'ARCHIVED';

      const searchMatch =
        !query ||
        session.deceased_full_name?.toLowerCase().includes(query) ||
        session.session_code?.toLowerCase().includes(query);

      return statusMatch && searchMatch;
    });
  }, [sessions, activeTab, search]);

  function getStatusStyle(status: SessionStatus) {
    switch (status) {
      case 'ACTIVE':
        return { backgroundColor: '#DCFCE7', color: '#165E3B' };
      case 'PLANNING':
        return { backgroundColor: '#DBEAFE', color: '#1D4ED8' };
      case 'COMPLETED':
        return { backgroundColor: '#EDE9FE', color: '#7C3AED' };
      case 'ARCHIVED':
        return { backgroundColor: '#E2E8F0', color: '#334155' };
      default:
        return { backgroundColor: '#FEF3C7', color: '#92400E' };
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSessions} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Funeral Sessions</Text>
          <Text style={styles.subtitle}>
            {user?.role === 'FAMILY_MEMBER'
              ? 'View only sessions created from your own requests.'
              : user?.role === 'ORGANIZER'
                ? 'View sessions connected to your organizer account.'
                : 'View all platform sessions.'}
          </Text>
        </View>

        <Input
          label="Search"
          placeholder="Search by deceased name or session ID"
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInput}
        />

        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            const label = tab === 'CURRENT' ? 'Current' : tab === 'COMPLETED' ? 'Completed' : 'Archived';

            return (
              <SafePressable
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setSelectedSession(null);
                }}
                style={({ pressed }: any) => [styles.tabItem, active && styles.tabItemActive]}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
              </SafePressable>
            );
          })}
        </View>

        {filteredSessions.length === 0 ? (
          <Card style={[styles.emptyCard, styles.shadow]}>
            <Text style={styles.emptyTitle}>No sessions found</Text>
            <Text style={styles.emptyText}>
              {user?.role === 'FAMILY_MEMBER'
                ? 'When an organizer accepts your request and verifies payment, your funeral session will appear here.'
                : 'No sessions are available in this category.'}
            </Text>
            {user?.role === 'FAMILY_MEMBER' && (
              <View style={styles.emptyActions}>
                <Button title="Create New Request" onPress={() => navigation.navigate('CreateRequest')} size="lg" />
                <Button
                  title="Back to Dashboard"
                  onPress={() => navigation.navigate('Dashboard')}
                  size="lg"
                  style={styles.emptyActionButton}
                />
              </View>
            )}
          </Card>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = selectedSession?.id === session.id;
            const statusStyle = getStatusStyle(session.status);

            return (
              <Card key={session.id} style={[styles.sessionCard, styles.shadow]}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>{session.deceased_full_name}</Text>
                    <Text style={styles.sessionMeta}>Session ID: {session.session_code}</Text>
                    {session.organizer_name ? (
                      <Text style={styles.sessionMeta}>Organizer: {session.organizer_name}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor }]}>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>{session.status}</Text>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <Text style={styles.progressLabel}>Progress: {session.progress || 0}%</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${session.progress || 0}%` }]} />
                  </View>
                </View>

                <View style={styles.detailButtonWrap}>
                  <Button
                    title={isSelected ? 'Hide Details' : 'View Session Details'}
                    variant="secondary"
                    onPress={() => setSelectedSession(isSelected ? null : session)}
                    size="md"
                  />
                </View>

                {isSelected && (
                  <View style={styles.detailsPanel}>
                    <Text style={styles.detailsTitle}>Session Details</Text>
                    <InfoRow label="Deceased Name" value={session.deceased_full_name} />
                    <InfoRow label="Session ID" value={session.session_code} />
                    <InfoRow label="Status" value={session.status} />
                    <InfoRow label="Created" value={new Date(session.created_at).toLocaleDateString()} />
                    <View style={styles.moreActions}>
                      {session.status !== 'COMPLETED' && user?.role === 'ORGANIZER' ? (
                        <Button title="Manage Session" variant="primary" onPress={() => navigation.navigate('SessionDetail', { id: session.session_code })} size="md" />
                      ) : null}
                      {session.status === 'COMPLETED' && (
                        <>
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedText}>✓ Funeral Completed - No further changes allowed</Text>
                          </View>
                          <Button title="View Overview" variant="ghost" onPress={() => navigation.navigate('SessionOverview', { id: session.session_code })} size="md" />
                        </>
                      )}
                      <Button title="View Donations" variant="ghost" onPress={() => navigation.navigate('Donations', { id: session.session_code })} size="md" />
                      <Button title="Open Document Vault" variant="ghost" onPress={() => navigation.navigate('Documents', { id: session.session_code })} size="md" />
                      <Button title="Back to Dashboard" variant="ghost" onPress={() => navigation.navigate('Dashboard')} size="md" />
                      {(user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN') && (
                        <>
                          {session.status !== 'ARCHIVED' && (
                            <Button title="Archive" variant="secondary" onPress={() => handleArchiveSessionFromList(session.id)} size="md" />
                          )}
                          <Button title="Delete" variant="danger" onPress={() => handleDeleteSessionFromList(session.id)} size="md" disabled={!(session.status === 'COMPLETED' || session.status === 'ARCHIVED')} />
                        </>
                      )}
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        )}

        <View style={styles.refreshAction}>
          <Button title="Refresh Sessions" variant="ghost" loading={loading} onPress={loadSessions} size="md" />
          <Button title="Back to Dashboard" variant="ghost" onPress={() => navigation.navigate('Dashboard')} size="md" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    maxWidth: '92%',
  },
  searchInput: {
    marginBottom: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  tabLabel: {
    fontWeight: '700',
    color: '#475569',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  emptyCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyActions: {
    marginTop: 12,
  },
  emptyActionButton: {
    marginTop: 12,
  },
  sessionCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sessionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  sessionName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  sessionMeta: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  progressSection: {
    marginBottom: 18,
  },
  progressLabel: {
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4338CA',
    borderRadius: 999,
  },
  detailButtonWrap: {
    marginBottom: 12,
  },
  detailsPanel: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  moreActions: {
    marginTop: 16,
    gap: 12,
  },
  refreshAction: {
    marginTop: 10,
    marginBottom: 36,
    flexDirection: 'row',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    color: '#165E3B',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});
