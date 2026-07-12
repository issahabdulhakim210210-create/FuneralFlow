import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';

export default function DonationsScreen({ route, navigation }: any) {
  const initialSessionId = route?.params?.id || '';
  const hasSessionIdParam = Boolean(initialSessionId);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    }
  }, [initialSessionId]);

  async function loadSession(idOverride?: string) {
    const effectiveSessionId = idOverride?.trim() || sessionId.trim();
    if (!effectiveSessionId) {
      return Alert.alert('Session required', 'Enter a session ID to load this session.');
    }

    try {
      setLoading(true);
      const { data } = await api.get(`/sessions/${effectiveSessionId}`);
      setSessionId(effectiveSessionId);
      setSession(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load session');
    } finally {
      setLoading(false);
    }
  }

  const sessionLoaded = Boolean(session?.id);
  const sessionCompleted = session?.status === 'COMPLETED';

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadSession()} />} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Donations</Text>
          <Text style={styles.subtitle}>Choose whether to record a donation or review donation history.</Text>
        </View>

        <Card style={styles.sessionCard}>
          <Text style={styles.sectionTitle}>Session</Text>
          {hasSessionIdParam && !session ? (
            <Text style={styles.sessionMetaText}>Loading session from current context...</Text>
          ) : null}
          {!hasSessionIdParam && (
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
          {sessionLoaded ? (
            <View style={styles.sessionMeta}>
              <Text style={styles.sessionMetaText}>Deceased: {session.deceased_full_name}</Text>
              <Text style={styles.sessionMetaText}>Status: {session.status}</Text>
              <Text style={styles.sessionMetaText}>Session code: {session.session_code}</Text>
            </View>
          ) : (
            <Text style={styles.sessionMetaText}>{hasSessionIdParam ? 'Loading session from current context...' : 'Enter a session ID to open donation actions.'}</Text>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Donation Actions</Text>
          <Text style={styles.sectionSubtitle}>Use one of the screens below to separate donation entry from donation history.</Text>
          {!sessionCompleted && (
            <Button
              title="Record Donation"
              onPress={() => navigation.navigate('DonationRecord', { id: sessionId })}
              disabled={!sessionLoaded}
              style={styles.actionButton}
            />
          )}
          <Button
            title="Donation History"
            onPress={() => navigation.navigate('DonationHistory', { id: sessionId })}
            disabled={!sessionLoaded}
            variant="secondary"
            style={styles.actionButton}
          />
          {sessionCompleted && (
            <Text style={[styles.sectionSubtitle, { color: '#6b7280', marginTop: 12 }]}>This session is completed. Donation recording is disabled.</Text>
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
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
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
  actionButton: {
    marginTop: spacing.sm,
  },
});
