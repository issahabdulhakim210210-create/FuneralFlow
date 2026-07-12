import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import SafePressable from '../components/SafePressable';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

export default function AuditLogScreen({ navigation }: any) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [limit] = useState(50);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  async function loadLogs() {
    try {
      setLoading(true);
      const params: any = { limit };
      if (query) params.action = query;
      params.offset = (page - 1) * limit;
      const { data } = await api.get('/audit', { params });
      setLogs(Array.isArray(data) ? data : []);
      setHasMore(Array.isArray(data) ? data.length === limit : false);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, [page, query]);

  useEffect(() => { setPage(1); }, [query]);

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
        <Text style={styles.title}>Audit Logs</Text>
        <Text style={styles.subtitle}>Recent actions taken on the platform</Text>
      </View>

      <Input label="Filter by action" placeholder="e.g. DELETE_SESSION" value={query} onChangeText={setQuery} containerStyle={styles.search} />
      <View style={styles.actionsRow}>
        <Button title="Prev" variant="ghost" onPress={() => setPage(Math.max(1, page-1))} disabled={page<=1 || loading} />
        <Button title={`Page ${page}`} variant="ghost" disabled />
        <Button title="Next" variant="ghost" onPress={() => setPage(page+1)} disabled={!hasMore || loading} />
        <Button title="Refresh" variant="ghost" onPress={loadLogs} loading={loading} />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLogs} />} style={styles.list}>
        {logs.map((l) => (
          <Card key={l.id} style={styles.card}>
            <Text style={styles.action}>{l.action}</Text>
            <Text style={styles.meta}>Entity: {l.entity} • ID: {l.entity_id}</Text>
            <Text style={styles.meta}>User: {l.user_name || l.user_id || 'System'}</Text>
            <Text style={styles.date}>{new Date(l.created_at).toLocaleString()}</Text>
            {l.metadata && <Text style={styles.payload}>{JSON.stringify(l.metadata)}</Text>}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  subtitle: { color: '#64748B', marginTop: 6 },
  search: { paddingHorizontal: 24, marginBottom: 12 },
  actionsRow: { paddingHorizontal: 24, marginBottom: 12 },
  list: { paddingHorizontal: 24 },
  card: { marginBottom: 12, padding: 12 },
  action: { fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  meta: { color: '#475569', marginBottom: 4 },
  date: { color: '#94A3B8', fontSize: 12, marginBottom: 6 },
  payload: { fontFamily: 'monospace', color: '#334155' },
  message: { padding: 24, color: '#64748B' },
});
