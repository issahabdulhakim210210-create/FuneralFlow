import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../services/api';

const serviceCategoryOrder = [
  'Caterers',
  'Coffin Makers',
  'Mortuary Services',
  'Mortuary Storage',
  'Photographers',
  'Florists',
  'Personnel',
  'Security',
  'Ushers',
  'Pastors',
  'MCs',
  'Transportation',
  'Decoration',
  'Venue',
  'Sound Systems',
  'Logistics',
  'Custom Service',
];

type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_name?: string;
  images?: string[];
};

type SelectServiceScreenProps = {
  navigation: any;
  route: {
    params?: {
      organizerIdentifier?: string;
      selectedServiceIds?: string[];
    };
  };
};

export default function SelectServiceScreen({ navigation, route }: SelectServiceScreenProps) {
  const [organizerIdentifier, setOrganizerIdentifier] = useState(route.params?.organizerIdentifier || '');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>(route.params?.selectedServiceIds || []);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceError, setServiceError] = useState('');

  const groupedServices = useMemo(() => {
    const groups = new Map<string, ServiceItem[]>();
    services.forEach((service) => {
      const category = service.category_name || 'Custom Service';
      const list = groups.get(category) || [];
      list.push(service);
      groups.set(category, list);
    });

    const ordered = serviceCategoryOrder.reduce<ServiceItem[]>((result, category) => {
      const items = groups.get(category);
      if (items) {
        result.push(...items);
        groups.delete(category);
      }
      return result;
    }, []);

    Array.from(groups.keys())
      .sort()
      .forEach((category) => {
        ordered.push(...(groups.get(category) || []));
      });

    return ordered.reduce((acc, service) => {
      const category = service.category_name || 'Custom Service';
      if (!acc[category]) acc[category] = [];
      acc[category].push(service);
      return acc;
    }, {} as Record<string, ServiceItem[]>);
  }, [services]);

  useEffect(() => {
    if (organizerIdentifier.trim()) {
      loadServices(organizerIdentifier.trim());
    }
  }, [organizerIdentifier]);

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
      setServiceError(error?.message || 'Unable to load organizer services.');
    } finally {
      setLoadingServices(false);
    }
  }

  function toggleService(service: ServiceItem) {
    setSelectedServices((current) => {
      const category = service.category_name || 'Custom Service';
      const isSelected = current.includes(service.id);
      const filtered = current.filter((itemId) => {
        const existing = services.find((serviceItem) => serviceItem.id === itemId);
        return (existing?.category_name || 'Custom Service') !== category;
      });

      if (isSelected) {
        return current.filter((itemId) => itemId !== service.id);
      }

      return [...filtered, service.id];
    });
  }

  function goBackWithSelection() {
    navigation.navigate('CreateRequest', {
      organizerIdentifier,
      selectedServiceIds: selectedServices,
    });
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
          <Text style={styles.title}>Select Services</Text>
          <Text style={styles.subtitle}>Choose one service per category and continue to complete the request.</Text>
        </View>

        <Card variant="elevated" style={[styles.card, styles.shadow]}>
          <Text style={styles.sectionTitle}>Organizer Identifier</Text>
          <Input
            label="Organizer Identifier"
            placeholder="Example: ORG-12345678"
            value={organizerIdentifier}
            onChangeText={setOrganizerIdentifier}
            autoCapitalize="characters"
          />
          <Text style={styles.helperText}>Enter the organizer ID and wait for services to load.</Text>
        </Card>

        <Card variant="elevated" style={[styles.card, styles.shadow, styles.selectionCard]}>
          <View style={styles.serviceHeader}>
            <Text style={styles.sectionTitle}>Choose Services</Text>
            <Text style={styles.selectedCount}>{selectedServices.length} selected</Text>
          </View>

          {loadingServices ? (
            <Text style={styles.statusText}>Loading organizer services...</Text>
          ) : serviceError ? (
            <Text style={styles.errorText}>{serviceError}</Text>
          ) : Object.keys(groupedServices).length === 0 ? (
            <Text style={styles.statusText}>Enter the organizer identifier to load available services.</Text>
          ) : (
            <ScrollView style={styles.serviceList} contentContainerStyle={styles.serviceListContent}>
              {Object.entries(groupedServices).map(([category, items]) => (
                <View key={category} style={styles.categoryBlock}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <View style={styles.serviceGrid}>
                    {items.map((service) => {
                      const selected = selectedServices.includes(service.id);
                      return (
                        <SafePressable
                          key={service.id}
                          onPress={() => toggleService(service)}
                          style={({ pressed }: any) => [
                            styles.serviceChip,
                            selected && styles.serviceChipSelected,
                            pressed && styles.serviceChipPressed,
                          ]}
                        >
                          <View style={styles.serviceChipContent}>
                            {Array.isArray(service.images) && service.images.length > 0 ? (
                              <Image source={{ uri: service.images[0] }} style={styles.serviceChipImage} />
                            ) : (
                              <View style={styles.serviceChipPlaceholder}>
                                <Text style={styles.serviceChipInitial}>{service.name?.charAt(0) ?? 'S'}</Text>
                              </View>
                            )}
                            <View style={styles.serviceChipTextContainer}>
                              <Text style={[styles.serviceText, selected && styles.serviceTextSelected]} numberOfLines={2}>{service.name}</Text>
                              <Text style={[styles.serviceMeta, selected && styles.serviceTextSelected]} numberOfLines={1}>{formatPriceLabel(service.category_name, service.price)}</Text>
                            </View>
                          </View>
                        </SafePressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </Card>

        <View style={styles.actionArea}>
          <Button title="Continue to Request" onPress={goBackWithSelection} loading={loading} />
        </View>
      </View>
    </Screen>
  );
}

 function formatPriceLabel(category?: string, price?: number) {
  const p = `₵ ${Number(price || 0).toFixed(2)}`;
   const cat = (category || 'Custom Service').toLowerCase();
   if (cat.includes('cater')) return `${p} per head`;
   if (cat.includes('coffin')) return `${p} (price of coffin)`;
   if (cat.includes('photograph')) return `${p} per event`;
   if (cat.includes('flor')) return `${p} package`;
   if (cat === 'personnel' || cat.includes('security') || cat.includes('usher')) return `${p} per person`;
   if (cat.includes('mortuary') || cat.includes('storage')) return `${p} per day`;
   if (cat === 'pastors' || cat === 'pastor') return `${p} per event`;
   if (cat === 'mcs' || cat.includes('mc')) return `${p} per event`;
   if (cat.includes('transport')) return `${p} per day`;
   if (cat.includes('decor')) return `${p} package`;
   if (cat.includes('venue')) return `${p} per event`;
   if (cat.includes('sound')) return `${p} per event`;
   if (cat.includes('logistics')) return `${p} per item`;
   return p;
 }
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
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
  selectionCard: {
    flex: 1,
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
  serviceList: {
    flex: 1,
  },
  serviceListContent: {
    paddingBottom: 24,
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
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  serviceChip: {
    margin: 6,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    flexBasis: '48%',
    minWidth: 180,
  },
  serviceChipSelected: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  serviceChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceChipImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
  },
  serviceChipPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceChipInitial: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 18,
  },
  serviceChipTextContainer: {
    flex: 1,
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
  serviceTextSelected: {
    color: '#FFFFFF',
  },
  serviceMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
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
});
