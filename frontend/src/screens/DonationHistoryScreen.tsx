import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Modal } from 'react-native';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function getRecorderLabel(donation: any) {
  if (donation.collector_name && donation.collector_identifier) {
    return `${donation.collector_name} (${donation.collector_identifier})`;
  }
  if (donation.collector_name) {
    return donation.collector_name;
  }
  return 'Unknown';
}

export default function DonationHistoryScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const initialSessionId = route?.params?.id || '';
  const collectorName = route?.params?.collectorName;
  const collectorIdentifier = route?.params?.collectorIdentifier;
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [session, setSession] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collectorCount, setCollectorCount] = useState('');
  const [selectedCollector, setSelectedCollector] = useState<string | null>(null);
  const [requestingIds, setRequestingIds] = useState<string[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<{ [donationId: string]: boolean }>({});
  const [editingDonationId, setEditingDonationId] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);

  const hasSessionParam = Boolean(initialSessionId);
  const isCollector = Boolean(collectorIdentifier);
  const isOrganizer = user?.role === 'ORGANIZER';
  const isFamilyMember = user?.role === 'FAMILY_MEMBER';

  // Filter donations based on user role
  const filteredDonations = useMemo(() => {
    if (isOrganizer) {
      // Organizers see all donations
      return donations;
    } else if (isCollector) {
      // Collectors see only their donations
      const normalizedId = collectorIdentifier.trim().toUpperCase();
      return donations.filter(
        (d) => d.collector_name === collectorName && d.collector_identifier?.toUpperCase() === normalizedId
      );
    } else if (isFamilyMember) {
      // Family members see only their donations
      return donations.filter((d) => d.family_member_id && !d.collector_name);
    }
    return donations;
  }, [donations, isOrganizer, isCollector, collectorIdentifier, collectorName, isFamilyMember]);

  const donationTotal = useMemo(() => filteredDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0), [filteredDonations]);

  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    }
  }, [initialSessionId]);

  useEffect(() => {
    let pollInterval: any = null;
    const onFocus = () => {
      loadSession();
      // start short polling while focused
      pollInterval = setInterval(() => {
        loadSession();
      }, 5000);
    };
    const onBlur = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const unsubscribeFocus = navigation.addListener('focus', onFocus);
    const unsubscribeBlur = navigation.addListener('blur', onBlur);

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [navigation, sessionId, collectorIdentifier, collectorName]);

  const collectors = useMemo(() => {
    const setNames = new Set<string>();
    filteredDonations.forEach((d) => { if (d.collector_name) setNames.add(d.collector_name); });
    return Array.from(setNames);
  }, [filteredDonations]);

  const topDonations = useMemo(() => {
    const filtered = selectedCollector ? filteredDonations.filter((d) => d.collector_name === selectedCollector) : filteredDonations;
    return filtered.slice().sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 10);
  }, [filteredDonations, selectedCollector]);

  async function loadSession(idOverride?: string) {
    const effectiveSessionId = idOverride?.trim() || sessionId.trim();
    if (!effectiveSessionId) {
      return Alert.alert('Session required', 'Enter a session ID to load donation history.');
    }
    try {
      setLoading(true);
      const organizerIdentifier = collectorIdentifier ? collectorIdentifier.trim().toUpperCase() : '';
      const queryString = organizerIdentifier
        ? `?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}${collectorName ? `&collectorName=${encodeURIComponent(collectorName)}` : ''}`
        : '';
      const sessionPath = organizerIdentifier
        ? `/public/sessions/${effectiveSessionId}${queryString}`
        : `/sessions/${effectiveSessionId}`;
      const donationPath = organizerIdentifier
        ? `/public/sessions/${effectiveSessionId}/donations${queryString}`
        : `/sessions/${effectiveSessionId}/donations`;
      const [sessionRes, donationRes] = await Promise.all([
        api.get(sessionPath),
        api.get(donationPath),
      ]);
      setSessionId(effectiveSessionId);
      setSession(sessionRes.data);
      setCollectorCount(String(sessionRes.data?.session_meta?.collector_count || ''));
      setDonations(Array.isArray(donationRes.data) ? donationRes.data : []);
      setSelectedCollector(null);
      
      // Load donation edit request statuses
      if (Array.isArray(donationRes.data)) {
        const approved: { [key: string]: boolean } = {};
        for (const donation of donationRes.data) {
          try {
            const queryStr = organizerIdentifier && collectorName
              ? `?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`
              : '';
            const reqPath = organizerIdentifier && collectorName
              ? `/public/donations/${donation.id}/requests${queryStr}`
              : `/donations/${donation.id}/requests`;
            const res = await api.get(reqPath);
            const requests = Array.isArray(res.data) ? res.data : [];
            approved[donation.id] = requests.some((r: any) => r.status === 'APPROVED');
          } catch (err) {
            // ignore if no request exists
          }
        }
        setApprovedRequests(approved);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load donation history');
    } finally {
      setLoading(false);
    }
  }

  async function toggleDonationPaid(donationId: string, paid: boolean) {
    try {
      const organizerIdentifier = collectorIdentifier ? collectorIdentifier.trim().toUpperCase() : '';
      const donationPath = organizerIdentifier && collectorName
        ? `/public/donations/${donationId}?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`
        : `/donations/${donationId}`;
      const { data } = await api.patch(donationPath, { paid: !paid });
      setDonations((prev) => prev.map((item) => (item.id === donationId ? data : item)));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update donation status');
    }
  }

  async function toggleDonationApproval(donationId: string, approved: boolean) {
    try {
      const { data } = await api.patch(`/donations/${donationId}`, { approved: !approved, approvalNotes: !approved ? 'Approved by organizer' : null });
      setDonations((prev) => prev.map((item) => (item.id === donationId ? data : item)));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update approval status');
    }
  }

  async function openEditModal(donationId: string, currentAmount: number) {
    setEditingDonationId(donationId);
    setNewAmount(String(currentAmount));
    setEditModalVisible(true);
  }

  async function submitEditAmount() {
    if (!editingDonationId) return;
    const amount = Number(newAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }
    try {
      setEditingLoading(true);
      const organizerIdentifier = collectorIdentifier ? collectorIdentifier.trim().toUpperCase() : '';
      const donationPath = organizerIdentifier && collectorName
        ? `/public/donations/${editingDonationId}?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`
        : `/donations/${editingDonationId}`;
      const { data } = await api.patch(donationPath, { amount });
      setDonations((prev) => prev.map((item) => (item.id === editingDonationId ? data : item)));
      // Clear approved flag so further edits require a new request
      setApprovedRequests(prev => ({ ...prev, [editingDonationId]: false }));
      setEditModalVisible(false);
      setEditingDonationId(null);
      setNewAmount('');
      Alert.alert('Success', 'Donation amount updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update donation amount');
    } finally {
      setEditingLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Donation History</Text>
          <Text style={styles.subtitle}>View previous donations and approval status for this session.</Text>
        </View>

        <Card style={styles.sessionCard}>
          <Text style={styles.sectionTitle}>Session Lookup</Text>
          {!hasSessionParam && (
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Enter session ID"
                value={sessionId}
                onChangeText={setSessionId}
                style={[styles.input, { flex: 1 }]}
              />
              <Button title="Load" onPress={() => loadSession()} size="sm" style={styles.loadButton} />
            </View>
          )}
          {hasSessionParam && <Text style={styles.sessionMetaText}>Loaded from current session context.</Text>}
          {session ? (
            <View style={styles.sessionMeta}>
              <Text style={styles.sessionMetaText}>Deceased: {session.deceased_full_name}</Text>
              <Text style={styles.sessionMetaText}>Status: {session.status}</Text>
            </View>
          ) : null}
        </Card>

        {session && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Donations Overview</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Raised</Text>
              <Text style={styles.summaryValue}>₵{donationTotal.toLocaleString()}</Text>
            </View>
            {isOrganizer && <Text style={styles.sectionSubtitle}>Select a collector filter to view history.</Text>}
            {isOrganizer && collectors.length > 0 && (
              <View style={styles.filterRow}>
                <Button title="All Collectors" variant={selectedCollector ? 'secondary' : 'primary'} onPress={() => setSelectedCollector(null)} size="sm" />
                {collectors.map((c) => (
                  <Button key={c} title={c} onPress={() => setSelectedCollector(c)} size="sm" />
                ))}
              </View>
            )}

            {!filteredDonations.length ? (
              <Text style={styles.emptyText}>{isCollector ? 'No donations recorded by you.' : isFamilyMember ? 'No donations recorded by you.' : 'No donations recorded for this session yet.'}</Text>
            ) : (
              <>
                <Text style={[styles.sectionSubtitle, { marginTop: 12 }]}>Top Donations</Text>
                {topDonations.map((d) => (
                  <Card key={`top-${d.id}`} style={styles.topDonationItem}>
                    <Text style={styles.donationName}>{d.donor_name || d.donorName || 'Anonymous'}</Text>
                    <Text style={styles.donationMeta}>₵{Number(d.amount || 0).toLocaleString()} • {d.collector_name || 'No collector'}</Text>
                    {d.relative_name ? <Text style={styles.donationMeta}>Beneficiary: {d.relative_name}{d.relative_relationship ? ` (${d.relative_relationship})` : ''}</Text> : null}
                    <Text style={styles.donationMeta}>Recorded by {getRecorderLabel(d)}</Text>
                  </Card>
                ))}
                {((selectedCollector ? filteredDonations.filter((d) => d.collector_name === selectedCollector) : filteredDonations)).map((d) => (
                  <Card key={d.id} style={styles.donationItem}>
                    <View style={styles.donationRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.donationName}>{d.donor_name || d.donorName || 'Anonymous'}</Text>
                        <Text style={styles.donationMeta}>
                          {d.paid ? 'Paid' : 'Pending'} • {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                          {d.donor_phone ? ` • ${d.donor_phone}` : ''}
                        </Text>
                        <Text style={styles.donationMeta}>Recorded by {getRecorderLabel(d)}</Text>
                        {d.relative_name ? <Text style={styles.donationMeta}>Beneficiary: {d.relative_name}{d.relative_relationship ? ` (${d.relative_relationship})` : ''}</Text> : null}
                        {d.approved ? <Text style={styles.approvedTag}>Approved</Text> : null}
                        {d.approval_notes ? <Text style={styles.donationMeta}>Note: {d.approval_notes}</Text> : null}
                      </View>
                      <View style={styles.donationRight}>
                        <Text style={styles.donationAmount}>₵{Number(d.amount || 0).toLocaleString()}</Text>
                            {user?.role === 'ORGANIZER' && (
                          <View style={styles.actionButtons}>
                            <Button title={d.paid ? 'Mark Unpaid' : 'Mark Paid'} onPress={() => toggleDonationPaid(d.id, d.paid)} size="sm" />
                            <Button
                              title={d.approved ? 'Revoke' : 'Approve'}
                              onPress={() => toggleDonationApproval(d.id, d.approved)}
                              size="sm"
                              variant={d.approved ? 'secondary' : 'primary'}
                            />
                          </View>
                        )}
                            {/* Allow collectors or family members to request a per-donation edit */}
                            {((isCollector && d.collector_name === collectorName && d.collector_identifier?.toUpperCase() === (collectorIdentifier || '').trim().toUpperCase()) || isFamilyMember) && (
                              <View style={{ marginTop: 8, gap: 8 }}>
                                {approvedRequests[d.id] ? (
                                  <Button
                                    title="Edit Amount"
                                    size="sm"
                                    variant="primary"
                                    onPress={() => openEditModal(d.id, Number(d.amount || 0))}
                                  />
                                ) : (
                                  <Button
                                    title={requestingIds.includes(d.id) ? 'Requesting…' : 'Request Edit'}
                                    size="sm"
                                    variant="secondary"
                                    onPress={async () => {
                                      try {
                                        setRequestingIds(prev => [...prev, d.id]);
                                        const organizerIdentifier = collectorIdentifier ? collectorIdentifier.trim().toUpperCase() : '';
                                        if (isCollector) {
                                          await api.post(`/public/donations/${d.id}/request-edit?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`);
                                          // start polling for request status for this donation
                                          const pollKey = d.id;
                                          let stopped = false;
                                          const poll = async () => {
                                            try {
                                              const res = await api.get(`/public/donations/${d.id}/requests?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`);
                                              const rows = Array.isArray(res.data) ? res.data : [];
                                              if (rows.length > 0) {
                                                const latest = rows[0];
                                                if (latest.status === 'APPROVED') {
                                                  setApprovedRequests(prev => ({ ...prev, [d.id]: true }));
                                                  Alert.alert('Request Approved', 'Your edit request was approved — you can now edit the donation.');
                                                  stopped = true;
                                                } else if (latest.status === 'REJECTED') {
                                                  Alert.alert('Request Rejected', latest.reason || 'Your edit request was rejected.');
                                                  stopped = true;
                                                }
                                              }
                                            } catch (err) {
                                              // ignore transient errors
                                            }
                                            if (!stopped) setTimeout(poll, 3000);
                                          };
                                          setTimeout(poll, 1500);
                                        } else {
                                          await api.post(`/donations/${d.id}/requests`);
                                          // Poll for family members too
                                          let stopped = false;
                                          const poll = async () => {
                                            try {
                                              const res = await api.get(`/donations/${d.id}/requests`);
                                              const rows = Array.isArray(res.data) ? res.data : [];
                                              if (rows.length > 0) {
                                                const latest = rows[0];
                                                if (latest.status === 'APPROVED') {
                                                  setApprovedRequests(prev => ({ ...prev, [d.id]: true }));
                                                  Alert.alert('Request Approved', 'Your edit request was approved — you can now edit the donation.');
                                                  stopped = true;
                                                } else if (latest.status === 'REJECTED') {
                                                  Alert.alert('Request Rejected', latest.reason || 'Your edit request was rejected.');
                                                  stopped = true;
                                                }
                                              }
                                            } catch (err) {
                                              // ignore transient errors
                                            }
                                            if (!stopped) setTimeout(poll, 3000);
                                          };
                                          setTimeout(poll, 1500);
                                        }
                                        Alert.alert('Requested', 'Edit request submitted to organizer.');
                                      } catch (e: any) {
                                        Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not request edit');
                                      } finally {
                                        setRequestingIds(prev => prev.filter(x => x !== d.id));
                                      }
                                    }}
                                  />
                                )}
                              </View>
                            )}
                      </View>
                    </View>
                  </Card>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Edit Amount Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Donation Amount</Text>
            <TextInput
              placeholder="Enter new amount"
              value={newAmount}
              onChangeText={setNewAmount}
              keyboardType="decimal-pad"
              style={styles.modalInput}
              editable={!editingLoading}
            />
            <View style={styles.modalButtonRow}>
              <Button
                title="Cancel"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingDonationId(null);
                  setNewAmount('');
                }}
              />
              <Button
                title={editingLoading ? 'Updating…' : 'Update Amount'}
                size="sm"
                variant="primary"
                onPress={submitEditAmount}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const { colors, radius, spacing, typography } = require('../theme/colors');

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  header: {
    marginBottom: spacing.lg,
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
  sessionCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
  },
  loadButton: {
    minWidth: 100,
  },
  sessionMeta: {
    marginTop: spacing.sm,
  },
  sessionMetaText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  topDonationItem: {
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  donationItem: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  donationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  donationName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  donationMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  donationRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  donationAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: spacing.sm,
  },
  actionButtons: {
    gap: 8,
  },
  approvedTag: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginVertical: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
