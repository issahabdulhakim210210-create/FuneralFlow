import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FamilyPaymentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get('/payments/outstanding');
      const list = Array.isArray(data) ? data : [];
      setPayments(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  if (!user) return null;

  return (
    <Screen>
      <View style={styles.topBar}>
        <SafePressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </SafePressable>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Outstanding Payments</Text>
        <Text style={styles.subtitle}>Payments you need to complete for your requests</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} style={styles.list}>
        {payments.length === 0 && !loading ? (
          <Card style={styles.card}><Text style={styles.empty}>No outstanding payments</Text></Card>
        ) : null}

        {payments.map((p) => (
          <Card key={p.id} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.amount}>₵ {Number(p.amount).toFixed(2)}</Text>
                <Text style={styles.purpose}>{p.purpose || 'Invoice'}</Text>
                <Text style={styles.meta}>Request: {p.metadata?.requestId || '—'}</Text>
                <Text style={styles.meta}>Status: {p.status}</Text>
                {p.attempt_count > 1 ? <Text style={styles.meta}>Attempts: {p.attempt_count}</Text> : null}
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Button title="Pay" onPress={() => navigation.navigate('PaymentGate', { purpose: 'INVOICE', amount: Number(p.amount), requestId: p.metadata?.requestId, title: 'Pay Invoice', subtitle: 'Complete this payment to proceed.' })} />
              </View>
            </View>
            {p.deceased_name ? <Text style={styles.deceased}>Deceased: {p.deceased_name}</Text> : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: '#0066cc', fontWeight: '600' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { color: '#64748B', marginTop: 6 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: { marginBottom: 12, padding: 12 },
  amount: { fontWeight: '900', fontSize: 18, color: '#0F172A' },
  purpose: { color: '#334155', marginTop: 4 },
  meta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  deceased: { marginTop: 8, color: '#475569', fontSize: 14 },
  empty: { color: '#64748B', padding: 12 },
});
