import React from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import SafePressable from '../components/SafePressable';
import { RootStackParamList } from '../navigation/routes';
import { useAuth } from '../context/AuthContext';

export default function OrganizerAssistProfileScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'OrganizerAssistProfile'>) {
  const { logout } = useAuth();
  const { id, collectorName, collectorIdentifier } = route.params;
  const hasSessionId = Boolean(id && String(id).trim());

  return (
    <Screen>
      <View style={styles.topBar}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </SafePressable>
      </View>

      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.heading}>Collector profile</Text>
          <Text style={styles.subheading}>
            Confirm your details before recording donations for this session.
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{collectorName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Organizer ID</Text>
            <Text style={styles.value}>{collectorIdentifier}</Text>
          </View>
          {hasSessionId && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Session code</Text>
              <Text style={styles.value}>{id}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Button
              title="Continue to donations"
              onPress={() => {
                if (!hasSessionId) {
                  Alert.alert('Session code required', 'Please enter a session code before continuing to donations.');
                  return;
                }
                navigation.navigate('SessionDetail', { id: id!.trim(), collectorName, collectorIdentifier });
              }}
              disabled={!hasSessionId}
            />
            <Button
              title="Logout"
              variant="secondary"
              onPress={async () => {
                await logout();
                navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
              }}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
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
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
  },
  buttonRow: {
    marginTop: 24,
    gap: 12,
  },
});
