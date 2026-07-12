import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Screen } from '../components/Screen';
import { api } from '../services/api';
import { Button } from '../components/Button';

export default function SessionOverviewScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const [session, setSession] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const formatCurrencyValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(numeric)) return '';
    return numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  async function loadOverview() {
    if (!id) return;
    try {
      setLoading(true);
      const [sessionRes, overviewRes, donationsRes, checklistsRes] = await Promise.all([
        api.get(`/sessions/${id}`),
        api.get(`/sessions/${id}/overview`),
        api.get(`/sessions/${id}/donations`),
        api.get(`/sessions/${id}/checklists`),
      ]);

      setSession(sessionRes.data);
      setOverview(overviewRes.data);
      setDonations(Array.isArray(donationsRes.data) ? donationsRes.data : []);
      setChecklists(Array.isArray(checklistsRes.data) ? checklistsRes.data : []);

      try {
        const expensesRes = await api.get(`/sessions/${id}/expenses`);
        setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      } catch {
        setExpenses([]);
      }
    } catch (e: any) {
      console.warn('Could not load overview', e?.message || e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, [id]);

  const planning = session?.session_meta?.planning || overview?.planning || {};
  const requestTotal = session?.session_meta?.request_snapshot?.calculated_total ?? session?.session_meta?.request_snapshot?.calculatedTotal ?? null;
  const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remainingFromRequest = requestTotal !== null && requestTotal !== undefined ? Number(requestTotal) - expensesTotal : null;
  const completedChecklistCount = checklists.filter((item) => item.completed).length;
  const donationCount = donations.length;
  const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOverview} />}>
        <View style={styles.container}>
          <Button title="← Back" variant="ghost" onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Overview of Session</Text>
          <Text style={styles.subtitle}>{session?.deceased_full_name || overview?.session?.deceasedName || ''} ({session?.session_code || overview?.session?.sessionCode || ''})</Text>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionSubtitle}>Session Summary</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deceased</Text>
              <Text style={styles.infoValue}>{session?.deceased_full_name || overview?.session?.deceasedName || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{session?.status || overview?.session?.status || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Session Code</Text>
              <Text style={styles.infoValue}>{session?.session_code || overview?.session?.sessionCode || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Funeral Date</Text>
              <Text style={styles.infoValue}>{planning?.funeralDate || planning?.funeral_date || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>{planning?.venue || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionSubtitle}>Planning Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimated Guests</Text>
              <Text style={styles.infoValue}>{planning?.noOfGuests ?? planning?.no_of_guests ?? 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Request Total</Text>
              <Text style={styles.infoValue}>{requestTotal ? `₵${Number(requestTotal).toLocaleString()}` : 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expenses Total</Text>
              <Text style={styles.infoValue}>{expensesTotal ? `₵${formatCurrencyValue(expensesTotal)}` : 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remaining</Text>
              <Text style={styles.infoValue}>{remainingFromRequest !== null ? `₵${formatCurrencyValue(remainingFromRequest)}` : 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionSubtitle}>Progress Overview</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Checklist</Text>
              <Text style={styles.infoValue}>{completedChecklistCount} completed / {checklists.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Donations</Text>
              <Text style={styles.infoValue}>{donationCount} donations • ₵{formatCurrencyValue(totalDonations)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#6b7280', marginBottom: 12 },
  sectionCard: { marginTop: 12, backgroundColor: '#fff', padding: 16, borderRadius: 16 },
  sectionSubtitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  infoLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  infoValue: { fontSize: 14, color: '#475569', maxWidth: '60%', textAlign: 'right' },
});
