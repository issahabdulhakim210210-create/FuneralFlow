import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/routes';
import { addTenPercentMarkup } from '../utils/pricing';

const serviceCategoryOrder = [
  'Caterers',
  'Coffin Makers',
  'Mortuary Services',
  'Photographers',
  'Florists',
  'Pastors',
  'MCs',
  'Transportation',
  'Decoration',
  'Venue',
  'Sound Systems',
  'Printing & Design',
  'Logistics',
  'Custom Service',
];

type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  rating?: number;
  review_count?: number;
  category_name?: string;
  images?: string[];
  created_at?: string;
};

export default function CreateRequestScreen({ navigation }: any) {
  const [organizerIdentifier, setOrganizerIdentifier] = useState('');
  const [deceasedFullName, setDeceasedFullName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [funeralDate, setFuneralDate] = useState('');
  const [familyGuests, setFamilyGuests] = useState('');
  const [churchGuests, setChurchGuests] = useState('');
  const [workGuests, setWorkGuests] = useState('');
  const [friendGuests, setFriendGuests] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [mortuaryServices, setMortuaryServices] = useState('');
  const [transportationDays, setTransportationDays] = useState('');
  const [securityCount, setSecurityCount] = useState('');
  const [usherCount, setUsherCount] = useState('');
  const [logisticsChairs, setLogisticsChairs] = useState('');
  const [logisticsTables, setLogisticsTables] = useState('');
  const [logisticsSouvenirs, setLogisticsSouvenirs] = useState('');

  const route = useRoute<RouteProp<RootStackParamList, 'CreateRequest'>>();

  const { user } = useAuth();
  const isWalkIn = user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN';
  const selectedCount = selectedServices.length;

  const parseGuestCount = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    return cleaned ? Math.max(0, Number(cleaned)) : 0;
  };

  const parseNumber = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    return cleaned ? Math.max(0, Number(cleaned)) : 0;
  };

  const confirmedAttendees = useMemo(
    () =>
      parseGuestCount(familyGuests) +
      parseGuestCount(churchGuests) +
      parseGuestCount(workGuests) +
      parseGuestCount(friendGuests),
    [familyGuests, churchGuests, workGuests, friendGuests]
  );

  const projectedAttendance = useMemo(
    () => (confirmedAttendees > 0 ? Math.ceil(confirmedAttendees * 1.1) : 0),
    [confirmedAttendees]
  );

  const attendeeRecommendations = useMemo(() => {
    const rec = new Set<string>();
    if (confirmedAttendees > 0) {
      rec.add('Catering (per head)');
      rec.add('Mortuary services (per day)');
      rec.add('Transportation (per day)');
      rec.add('MCs and photographers (per event)');
      rec.add('Decoration and florists (package)');
    }
    if (confirmedAttendees >= 10) {
      rec.add('Security and Ushers (per person)');
    }
    if (confirmedAttendees >= 20) {
      rec.add('Logistics: chairs, tables, souvenirs (per item)');
    }
    return Array.from(rec);
  }, [confirmedAttendees]);

  const calculateTotalPrice = useMemo(() => {
    let total = 0;
    const selectedServiceItems = services.filter((service) =>
      selectedServices.includes(service.id)
    );

    selectedServiceItems.forEach((service) => {
      const cat = (service.category_name || 'Custom Service').toLowerCase();
      const price = Number(service.price || 0);

      if (cat.includes('cater')) {
        total += price * confirmedAttendees;
      } else if (cat.includes('coffin')) {
        total += price;
      } else if (cat.includes('photograph')) {
        total += price;
      } else if (cat.includes('flor')) {
        total += price;
      } else if (cat === 'personnel' || cat.includes('security') || cat.includes('usher')) {
        let personnelTotal = 0;
        if (cat.includes('security')) {
          personnelTotal = parseNumber(securityCount);
        } else if (cat.includes('usher')) {
          personnelTotal = parseNumber(usherCount);
        } else {
          personnelTotal = parseNumber(securityCount) + parseNumber(usherCount);
        }
        total += price * personnelTotal;
      } else if (cat.includes('mortuary') || cat.includes('storage')) {
        total += price * parseNumber(mortuaryServices);
      } else if (cat === 'pastors' || cat === 'pastor') {
        total += price;
      } else if (cat === 'mcs' || cat.includes('mc')) {
        total += price;
      } else if (cat.includes('transport')) {
        total += price * parseNumber(transportationDays);
      } else if (cat.includes('decor')) {
        total += price;
      } else if (cat.includes('venue')) {
        total += price;
      } else if (cat.includes('sound')) {
        total += price;
      } else if (cat.includes('logistics')) {
        const chairCount = parseNumber(logisticsChairs);
        const tableCount = parseNumber(logisticsTables);
        const souvenirCount = parseNumber(logisticsSouvenirs);
        total += price * (chairCount + tableCount + souvenirCount);
      } else {
        total += price;
      }
    });

    return addTenPercentMarkup(total);
  }, [services, selectedServices, confirmedAttendees, mortuaryServices, transportationDays, securityCount, usherCount, logisticsChairs, logisticsTables, logisticsSouvenirs]);

  // Update budget to match the marked-up total whenever it changes
  useEffect(() => {
    try {
      const formatted = Number(calculateTotalPrice).toFixed(2);
      setBudget(formatted);
    } catch (e) {
      // ignore formatting errors
    }
  }, [calculateTotalPrice]);

  const canSubmit = useMemo(() => {
    const baseValid =
      organizerIdentifier.trim().length > 0 &&
      deceasedFullName.trim().length > 0 &&
      funeralDate.trim().length > 0 &&
      selectedServices.length > 0;

    if (!isWalkIn) {
      return baseValid;
    }

    return baseValid && contactName.trim().length > 0 && contactPhone.trim().length > 0;
  }, [organizerIdentifier, deceasedFullName, funeralDate, selectedServices, isWalkIn, contactName, contactPhone]);

  const params = route.params;
  const organizerIdRef = useRef('');

  useEffect(() => {
    if (params?.organizerIdentifier) {
      setOrganizerIdentifier(params.organizerIdentifier);
    }
    if (Array.isArray(params?.selectedServiceIds)) {
      setSelectedServices(params.selectedServiceIds);
    }
  }, [params?.organizerIdentifier, params?.selectedServiceIds]);

  useEffect(() => {
    const trimmedId = organizerIdentifier.trim();
    if (organizerIdRef.current && organizerIdRef.current !== trimmedId) {
      setSelectedServices([]);
    }
    organizerIdRef.current = trimmedId;
  }, [organizerIdentifier]);

  useEffect(() => {
    const trimmedId = organizerIdentifier.trim();
    if (!trimmedId) {
      setServices([]);
      setServiceError('');
      return;
    }

    const timeout = setTimeout(() => {
      loadServices(trimmedId);
    }, 500);

    return () => clearTimeout(timeout);
  }, [organizerIdentifier]);

  // Auto-update logistics from total confirmed attendees
  // Chairs = attendees, Tables = ceil(attendees / 4), Souvenirs = ceil(attendees / 2)
  // These fields update whenever attendee inputs change; security and ushers remain manual
  useEffect(() => {
    const attendees = confirmedAttendees;
    if (!attendees || attendees <= 0) {
      setLogisticsChairs('');
      setLogisticsTables('');
      setLogisticsSouvenirs('');
      return;
    }

    setLogisticsChairs(String(attendees));
    setLogisticsTables(String(Math.ceil(attendees / 4)));
    setLogisticsSouvenirs(String(Math.ceil(attendees / 2)));
  }, [confirmedAttendees]);

  function handleSelectServices() {
    navigation.navigate('SelectService', {
      organizerIdentifier,
      selectedServiceIds: selectedServices,
    });
  }

  async function loadServices(identifier: string) {
    try {
      setLoadingServices(true);
      setServiceError('');
      const { data } = await api.get('/services', {
        params: { organizerIdentifier: identifier },
      });
      const list = Array.isArray(data) ? data : [];
      setServices(list);
      if (list.length === 0) {
        setServiceError('No services found for this organizer identifier.');
      }
    } catch (error: any) {
      setServices([]);
      setSelectedServices([]);
      setServiceError(error?.message || 'Unable to load organizer services.');
    } finally {
      setLoadingServices(false);
    }
  }

  async function submitRequest() {
    if (!canSubmit) {
      Alert.alert(
        'Missing information',
        isWalkIn
          ? 'Please enter the organizer identifier, deceased full name, the walk-in contact name and phone, and select at least one service.'
          : 'Please enter the organizer identifier, deceased full name, and select at least one service.'
      );
      return;
    }

    const selectedServiceItems = services.filter((service) =>
      selectedServices.includes(service.id)
    );

    try {
      setLoading(true);
      await api.post('/requests', {
        organizerIdentifier: organizerIdentifier.trim(),
        deceasedFullName: deceasedFullName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        funeralDate: funeralDate.trim(),
        budget: budget ? Number(budget) : 0,
        guestBreakdown: {
          family: parseGuestCount(familyGuests),
          church: parseGuestCount(churchGuests),
          work: parseGuestCount(workGuests),
          friends: parseGuestCount(friendGuests),
        },
        projectedAttendance,
        servicePricingDetails: {
          mortuaryServices: parseNumber(mortuaryServices),
          transportationDays: parseNumber(transportationDays),
          securityCount: parseNumber(securityCount),
          usherCount: parseNumber(usherCount),
          logisticsChairs: parseNumber(logisticsChairs),
          logisticsTables: parseNumber(logisticsTables),
          logisticsSouvenirs: parseNumber(logisticsSouvenirs),
        },
        calculatedTotal: calculateTotalPrice,
        selectedServices: selectedServiceItems.map((service) => ({
          id: service.id,
          name: service.name,
          category: service.category_name || 'Custom Service',
          note: notes,
        })),
      });

      Alert.alert(
        'Request sent',
        'Your funeral planning request has been sent to the organizer.',
        [
          {
            text: 'View Sessions',
            onPress: () => navigation.navigate('Sessions'),
          },
          {
            text: 'Dashboard',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Could not send request',
        error?.message || 'Please check the organizer identifier and try again.'
      );
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
        <View style={styles.header}>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>Request</Text>
          </View>
          <Text style={styles.title}>Create Funeral Request</Text>
          <Text style={styles.subtitle}>
            {isWalkIn
              ? 'Record a walk-in funeral request for a family member and send it to the organizer.'
              : 'Enter your organizer identifier, choose the services you need, and send your request.'}
          </Text>
        </View>

        <Card variant="elevated" style={[styles.card, styles.shadow]}>
          <Text style={styles.sectionTitle}>Organizer Details</Text>
          <Input
            label="Organizer Identifier"
            placeholder="Example: ORG-12345678"
            value={organizerIdentifier}
            onChangeText={setOrganizerIdentifier}
            autoCapitalize="characters"
          />
          <Text style={styles.helperText}>
            Ask your organizer for their unique identifier so the request goes
            to the right team.
          </Text>
        </Card>

        <Card variant="elevated" style={[styles.card, styles.shadow]}>
          <Text style={styles.sectionTitle}>Funeral Information</Text>
          {isWalkIn ? (
            <>
              <Input
                label="Walk-in Contact Name"
                placeholder="Name of the person giving the request"
                value={contactName}
                onChangeText={setContactName}
              />
              <Input
                label="Walk-in Contact Phone"
                placeholder="Example: +233501234567"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </>
          ) : null}
          <Input
            label="Deceased Full Name"
            placeholder="Enter deceased person's full name"
            value={deceasedFullName}
            onChangeText={setDeceasedFullName}
          />
          <Input
            label="Estimated Budget"
            placeholder="Example: 5000"
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
          />
          <Input
            label="Funeral Date"
            placeholder="YYYY-MM-DD"
            value={funeralDate}
            onChangeText={setFuneralDate}
          />
          <Input
            label="Notes / Special Requests"
            placeholder="Any special request or family preference"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Card>

        <Card variant="elevated" style={[styles.card, styles.shadow]}>
          <Text style={styles.sectionTitle}>Guest Breakdown</Text>
          <Input
            label="Family Guests"
            placeholder="Number of family members attending"
            value={familyGuests}
            onChangeText={setFamilyGuests}
            keyboardType="numeric"
          />
          <Input
            label="Church Guests"
            placeholder="Number of church or community guests"
            value={churchGuests}
            onChangeText={setChurchGuests}
            keyboardType="numeric"
          />
          <Input
            label="Work / Colleague Guests"
            placeholder="Number of work-related guests"
            value={workGuests}
            onChangeText={setWorkGuests}
            keyboardType="numeric"
          />
          <Input
            label="Friends Guests"
            placeholder="Number of friends attending"
            value={friendGuests}
            onChangeText={setFriendGuests}
            keyboardType="numeric"
          />

          <Text style={styles.helperText}>
            Confirmed attendees: {confirmedAttendees}. Projected attendance (10% buffer): {projectedAttendance}.
          </Text>
          {attendeeRecommendations.length > 0 && (
            <View style={styles.recommendationsBox}>
              <Text style={styles.sectionSubtitle}>Recommended service categories</Text>
              {attendeeRecommendations.map((recommendation) => (
                <Text key={recommendation} style={styles.recommendationItem}>
                  • {recommendation}
                </Text>
              ))}
            </View>
          )}
        </Card>

        <Card variant="elevated" style={[styles.card, styles.shadow]}>
          <Text style={styles.sectionTitle}>Service Pricing Details</Text>
          <Input
            label="Mortuary Services"
            placeholder="Number of days"
            value={mortuaryServices}
            onChangeText={setMortuaryServices}
            keyboardType="numeric"
          />
          <Input
            label="Transportation Days"
            placeholder="Number of days"
            value={transportationDays}
            onChangeText={setTransportationDays}
            keyboardType="numeric"
          />
          <Text style={styles.sectionSubtitle}>Personnel Breakdown</Text>
          <Input
            label="Security"
            placeholder="Number of security personnel"
            value={securityCount}
            onChangeText={setSecurityCount}
            keyboardType="numeric"
          />
          <Input
            label="Ushers"
            placeholder="Number of ushers"
            value={usherCount}
            onChangeText={setUsherCount}
            keyboardType="numeric"
          />
          <Text style={styles.sectionSubtitle}>Logistics Breakdown</Text>
          <Input
            label="Chairs"
            placeholder="Number of chairs"
            value={logisticsChairs}
            onChangeText={setLogisticsChairs}
            keyboardType="numeric"
          />
          <Input
            label="Tables"
            placeholder="Number of tables"
            value={logisticsTables}
            onChangeText={setLogisticsTables}
            keyboardType="numeric"
          />
          <Input
            label="Souvenirs"
            placeholder="Number of souvenirs"
            value={logisticsSouvenirs}
            onChangeText={setLogisticsSouvenirs}
            keyboardType="numeric"
          />
        </Card>

        <Card variant="elevated" style={[styles.card, styles.shadow]}>
          <View style={styles.serviceHeader}>
            <Text style={styles.sectionTitle}>Selected Services</Text>
            <Text style={styles.selectedCount}>{selectedCount} selected</Text>
          </View>

          {loadingServices ? (
            <Text style={styles.statusText}>Loading organizer services...</Text>
          ) : serviceError ? (
            <Text style={styles.errorText}>{serviceError}</Text>
          ) : (
            <Text style={styles.helperText}>
              Tap the button below to choose one service per category from the organizer.
            </Text>
          )}

          <Button
            title="Select Services"
            onPress={handleSelectServices}
            size="lg"
            style={styles.primaryButton}
          />

          {selectedServices.length > 0 && (
            <View style={styles.selectedList}>
              {services
                .filter((service) => selectedServices.includes(service.id))
                .map((service) => (
                  <Text key={service.id} style={styles.selectedItemText}>
                    • {service.name} ({service.category_name || 'Custom Service'})
                  </Text>
                ))}
            </View>
          )}
        </Card>
        <Card variant="elevated" style={[styles.card, styles.priceCard]}>
          <Text style={styles.totalLabel}>Estimated Total Cost (incl. 10%)</Text>
          <Text style={styles.totalPrice}>₵ {calculateTotalPrice.toFixed(2)}</Text>
          <Text style={styles.priceHelper}>
            Based on {confirmedAttendees} confirmed attendees and selected services.
          </Text>
        </Card>
        <View style={styles.actionArea}>
          <Button
            title={isWalkIn ? 'Save Walk-in Request' : 'Send Request to Organizer'}
            loading={loading}
            onPress={submitRequest}
            size="lg"
            style={styles.primaryButton}
          />
          {user?.role === 'FAMILY_MEMBER' && (
            <Button
              title="Back to Dashboard"
              onPress={() => navigation.navigate('Dashboard')}
              size="lg"
              style={styles.primaryButton}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: '90%',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  recommendationsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  recommendationItem: {
    color: '#1D4ED8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedCount: {
    color: '#0F766E',
    fontWeight: '700',
    fontSize: 13,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  serviceChip: {
    margin: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  serviceChipSelected: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  serviceChipPressed: {
    opacity: 0.85,
  },
  serviceText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceTextSelected: {
    color: '#FFFFFF',
  },
  categoryList: {
    maxHeight: 320,
  },
  categoryListContent: {
    paddingVertical: 6,
  },
  categoryBlock: {
    marginBottom: 18,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  statusText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  actionArea: {
    marginTop: 14,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 12,
  },
  secondaryButton: {
    borderRadius: 16,
  },
  priceCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: 20,
    padding: 18,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 8,
  },
  totalPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#065F46',
    marginBottom: 8,
  },
  priceHelper: {
    color: '#10B981',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    marginTop: 14,
  },
  selectedList: {
    marginTop: 8,
  },
  selectedItemText: {
    color: '#374151',
    marginBottom: 6,
  },
});
