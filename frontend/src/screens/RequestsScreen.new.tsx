import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../services/api';

const tabs: Array<'ALL' | 'PENDING' | 'ACCEPTED' | 'SESSION_CREATED' | 'REJECTED'> = [
  'ALL',
  'PENDING',
  'ACCEPTED',
  'SESSION_CREATED',
  'REJECTED',
];

type FuneralRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SESSION_CREATED';

type FuneralRequest = {
  id: string;
  family_member_id?: string;
  organizer_id: string;
  deceased_full_name: string;
  budget?: number;
  selected_services: any[];
  status: FuneralRequestStatus;
  accepted_at?: string;
  created_at: string;
  family_member_name?: string;
  family_member_email?: string;
  family_member_phone?: string;
};

const statusMap: Record<FuneralRequestStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FDE68A', text: '#92400E' },
  ACCEPTED: { bg: '#DBEAFE', text: '#1D4ED8' },
  SESSION_CREATED: { bg: '#DCFCE7', text: '#166534' },
  REJECTED: { bg: '#FECACA', text: '#991B1B' },
};

export default function RequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<FuneralRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<FuneralRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | FuneralRequestStatus>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadRequests() {
    try {
      setLoading(true);
      const { data } = await api.get('/requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Could not load requests', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const tabMatch = activeTab === 'ALL' || request.status === activeTab;
      const searchMatch =
        !query ||
        request.deceased_full_name?.toLowerCase().includes(query) ||
        request.family_member_name?.toLowerCase().includes(query) ||
        request.family_member_email?.toLowerCase().includes(query) ||
        request.family_member_phone?.toLowerCase().includes(query);
      return tabMatch && searchMatch;
    });
  }, [requests, activeTab, search]);

  async function acceptRequest(request: FuneralRequest) {
    try {
      setActionLoadingId(request.id);
      const { data } = await api.post(`/requests/${request.id}/accept`);
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, status: data.status || 'ACCEPTED', accepted_at: data.accepted_at }
            : item
        )
      );
      setSelectedRequest((current) =>
        current?.id === request.id
          ? { ...current, status: data.status || 'ACCEPTED', accepted_at: data.accepted_at }
          : current
      );
      Alert.alert('Request accepted', 'You can now create a funeral session for this request.');
    } catch (error: any) {
      Alert.alert('Could not accept request', error?.message || 'Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function createSessionFromRequest(request: FuneralRequest) {
    try {
      setActionLoadingId(request.id);
      await api.post('/sessions', {
        requestId: request.id,
        deceasedFullName: request.deceased_full_name,
      });
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, status: 'SESSION_CREATED' } : item
        )
      );
      setSelectedRequest((current) =>
        current?.id === request.id ? { ...current, status: 'SESSION_CREATED' } : current
      );
      Alert.alert('Session created', 'A funeral planning session has been created for this request.', [
        { text: 'View Sessions', onPress: () => navigation.navigate('Sessions') },
        { text: 'Stay Here', style: 'cancel' },
      ]);
    } catch (error: any) {
      Alert.alert('Could not create session', error?.message || 'Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}> 
        <View style={styles.hero}> 
          <View>
            <Text style={styles.heading}>Requests Dashboard</Text>
            <Text style={styles.subheading}>
              View and manage funeral requests submitted by family members using your Organizer Identifier.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'}</Text>
          </View>
        </View>

        <Input
          label="Search Requests"
          placeholder="Search by deceased name, family name, email or phone"
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchBlock}
        />

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <SafePressable
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setSelectedRequest(null);
                }}
                style={({ pressed }: any) => [styles.tab, active ? styles.tabActive : styles.tabInactive]}
              >
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>
                  {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
                </Text>
              </SafePressable>
            );
          })}
        </View>

        <View style={styles.buttonRow}>
          <Button title="Refresh Requests" variant="ghost" loading={loading} onPress={loadRequests} />
          <Button title="Back to Dashboard" variant="ghost" onPress={() => navigation.navigate('Dashboard')} />
        </View>

        {filteredRequests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>
              When family members send requests using your Organizer Identifier, they will appear here.
            </Text>
          </Card>
        ) : (
          filteredRequests.map((request) => {
            const isSelected = selectedRequest?.id === request.id;
            const status = statusMap[request.status];

            return (
              <Card key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestTitleBlock}>
                    <Text style={styles.requestTitle}>{request.deceased_full_name}</Text>
                    <Text style={styles.requestMeta}>{request.family_member_name || 'Family name unavailable'}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: status.bg }]}> 
                    <Text style={[styles.statusText, { color: status.text }]}>{request.status}</Text>
                  </View>
                </View>

                <View style={styles.requestBody}>
                  <View style={styles.requestInfoRow}>
                    <Text style={styles.infoLabel}>Budget</Text>
                    <Text style={styles.infoValue}>₵ {Number(request.budget || 0).toFixed(2)}</Text>
                  </View>

                  <View style={styles.requestInfoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{request.family_member_email || 'N/A'}</Text>
                  </View>

                  <View style={styles.requestInfoRow}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{request.family_member_phone || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.requestActions}>
                  <Button
                    title={isSelected ? 'Hide Request' : 'View Request'}
                    variant="secondary"
                    onPress={() => setSelectedRequest(isSelected ? null : request)}
                  />
                </View>

                {isSelected && (
                  <View style={styles.detailsPanel}>
                    <Text style={styles.detailsHeading}>Request Details</Text>
                    <InfoRow label="Deceased Name" value={request.deceased_full_name} />
                    <InfoRow label="Family Member" value={request.family_member_name} />
                    <InfoRow label="Email" value={request.family_member_email} />
                    <InfoRow label="Phone" value={request.family_member_phone} />
                    <InfoRow label="Budget" value={`₵ ${Number(request.budget || 0).toFixed(2)}`} />
                    <InfoRow label="Status" value={request.status} />
                    <InfoRow label="Date Sent" value={new Date(request.created_at).toLocaleDateString()} />

                    <Text style={styles.sectionHeading}>Selected Services</Text>
                    {Array.isArray(request.selected_services) && request.selected_services.length > 0 ? (
                      request.selected_services.map((service, index) => (
                        <View key={`${request.id}-service-${index}`} style={styles.serviceItem}>
                          <Text style={styles.serviceName}>{service?.name || String(service)}</Text>
                          {service?.note ? <Text style={styles.serviceNote}>{service.note}</Text> : null}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No selected services recorded.</Text>
                    )}

                    <View style={styles.detailsButtonRow}>
                      {request.status === 'PENDING' && (
                        <Button
                          title="Accept Request"
                          loading={actionLoadingId === request.id}
                          onPress={() => acceptRequest(request)}
                        />
                      )}
                      {request.status === 'ACCEPTED' && (
                        <Button
                          title="Create Funeral Session"
                          loading={actionLoadingId === request.id}
                          onPress={() => createSessionFromRequest(request)}
                        />
                      )}
                      {request.status === 'SESSION_CREATED' && (
                        <Button
                          title="View Sessions"
                          variant="secondary"
                          onPress={() => navigation.navigate('Sessions')}
                        />
                      )}
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        )}
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
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#4338CA',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heading: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 8,
  },
  subheading: {
    color: '#D8DBFF',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: '72%',
  },
  heroBadge: {
    backgroundColor: '#E0E7FF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  heroBadgeText: {
    color: '#3730A3',
    fontWeight: '800',
  },
  searchBlock: {
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    minWidth: 90,
  },
  tabActive: {
    backgroundColor: '#4338CA',
  },
  tabInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabLabel: {
    fontWeight: '800',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabLabelInactive: {
    color: '#334155',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  requestCard: {
    marginBottom: 20,
    borderRadius: 24,
    padding: 22,
    backgroundColor: '#FFFFFF',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  requestTitleBlock: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  requestMeta: {
    color: '#64748B',
    fontSize: 14,
  },
  statusPill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  requestBody: {
    marginBottom: 18,
    gap: 10,
  },
  requestInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  requestActions: {
    marginBottom: 12,
  },
  detailsPanel: {
    marginTop: 16,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailsHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  serviceItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  serviceNote: {
    color: '#64748B',
    marginTop: 6,
  },
  detailsButtonRow: {
    marginTop: 18,
    gap: 10,
  },
});
