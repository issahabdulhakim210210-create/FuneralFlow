import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function normalizeSelectedServices(value: any): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

type FuneralRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'INVOICED'
  | 'PAID'
  | 'SESSION_CREATED';

type FuneralRequest = {
  id: string;
  family_member_id?: string;
  organizer_id: string;
  deceased_full_name: string;
  funeral_date?: string;
  budget?: number;
  selected_services: any[];
  guest_breakdown?: { family?: number; church?: number; work?: number; friends?: number };
  projected_attendance?: number;
  calculated_total?: number;
  status: FuneralRequestStatus;
  accepted_at?: string;
  created_at: string;
  submitted_in_person?: boolean;
  contact_name?: string;
  contact_phone?: string;
  family_member_name?: string;
  family_member_email?: string;
  family_member_phone?: string;
};

const tabs: Array<'ALL' | FuneralRequestStatus | 'WALK_IN'> = [
  'ALL',
  'PENDING',
  'ACCEPTED',
  'INVOICED',
  'PAID',
  'SESSION_CREATED',
  'REJECTED',
  'WALK_IN',
];

const statusStyles: Record<FuneralRequestStatus, { backgroundColor: string; textColor: string }> = {
  PENDING: { backgroundColor: '#FEF3C7', textColor: '#92400E' },
  ACCEPTED: { backgroundColor: '#DBEAFE', textColor: '#1D4ED8' },
  SESSION_CREATED: { backgroundColor: '#DCFCE7', textColor: '#166534' },
  REJECTED: { backgroundColor: '#FECACA', textColor: '#991B1B' },
  INVOICED: { backgroundColor: '#E0F2FE', textColor: '#0369A1' },
  PAID: { backgroundColor: '#D1FAE5', textColor: '#166534' },
};

export default function RequestsScreen({ navigation }: any) {
  const { user } = useAuth();
  const isFamily = user?.role === 'FAMILY_MEMBER';
  const isOrganizer = user?.role === 'ORGANIZER';
  const canCreateWalkInRequest = isOrganizer || user?.role === 'SUPER_ADMIN';
  const [requests, setRequests] = useState<FuneralRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<FuneralRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | FuneralRequestStatus | 'WALK_IN'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadRequests() {
    try {
      setLoading(true);

      const { data } = await api.get('/requests');

      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert(
        'Could not load requests',
        error?.message || 'Please try again.'
      );
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
      const tabMatch =
        activeTab === 'ALL'
          ? true
          : activeTab === 'WALK_IN'
            ? !!request.submitted_in_person
            : request.status === activeTab;
      const searchMatch =
        !query ||
        request.deceased_full_name?.toLowerCase().includes(query) ||
        request.family_member_name?.toLowerCase().includes(query) ||
        request.family_member_email?.toLowerCase().includes(query) ||
        request.family_member_phone?.toLowerCase().includes(query) ||
        request.contact_name?.toLowerCase().includes(query) ||
        request.contact_phone?.toLowerCase().includes(query);
      return tabMatch && searchMatch;
    });
  }, [requests, activeTab, search]);

  const firstInvoicedRequest = useMemo(() => {
    return requests.find((r) => r.status === 'INVOICED') || null;
  }, [requests]);

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
      Alert.alert('Request accepted', 'The request has been approved and invoiced. Family members should complete payment before a session can be created.');
    } catch (error: any) {
      Alert.alert('Could not accept request', error?.message || 'Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function declineRequest(request: FuneralRequest) {
    try {
      setActionLoadingId(request.id);
      const { data } = await api.post(`/requests/${request.id}/decline`);
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, status: data.status || 'REJECTED' } : item
        )
      );
      setSelectedRequest((current) =>
        current?.id === request.id ? { ...current, status: data.status || 'REJECTED' } : current
      );
      Alert.alert('Request declined', 'The family request has been declined.');
    } catch (error: any) {
      Alert.alert('Could not decline request', error?.message || 'Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function requestWalkInPayment(request: FuneralRequest) {
    try {
      setActionLoadingId(request.id);
      const { data } = await api.post(`/requests/${request.id}/request-walkin-payment`);
      Alert.alert('Payment request sent', data?.message || 'The walk-in contact has been notified to pay in person.');
    } catch (error: any) {
      Alert.alert('Could not request payment', error?.message || 'Please try again.');
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

  function navigateToInvoicePayment(request: FuneralRequest) {
    const amount = Number(request.calculated_total ?? request.budget ?? 0);
    const isOrganizerPayment = user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN';
    const isWalkIn = Boolean(request.submitted_in_person);

    navigation.navigate('PaymentGate', {
      purpose: 'INVOICE',
      amount,
      requestId: request.id,
      title: isOrganizerPayment ? (isWalkIn ? 'Collect Walk-in Payment' : 'Collect Invoice Payment') : 'Pay Organizer Invoice',
      subtitle: isOrganizerPayment
        ? (isWalkIn ? 'Collect payment for the selected services from the walk-in family.' : 'Complete the request payment to unlock session creation.')
        : 'Complete your request payment to unlock session creation.',
    });
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heading}>Requests Dashboard</Text>
            <Text style={styles.subheading}>
              View and manage requests submitted by family members using your Organizer Identifier.
            </Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricText}>{filteredRequests.length} requests</Text>
          </View>
        </View>

        {isFamily && firstInvoicedRequest ? (
          <Card style={styles.invoiceBanner}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.invoiceTitle}>Payment required</Text>
                <Text style={styles.invoiceText}>{`Your request for ${firstInvoicedRequest.deceased_full_name} is awaiting payment. Pay now to unlock session creation.`}</Text>
              </View>
              <Button
                title={`Pay ₵ ${Number(firstInvoicedRequest.calculated_total ?? firstInvoicedRequest.budget ?? 0).toFixed(2)}`}
                onPress={() => navigateToInvoicePayment(firstInvoicedRequest)}
              />
            </View>
          </Card>
        ) : null}

        {canCreateWalkInRequest ? (
          <Card style={styles.createWalkInCard}>
            <View style={styles.createWalkInContent}>
              <View style={styles.createWalkInTextWrap}>
                <Text style={styles.createWalkInTitle}>Create a walk-in request</Text>
                <Text style={styles.createWalkInText}>Start an on-site request for a family that arrived in person.</Text>
              </View>
              <Button title="New Walk-in Request" onPress={() => navigation.navigate('CreateRequest')} />
            </View>
          </Card>
        ) : null}

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
                style={({ pressed }: any) => [styles.tabItem, active ? styles.tabItemActive : styles.tabItemInactive]}
              >
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>
                  {tab === 'ALL' ? 'All' : tab === 'WALK_IN' ? 'Walk-in' : tab.replace('_', ' ')}
                </Text>
              </SafePressable>
            );
          })}
        </View>

        <View style={styles.actionRow}>
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
            const status = statusStyles[request.status] || statusStyles.PENDING;

            return (
              <Card key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestTitleBlock}>
                    <Text style={styles.requestTitle}>{request.deceased_full_name}</Text>
                    <Text style={styles.requestMeta}>{request.family_member_name || 'Family name unavailable'}</Text>
                  </View>
                  <View style={styles.badgeColumn}>
                    {request.submitted_in_person ? (
                      <View style={styles.walkInBadge}>
                        <Text style={styles.walkInBadgeText}>Walk-in</Text>
                      </View>
                    ) : null}
                    <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}> 
                      <Text style={[styles.statusText, { color: status.textColor }]}>{request.status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.requestSummary}>
                  <InfoRow label="Budget" value={`₵ ${Number(request.budget || 0).toFixed(2)}`} />
                  <InfoRow label="Email" value={request.family_member_email || 'N/A'} />
                  <InfoRow label="Phone" value={request.family_member_phone || 'N/A'} />
                </View>

                <View style={styles.requestActions}>
                  <Button
                    title={isSelected ? 'Hide Request' : 'View Request'}
                    variant="secondary"
                    onPress={() => setSelectedRequest(isSelected ? null : request)}
                  />
                  {request.status === 'INVOICED' && (isFamily || isOrganizer) && (
                    <Button
                      title={isOrganizer ? 'Collect Payment' : 'Pay Invoice'}
                      onPress={() => navigateToInvoicePayment(request)}
                      style={styles.payButton}
                    />
                  )}
                  {request.status === 'INVOICED' && isOrganizer && request.submitted_in_person && (
                    <Button
                      title="Request In-person Payment"
                      variant="secondary"
                      loading={actionLoadingId === request.id}
                      onPress={() => requestWalkInPayment(request)}
                    />
                  )}
                </View>

                {isSelected && (
                  <View style={styles.detailsPanel}>
                    <Text style={styles.sectionHeading}>Request Details</Text>
                    <InfoRow label="Deceased Name" value={request.deceased_full_name} />
                    <InfoRow label="Family Member" value={request.family_member_name} />
                    <InfoRow label="Funeral Date" value={request.funeral_date ? new Date(request.funeral_date).toLocaleDateString() : 'Not set'} />
                    <InfoRow label="Email" value={request.family_member_email} />
                    <InfoRow label="Phone" value={request.family_member_phone} />
                    <InfoRow label="Budget" value={`₵ ${Number(request.budget || 0).toFixed(2)}`} />
                    {request.guest_breakdown ? (
                      <View>
                        <InfoRow label="Family Guests" value={`${request.guest_breakdown.family || 0}`} />
                        <InfoRow label="Church Guests" value={`${request.guest_breakdown.church || 0}`} />
                        <InfoRow label="Work Guests" value={`${request.guest_breakdown.work || 0}`} />
                        <InfoRow label="Friends Guests" value={`${request.guest_breakdown.friends || 0}`} />
                      </View>
                    ) : null}
                    {request.projected_attendance ? (
                      <InfoRow label="Projected Attendance" value={`${request.projected_attendance}`} />
                    ) : null}
                    <InfoRow label="Status" value={request.status} />
                    {request.submitted_in_person ? (
                      <>
                        <InfoRow label="Walk-in contact" value={request.contact_name || 'N/A'} />
                        <InfoRow label="Walk-in phone" value={request.contact_phone || 'N/A'} />
                      </>
                    ) : null}
                    <InfoRow label="Date Sent" value={new Date(request.created_at).toLocaleDateString()} />

                    <Text style={styles.sectionHeading}>Selected Services</Text>
                    {normalizeSelectedServices(request.selected_services).length > 0 ? (
                      normalizeSelectedServices(request.selected_services).map((service, index) => (
                        <View key={`${request.id}-service-${index}`} className="py-3 border-b border-slate-100" style={styles.serviceRow}>
                          <Text className="text-slate-900 font-bold" style={styles.serviceName}>{service?.name || String(service)}</Text>
                          {service?.note ? ( <Text className="text-slate-500 mt-1" style={styles.serviceNote}>{service.note}</Text> ) : null}
                        </View>
                      ))
                    ) : (
                      <Text className="text-slate-500" style={styles.emptyText}>No selected services recorded.</Text>
                    )}

                    <View style={styles.detailsActionRow}>
                      {request.status === 'PENDING' && (
                        <>
                          <Button
                            title="Accept Request"
                            loading={actionLoadingId === request.id}
                            onPress={() => acceptRequest(request)}
                          />
                          <Button
                            title="Decline Request"
                            variant="danger"
                            loading={actionLoadingId === request.id}
                            onPress={() => declineRequest(request)}
                          />
                        </>
                      )}
                      {request.status === 'INVOICED' && (isFamily || isOrganizer) && (
                        <Button
                          title={isOrganizer ? 'Collect Payment' : 'Pay Invoice'}
                          loading={actionLoadingId === request.id}
                          onPress={() => navigateToInvoicePayment(request)}
                        />
                      )}
                      {request.status === 'INVOICED' && isOrganizer && request.submitted_in_person && (
                        <Button
                          title="Request In-person Payment"
                          variant="secondary"
                          loading={actionLoadingId === request.id}
                          onPress={() => requestWalkInPayment(request)}
                        />
                      )}
                      {request.status === 'PAID' && isOrganizer && (
                        <Button
                          title="Create Funeral Session"
                          loading={actionLoadingId === request.id}
                          onPress={() => createSessionFromRequest(request)}
                        />
                      )}
                      {request.status === 'PAID' && isFamily && (
                        <Button
                          title="Awaiting Session Creation"
                          variant="secondary"
                          disabled
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
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
  heroCard: {
    backgroundColor: '#4338CA',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    flexDirection: 'column',
    gap: 16,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
    lineHeight: 36,
  },
  subheading: {
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 22,
  },
  metricPill: {
    backgroundColor: '#E0E7FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  metricText: {
    color: '#3730A3',
    fontWeight: '800',
  },
  searchBlock: {
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    minWidth: 90,
    marginRight: 10,
    marginBottom: 10,
  },
  tabItemActive: {
    backgroundColor: '#4338CA',
  },
  tabItemInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabLabel: {
    fontWeight: '900',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabLabelInactive: {
    color: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  emptyCard: {
    padding: 32,
    paddingVertical: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 14,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: '90%',
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
    fontSize: 14,
    color: '#64748B',
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  walkInBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FDE68A',
  },
  walkInBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  statusBadge: {
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
  createWalkInCard: {
    marginBottom: 16,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  createWalkInContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  createWalkInTextWrap: {
    flex: 1,
  },
  createWalkInTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 4,
  },
  createWalkInText: {
    fontSize: 13,
    color: '#A16207',
    lineHeight: 18,
  },
  requestSummary: {
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
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
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  requestActions: {
    marginBottom: 12,
  },
  detailsPanel: {
    marginTop: 16,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 14,
  },
  serviceRow: {
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
  detailsActionRow: {
    marginTop: 18,
    gap: 10,
  },
  payButton: {
    marginTop: 8,
  },
  invoiceBanner: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 6,
  },
  invoiceText: {
    color: '#92400E',
    fontSize: 13,
  },
});