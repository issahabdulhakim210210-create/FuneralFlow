import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

type OrganizerProfile = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  organizer_identifier?: string;
  subscription_status?: string;
  account_status?: string;
  payment_phone?: string;
};

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
    </View>
  );
}

export default function OrganizerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProfile() {
    try {
      setLoading(true);

      const { data } = await api.get('/organizer/profile');

      setProfile(data);
    } catch (error: any) {
      Alert.alert(
        'Could not load organizer profile',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();

          navigation.reset({
            index: 0,
            routes: [{ name: 'Landing' }],
          });
        },
      },
    ]);
  }

  const [paymentPhone, setPaymentPhone] = useState(profile?.payment_phone || '');
  const [saving, setSaving] = useState(false);

  const displayName = profile?.full_name || user?.fullName || 'Organizer';
  const displayEmail = profile?.email || user?.email;
  const displayPhone = profile?.phone || user?.phone;
  const identifier =
    profile?.organizer_identifier || user?.organizerIdentifier || 'Not available';

  useEffect(() => {
    setPaymentPhone(profile?.payment_phone || '');
  }, [profile?.payment_phone]);

  async function savePaymentPhone() {
    try {
      setSaving(true);
      await api.patch('/organizer/profile', { paymentPhone: paymentPhone.trim() || null });
      Alert.alert('Saved', 'Your organizer payment number has been updated.');
      loadProfile();
    } catch (error: any) {
      Alert.alert('Could not save', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
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
        <View style={styles.heroCard}>
          <Text style={styles.heading}>Organizer Profile</Text>
          <Text style={styles.subheading}>
            View your organizer details and share your unique identifier with family members.
          </Text>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.role}>Funeral Organizer</Text>
          </View>

          <View style={styles.infoSection}>
            <InfoRow label="Full Name" value={displayName} />
            <InfoRow label="Email" value={displayEmail} />
            <InfoRow label="Phone" value={displayPhone} />
            <InfoRow label="Account Status" value={profile?.account_status || user?.status} />
            <InfoRow label="Subscription" value={profile?.subscription_status} />
          </View>
          <View style={styles.paymentPhoneSection}>
            <Text style={styles.paymentPhoneLabel}>Payment Phone</Text>
            <Text style={styles.paymentPhoneHint}>
              This number will be used for invoice payments by your family members.
            </Text>
            <TextInput
              style={styles.paymentPhoneInput}
              value={paymentPhone}
              onChangeText={setPaymentPhone}
              placeholder="+233XXXXXXXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <View style={styles.saveButtonRow}>
              <Button
                title="Save Payment Number"
                loading={saving}
                onPress={savePaymentPhone}
              />
            </View>
          </View>
        </Card>

        <Card style={styles.identifierCard}>
          <Text style={styles.cardTitle}>Your Unique Organizer Identifier</Text>
          <Text style={styles.cardSubtext}>
            Family members use this code to connect with you and submit funeral planning requests.
          </Text>

          <View style={styles.identifierBox}>
            <Text style={styles.identifierLabel}>ORGANIZER ID</Text>
            <Text style={styles.identifierValue}>{identifier}</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Button
              title="Refresh Profile"
              variant="secondary"
              loading={loading}
              onPress={loadProfile}
            />
          </View>
        </Card>

        <View style={styles.actionButtons}>
          <Button
            title="Back to Dashboard"
            variant="ghost"
            onPress={() => navigation.navigate('Dashboard')}
          />
          <Button
            title="Logout"
            variant="danger"
            onPress={handleLogout}
          />
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
  heroCard: {
    backgroundColor: '#4338CA',
    borderRadius: 24,
    padding: 28,
    marginBottom: 28,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    lineHeight: 36,
  },
  subheading: {
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 22,
  },
  profileCard: {
    marginBottom: 20,
    borderRadius: 24,
    padding: 28,
    backgroundColor: '#FFFFFF',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#3730A3',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  role: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  infoSection: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paymentPhoneSection: {
    marginTop: 20,
  },
  paymentPhoneLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  paymentPhoneHint: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 20,
  },
  paymentPhoneInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  saveButtonRow: {
    alignItems: 'flex-start',
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
  identifierCard: {
    marginBottom: 28,
    borderRadius: 24,
    padding: 28,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  cardSubtext: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  identifierBox: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  identifierLabel: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  identifierValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  buttonGroup: {
    gap: 0,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 8,
  },
});