import React, { useState } from 'react';
import { Alert, Linking, Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RootStackParamList } from '../navigation/routes';

export default function PaymentGateScreen({ navigation }: any) {
  const route = useRoute<RouteProp<RootStackParamList, 'PaymentGate'>>();
  const { user, token, setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);

  if (!user) {
    navigation.replace('Landing');
    return null;
  }

  const params = route.params || {};
  const amount = typeof params.amount === 'number' ? params.amount : 0;
  const defaultPurpose = user.role === 'ORGANIZER'
    ? user.status === 'PENDING_PAYMENT'
      ? 'ORGANIZER_REGISTRATION'
      : 'ORGANIZER_MONTHLY_SUBSCRIPTION'
    : 'FAMILY_ACTIVATION';
  const purpose = params.purpose || defaultPurpose;
  const title = params.title || (purpose === 'INVOICE'
    ? 'Pay Organizer Invoice'
    : purpose === 'ORGANIZER_REGISTRATION'
      ? 'Organizer Registration'
      : purpose === 'ORGANIZER_MONTHLY_SUBSCRIPTION'
        ? 'Renew Organizer Subscription'
        : 'Account Activation');
  const subtitle = params.subtitle || (purpose === 'INVOICE'
    ? 'Complete the request payment to unlock session creation.'
    : purpose === 'ORGANIZER_REGISTRATION'
      ? 'Complete your organizer registration payment to activate your account.'
      : purpose === 'ORGANIZER_MONTHLY_SUBSCRIPTION'
        ? 'Renew your monthly organizer subscription to keep your account active.'
        : 'Payment verification is required to access your account.');
  const payButtonTitle = amount > 0 ? `Pay ₵ ${amount.toFixed(2)}` : 'Pay Securely';

  async function pay() {
    try {
      setLoading(true);
      const body: any = {
        purpose,
        provider: 'PAYSTACK',
      };

      if (amount && amount > 0) {
        body.amount = amount;
      }
      if (params.requestId) {
        body.requestId = params.requestId;
      }

      const { data } = await api.post('/payments/initialize', body);

      setPaymentReference(data.reference || null);
      setAuthorizationUrl(data.authorizationUrl || null);
      if (data.authorizationUrl) {
        Linking.openURL(data.authorizationUrl).catch(() => {
          Alert.alert('Open link failed', 'Please open the authorization URL manually.');
        });
      }
      Alert.alert('Payment initialized', 'A Paystack window has been opened. Return to the app to verify payment.');
    } catch (e: any) {
      Alert.alert('Payment error', e.message || 'Try again');
    } finally {
      setLoading(false);
    }
  }

  async function verifyPayment() {
    if (!paymentReference) {
      Alert.alert('Missing reference', 'Start the payment flow first.');
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post('/payments/verify', { reference: paymentReference });
      if (data.paid) {
        const successMessage = purpose === 'INVOICE'
          ? 'Payment confirmed. The request is now marked as paid.'
          : 'Payment confirmed. Your account is now active.';

        if (purpose !== 'INVOICE') {
          try {
            const { data: refreshedUser } = await api.get('/auth/me');
            await setSession(paymentReference ? token || '' : '', refreshedUser);
          } catch (e) {
            // ignore refresh failure; user can restart app or login again
          }
        }

        Alert.alert('Payment confirmed', successMessage, [
          {
            text: purpose === 'INVOICE' ? 'My Sessions' : 'Dashboard',
            onPress: () => navigation.replace(purpose === 'INVOICE' ? 'Sessions' : 'Dashboard'),
          },
        ]);
      } else {
        Alert.alert('Payment pending', 'Payment is not complete yet. Try again later.');
      }
    } catch (e: any) {
      Alert.alert('Verification error', e.message || 'Try again');
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
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💳</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Card variant="elevated" style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{subtitle}</Text>
        <View style={styles.paymentActions}>
          <Button title={payButtonTitle} loading={loading} onPress={pay} size="lg" style={styles.flexButton} />
          <Button title="Verify Payment" variant="secondary" onPress={verifyPayment} disabled={!paymentReference} loading={loading && !!paymentReference} style={styles.flexButton} />
          <Button title="Need Help" variant="ghost" onPress={() => Alert.alert('Support', 'Contact support@example.com')} style={styles.flexButton} />
        </View>
        {authorizationUrl ? (
          <View style={styles.returnInstructions}>
            <Text style={styles.infoText}>If the browser did not open, use the link below:</Text>
            <Text style={styles.linkText} onPress={() => Linking.openURL(authorizationUrl)}>{authorizationUrl}</Text>
          </View>
        ) : null}
      </Card>
      <View style={styles.info}>
        <Text style={styles.infoIcon}>🔒</Text>
        <View>
          <Text style={styles.infoTitle}>Payment Methods</Text>
          <Text style={styles.infoText}>Paystack • Mobile Money • Card Payments</Text>
        </View>
      </View>
    </Screen>
  );
}

const { colors, radius, shadows, spacing, typography } = require('../theme/colors');

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.xl },
  headerIcon: { fontSize: 48, marginBottom: spacing.md },
  title: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.black, color: colors.text.primary, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.sizes.base, color: colors.text.secondary },
  card: { marginBottom: spacing.xl },
  cardTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary, marginBottom: spacing.md },
  cardBody: { fontSize: typography.sizes.base, color: colors.text.secondary, lineHeight: 24, marginBottom: spacing.lg },
  paymentActions: { gap: spacing.md },
  flexButton: { width: '100%' },
  info: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, backgroundColor: colors.success + '12', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.success + '30' },
  infoIcon: { fontSize: 24 },
  infoTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text.primary },
  infoText: { fontSize: typography.sizes.xs, color: colors.text.secondary, marginTop: spacing.xs },
  returnInstructions: { marginTop: spacing.md },
  linkText: { color: colors.primary.light, textDecorationLine: 'underline' },
});
