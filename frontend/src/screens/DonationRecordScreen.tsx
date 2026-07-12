import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View, FlatList, Modal } from 'react-native';
import SafePressable from '../components/SafePressable';
import BackButton from '../components/BackButton';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DonationRecordScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const initialSessionId = route?.params?.id || '';
  const donationId = route?.params?.donationId;
  const collectorName = route?.params?.collectorName;
  const collectorIdentifier = route?.params?.collectorIdentifier;
  const initialRelatives = route?.params?.relatives || [];
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [session, setSession] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collectorCount, setCollectorCount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  const [relativeName, setRelativeName] = useState('');
  const [relativeRelationship, setRelativeRelationship] = useState('');
  const [donationPaid, setDonationPaid] = useState(false);
  const [relatives, setRelatives] = useState<any[]>(initialRelatives);
  const [showRelativePicker, setShowRelativePicker] = useState(false);

  const hasSessionParam = Boolean(initialSessionId);
  const isOrganizerAssist = Boolean(collectorIdentifier);

  const donationTotal = useMemo(() => donations.reduce((sum, d) => sum + Number(d.amount || 0), 0), [donations]);
  const sessionCompleted = session?.status === 'COMPLETED';

  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    }
  }, [initialSessionId]);

  useEffect(() => {
    async function loadDonation() {
      if (!donationId) return;
      try {
        setLoading(true);
        const donationPath = isOrganizerAssist && collectorIdentifier && collectorName
          ? `/public/donations/${donationId}?organizerIdentifier=${encodeURIComponent(collectorIdentifier.trim().toUpperCase())}&collectorName=${encodeURIComponent(collectorName)}`
          : `/donations/${donationId}`;
        const { data } = await api.get(donationPath);
        setDonorName(data.donor_name || data.donorName || '');
        setDonorPhone(data.donor_phone || data.donorPhone || '');
        setDonationAmount(String(data.amount || ''));
        setDonationNotes(data.notes || '');
        setRelativeName(data.relative_name || data.relativeName || '');
        setRelativeRelationship(data.relative_relationship || data.relativeRelationship || '');
        setDonationPaid(Boolean(data.paid));
        setSession(data.session_code || data.session_id || initialSessionId || '');
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Could not load donation');
      } finally {
        setLoading(false);
      }
    }
    loadDonation();
  }, [donationId, initialSessionId]);

  async function loadSession(idOverride?: string) {
    const effectiveId = idOverride?.trim() || sessionId.trim();
    if (!effectiveId) {
      return Alert.alert('Session required', 'Enter a session ID to load this session.');
    }

    try {
      setLoading(true);
      const organizerIdentifier = collectorIdentifier ? collectorIdentifier.trim().toUpperCase() : '';
      const queryString = organizerIdentifier
        ? `?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}${collectorName ? `&collectorName=${encodeURIComponent(collectorName)}` : ''}`
        : '';
      const sessionPath = organizerIdentifier
        ? `/public/sessions/${effectiveId}${queryString}`
        : `/sessions/${effectiveId}`;
      const donationPath = organizerIdentifier
        ? `/public/sessions/${effectiveId}/donations${queryString}`
        : `/sessions/${effectiveId}/donations`;
      const [sessionRes, donationRes] = await Promise.all([
        api.get(sessionPath),
        api.get(donationPath),
      ]);
      setSessionId(effectiveId);
      setSession(sessionRes.data);
      setCollectorCount(String(sessionRes.data?.session_meta?.collector_count || ''));
      setRelatives(Array.isArray(sessionRes.data?.session_meta?.relatives) ? sessionRes.data.session_meta.relatives : []);
      setDonations(Array.isArray(donationRes.data) ? donationRes.data : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load session donations');
    } finally {
      setLoading(false);
    }
  }

  async function saveCollectorCount() {
    const effectiveId = initialSessionId || sessionId;
    if (!effectiveId.trim()) {
      return Alert.alert('Session required', 'Load a session first.');
    }
    if (!collectorCount.trim()) {
      return Alert.alert('Collector limit', 'Enter a collector count or clear the field.');
    }
    try {
      const value = Number(collectorCount);
      if (Number.isNaN(value) || value < 1) {
        return Alert.alert('Collector limit', 'Collector count must be a positive number.');
      }
      await api.patch(`/sessions/${effectiveId.trim()}`, { sessionMeta: { collector_count: value } });
      Alert.alert('Saved', `Collector limit set to ${value}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save collector limit');
    }
  }

  async function addDonation() {
    if (sessionCompleted) {
      return Alert.alert('Session Completed', 'Donation recording is disabled for completed sessions.');
    }
    const effectiveId = initialSessionId || sessionId;
    if (!effectiveId.trim() && !donationId) {
      return Alert.alert('Session required', 'Load a session first.');
    }
    if (!donorName.trim() || !donationAmount.trim()) {
      return Alert.alert('Required', 'Enter donor name and amount');
    }
    if (relatives.length > 0 && !relativeName.trim()) {
      return Alert.alert('Required', 'Select a relative from the session relatives list.');
    }

    try {
      setSaving(true);
      const payload: any = {
        donorName: donorName.trim(),
        amount: Number(donationAmount),
        paid: donationPaid,
        donorPhone: donorPhone.trim() || null,
        notes: donationNotes.trim() || null,
        relativeName: relativeName.trim() || null,
        relativeRelationship: relativeRelationship.trim() || null,
      };

      let data;
      if (donationId) {
        // Edit existing donation
        if (isOrganizerAssist && collectorIdentifier && collectorName) {
          // Use public endpoint for organizer-assist collectors
          const response = await api.patch(
            `/public/donations/${donationId}?organizerIdentifier=${encodeURIComponent(collectorIdentifier.trim().toUpperCase())}&collectorName=${encodeURIComponent(collectorName)}`,
            payload
          );
          data = response.data;
        } else {
          // Use authenticated endpoint for regular users
          const response = await api.patch(`/donations/${donationId}`, payload);
          data = response.data;
        }
      } else {
        const now = new Date().toISOString();
        payload.checkedInAt = now;
        if (isOrganizerAssist && collectorIdentifier && collectorName) {
          const organizerIdentifier = collectorIdentifier.trim().toUpperCase();
          payload.collectorName = collectorName.trim();
          payload.collectorIdentifier = organizerIdentifier;
          const response = await api.post(
            `/public/sessions/${effectiveId.trim()}/donations?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`,
            payload
          );
          data = response.data;
        } else {
          const response = await api.post(`/sessions/${effectiveId.trim()}/donations`, payload);
          data = response.data;
        }
      }

      setDonations(prev => [data, ...prev]);
      setDonorName('');
      setDonorPhone('');
      setDonationAmount('');
      setDonationNotes('');
      setDonationPaid(false);
      Alert.alert(
        donationId ? 'Donation updated' : 'Donation recorded',
        donationId ? 'Donation has been updated successfully.' : 'Donation has been saved. Do you want to print a receipt?',
        donationId ? [{ text: 'OK', style: 'default' }] : [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => Alert.alert('Receipt', 'Receipt ready to print from your organizer dashboard.') },
        ]
      );
    } catch (e: any) {
      if (e?.response?.status === 403 && e?.response?.data?.code === 'APPROVAL_PENDING') {
        Alert.alert('Awaiting Approval', e?.response?.data?.message || 'Your access is awaiting organizer approval.');
        return;
      }
      Alert.alert('Error', e?.message || 'Could not save donation');
    } finally {
      setSaving(false);
    }
  }

  const selectRelative = (relative: any) => {
    setRelativeName(relative.name || '');
    setRelativeRelationship(relative.relationship || '');
    setShowRelativePicker(false);
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Record Donation</Text>
          <Text style={styles.subtitle}>Capture a donation for the selected funeral session.</Text>
        </View>
        {sessionCompleted && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Session Completed</Text>
            <Text style={styles.sectionSubtitle}>Donation recording is disabled for completed sessions. Please use donation history to review past donations.</Text>
          </Card>
        )}

        <Card style={styles.sessionCard}>
          <Text style={styles.cardTitle}>Session</Text>
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
          {session ? (
            <View style={styles.sessionMeta}>
              <Text style={styles.sessionMetaText}>Deceased: {session.deceased_full_name}</Text>
              <Text style={styles.sessionMetaText}>Status: {session.status}</Text>
              <Text style={styles.sessionMetaText}>Total donations: ₵{donationTotal.toLocaleString()}</Text>
            </View>
          ) : (
            <Text style={styles.sessionMetaText}>Select a session to start collecting donations.</Text>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Donation Details</Text>
          <View style={styles.addRow}>
            <TextInput placeholder="Donor name" value={donorName} onChangeText={setDonorName} style={[styles.input, { flex: 1 }]} editable={!sessionCompleted} />
            <TextInput placeholder="Amount" value={donationAmount} keyboardType="decimal-pad" onChangeText={setDonationAmount} style={[styles.input, { width: 120, marginLeft: 8 }]} editable={!sessionCompleted} />
          </View>
          <View style={styles.addRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder={relatives.length > 0 ? 'Select from relatives' : 'Relative / beneficiary'}
                value={relativeName}
                onChangeText={relatives.length > 0 ? () => {} : setRelativeName}
                style={styles.input}
                editable={!sessionCompleted && relatives.length === 0}
              />
              {relatives.length > 0 && (
                <SafePressable onPress={() => !sessionCompleted && setShowRelativePicker(true)} style={styles.selectRelativeButton}>
                  <Text style={styles.selectRelativeText}>Select from relatives</Text>
                </SafePressable>
              )}
            </View>
            <TextInput
              placeholder="Relationship"
              value={relativeRelationship}
              onChangeText={relatives.length > 0 ? () => {} : setRelativeRelationship}
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              editable={!sessionCompleted && relatives.length === 0}
            />
          </View>
          <View style={styles.addRow}>
            <TextInput placeholder="Phone" value={donorPhone} keyboardType="phone-pad" onChangeText={setDonorPhone} style={[styles.input, { flex: 1 }]} editable={!sessionCompleted} />
            <TextInput placeholder="Notes" value={donationNotes} onChangeText={setDonationNotes} style={[styles.input, { flex: 1, marginLeft: 8 }]} editable={!sessionCompleted} />
            <View style={[styles.checkboxWrapper, { marginLeft: 8 }]}> 
              <Button title={donationPaid ? 'Paid' : 'Pending'} onPress={() => !sessionCompleted && setDonationPaid(prev => !prev)} variant={donationPaid ? 'primary' : 'secondary'} size="sm" disabled={sessionCompleted} />
            </View>
          </View>
          <Modal transparent visible={showRelativePicker} animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select a relative</Text>
                <FlatList
                  data={relatives}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <SafePressable onPress={() => selectRelative(item)} style={styles.relativeOption}>
                      <Text style={styles.relativeOptionName}>{item.name}</Text>
                      <Text style={styles.relativeOptionRelationship}>{item.relationship}</Text>
                    </SafePressable>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>No relatives available for this session.</Text>}
                />
                <Button title="Close" onPress={() => setShowRelativePicker(false)} />
              </View>
            </View>
          </Modal>
          <Button title="Add Donation" onPress={addDonation} loading={saving} disabled={sessionCompleted} style={styles.saveButton} />
          {user?.role === 'ORGANIZER' && (
            <View style={styles.collectorLimitRow}>
              <TextInput
                placeholder="Collector limit"
                value={collectorCount}
                onChangeText={setCollectorCount}
                keyboardType="number-pad"
                style={[styles.input, { flex: 1 }]}
              />
              <Button title="Save" onPress={saveCollectorCount} size="sm" style={{ marginLeft: 8 }} />
            </View>
          )}
        </Card>
      </ScrollView>
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
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionCard: {
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadButton: {
    minWidth: 100,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
  },
  sessionMeta: {
    marginTop: spacing.sm,
  },
  sessionMetaText: {
    color: colors.text.secondary,
    marginBottom: 4,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  collectorLimitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  checkboxWrapper: {
    justifyContent: 'center',
  },
  selectRelativeButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  selectRelativeText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
    color: colors.text.primary,
  },
  relativeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  relativeOptionName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  relativeOptionRelationship: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
