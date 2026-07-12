import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function PaymentCompleteScreen({ route, navigation }: any) {
  const { reference, paid } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking payment status...');

  useEffect(() => {
    if (!user) {
      navigation.replace('Landing');
      return;
    }
    if (reference) {
      verifyPayment(reference as string);
    } else {
      setStatusMessage('No payment reference found in the link.');
    }
  }, [reference]);

  async function verifyPayment(ref: string) {
    try {
      setLoading(true);
      const { data } = await api.post('/payments/verify', { reference: ref });
      if (data.paid) {
        setStatusMessage('Payment confirmed. Your account is active.');
      } else {
        setStatusMessage('Payment is still pending. Please try again after completing the payment.');
      }
    } catch (error: any) {
      setStatusMessage(error?.message || 'Could not verify payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <View style={styles.container}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>Payment Confirmation</Text>
        <Text style={styles.subtitle}>{statusMessage}</Text>
        <View style={styles.actions}>
          <Button title="Back to Dashboard" onPress={() => navigation.replace('Dashboard')} />
          <Button
            title="Open Paystack Link"
            variant="secondary"
            onPress={() => {
              const deepLink = `https://dashboard.paystack.com/pay/${reference}`;
              Linking.openURL(deepLink).catch(() => {
                Alert.alert('Open link failed', 'Unable to open Paystack page.');
              });
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
});
