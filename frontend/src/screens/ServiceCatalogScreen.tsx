import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import SafePressable from '../components/SafePressable';
import BackButton from '../components/BackButton';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../services/api';

type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  rating?: number;
  review_count?: number;
  images?: string[];
  created_at?: string;
  category_name?: string;
  categoryName?: string;
  priceBreakdown?: {
    chairs?: number;
    tables?: number;
    souvenirs?: number;
  };
};

const serviceCategories = [
  'Caterers',
  'Coffin Makers',
  'Mortuary Services',
  'Photographers',
  'Florists',
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

export default function ServiceCatalogScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 520;
  const imageSize = Math.max(64, Math.min(120, Math.floor(width * 0.22)));

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [queryText, setQueryText] = useState('');
  const [sortBy, setSortBy] = useState<'newest'|'price-asc'|'price-desc'>('newest');
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('Custom Service');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [chairsPrice, setChairsPrice] = useState('');
  const [tablesPrice, setTablesPrice] = useState('');
  const [souvenirsPrice, setSouvenirsPrice] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  // alternatives removed per UX request

  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  const isEditing = !!editingService;

  const canSubmit = useMemo(() => {
    if (name.trim().length === 0) return false;
    if (selectedCategory === 'Logistics') {
      const c = Number(chairsPrice) || 0;
      const t = Number(tablesPrice) || 0;
      const s = Number(souvenirsPrice) || 0;
      return c + t + s > 0;
    }
    return Number(price) > 0;
  }, [name, price, selectedCategory, chairsPrice, tablesPrice, souvenirsPrice]);

  const filteredServices = useMemo(() => {
    const q = String(queryText || '').trim().toLowerCase();
    let list = services.slice();
    if (selectedCategory && selectedCategory !== 'Custom Service') {
      list = list.filter((s:any) => ((s.category_name || s.categoryName || '') === selectedCategory));
    }
    if (q) list = list.filter((s:any) => (s.name || '').toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q));
    if (sortBy === 'price-asc') list.sort((a,b) => Number(a.price||0) - Number(b.price||0));
    if (sortBy === 'price-desc') list.sort((a,b) => Number(b.price||0) - Number(a.price||0));
    if (sortBy === 'newest') list.sort((a,b) => new Date(b.created_at||'0').getTime() - new Date(a.created_at||'0').getTime());
    return list;
  }, [services, queryText, selectedCategory, sortBy]);

  async function loadServices() {
    try {
      setLoadingServices(true);
      const { data } = await api.get('/services');
      setServices(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Could not load services', error?.message || 'Please try again.');
    } finally {
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  function resetForm() {
    setEditingService(null);
    setName('');
    setDescription('');
    setPrice('');
    setChairsPrice('');
    setTablesPrice('');
    setSouvenirsPrice('');
    setImageUrls('');
    setSelectedCategory('Custom Service');
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(service: ServiceItem) {
    setEditingService(service);
    setName(service.name || '');
    setDescription(service.description || '');
    setPrice(String(service.price || ''));
    const cat = (service as any).categoryName || (service as any).category_name || 'Custom Service';
    setSelectedCategory(cat);
    const breakdown = (service as any).priceBreakdown || (service as any).price_breakdown || null;
    if (breakdown) {
      setChairsPrice(String(breakdown.chairs || ''));
      setTablesPrice(String(breakdown.tables || ''));
      setSouvenirsPrice(String(breakdown.souvenirs || ''));
    } else {
      setChairsPrice('');
      setTablesPrice('');
      setSouvenirsPrice('');
    }
    setImageUrls(Array.isArray(service.images) ? service.images.join(', ') : '');
    setShowForm(true);
  }

  async function saveService() {
    if (!canSubmit) {
      Alert.alert('Missing information', 'Please enter a service name and a valid price.');
      return;
    }

    try {
      setLoading(true);

      const images = imageUrls
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        categoryName: selectedCategory,
        images,
      };

      if (selectedCategory === 'Logistics') {
        const c = Number(chairsPrice) || 0;
        const t = Number(tablesPrice) || 0;
        const s = Number(souvenirsPrice) || 0;
        payload.price = c + t + s;
        payload.priceBreakdown = { chairs: c, tables: t, souvenirs: s };
      } else {
        payload.price = Number(price);
      }

      if (isEditing && editingService) {
        const { data } = await api.patch(`/services/${editingService.id}`, payload);
        setServices((current) => current.map((s) => (s.id === editingService.id ? data : s)));
        Alert.alert('Service updated', 'The service has been updated successfully.');
      } else {
        const { data } = await api.post('/services', payload);
        setServices((current) => [data, ...current]);
        Alert.alert('Service added', 'The service has been added to your catalog.');
      }

      resetForm();
      setShowForm(false);
    } catch (error: any) {
      Alert.alert(isEditing ? 'Could not update service' : 'Could not add service', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteService(service: ServiceItem) {
    Alert.alert(
      'Delete service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingServiceId(service.id);
              await api.delete(`/services/${service.id}`);
              setServices((current) => current.filter((item) => item.id !== service.id));
              if (editingService?.id === service.id) {
                resetForm();
                setShowForm(false);
              }
              Alert.alert('Service deleted', 'Service has been removed from your catalog.');
            } catch (error: any) {
              Alert.alert('Could not delete service', error?.message || 'Please try again.');
            } finally {
              setDeletingServiceId(null);
            }
          },
        },
      ]
    );
  }

  function cancelForm() {
    resetForm();
    setShowForm(false);
  }

  const getPricingFormatHint = (category: string) => {
    const hints: { [key: string]: string } = {
      'Caterers': 'Price per head (multiplied by confirmed attendees)',
      'Coffin Makers': 'Price per unit (flat fee)',
      'Mortuary Services': 'Price per day (multiplied by days)',
      'Photographers': 'Price per event (flat fee)',
      'Florists': 'Price per package (flat fee)',
      'Pastors': 'Price per event (flat fee)',
      'MCs': 'Price per event (flat fee)',
      'Transportation': 'Price per day (multiplied by days)',
      'Decoration': 'Price per package (flat fee)',
      'Venue': 'Price per event (flat fee)',
      'Sound Systems': 'Price per event (flat fee)',
      'Printing & Design': 'Price per item (flat fee)',
      'Security': 'Price per person (multiplied by security count)',
      'Ushers': 'Price per person (multiplied by ushers count)',
      'Logistics': 'Provide separate prices for chairs, tables, and souvenirs',
      'Custom Service': 'Price per unit (flat fee)',
    };
    return hints[category] || 'Price per unit';
  };

  return (
    <Screen>
      <View style={[styles.pageHeader, isNarrow && styles.pageHeaderColumn]}>
        <View style={styles.pageHeadline}>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={[styles.title, isNarrow && styles.titleNarrow]}>Service Catalog</Text>
          </View>
          <Text style={[styles.subtitle, isNarrow && styles.subtitleNarrow]}>Manage your services, pricing and gallery for families to request.</Text>
          <View style={styles.headerMetaRow}>
            <Text style={styles.subtitleInfo}>{services.length} active service{services.length === 1 ? '' : 's'}</Text>
            <View style={styles.headerActionsLeft}>
              <Input label="Search" placeholder="Search services" value={queryText} onChangeText={setQueryText} style={styles.searchInput} />
              <Button title="New Service" onPress={openCreateForm} style={styles.headerButton} />
            </View>
          </View>
        </View>
      </View>

      {showForm && (
        <Card style={styles.formCard} variant="elevated">
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.sectionTitle}>{isEditing ? 'Edit Service' : 'Add New Service'}</Text>
              <Text style={styles.sectionSubtitle}>{isEditing ? 'Update this service information.' : 'Add a service families can request through your organizer profile.'}</Text>
            </View>

            <SafePressable onPress={cancelForm} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </SafePressable>
          </View>

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.categoryScroll, isNarrow && styles.categoryScrollNarrow]}>
            {serviceCategories.map((category) => {
              const selected = selectedCategory === category;
              return (
                <SafePressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.categoryPill, selected && styles.categoryPillActive]}>
                  <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{category}</Text>
                </SafePressable>
              );
            })}
          </ScrollView>

          <View style={[styles.inputRow, isNarrow && styles.inputRowStack]}>
            <Input label="Service Name" value={name} onChangeText={setName} placeholder="Premium Catering Package" />
            {selectedCategory === 'Logistics' ? (
              <View style={{ flex: 1 }}>
                <Input label="Chairs Price" value={chairsPrice} onChangeText={setChairsPrice} placeholder="e.g. 10" keyboardType="numeric" style={[styles.priceInput, isNarrow && styles.priceInputNarrow]} />
                <Input label="Tables Price" value={tablesPrice} onChangeText={setTablesPrice} placeholder="e.g. 20" keyboardType="numeric" style={[{ marginTop: 8 }, isNarrow && styles.priceInputNarrow]} />
                <Input label="Souvenirs Price" value={souvenirsPrice} onChangeText={setSouvenirsPrice} placeholder="e.g. 5" keyboardType="numeric" style={[{ marginTop: 8 }, isNarrow && styles.priceInputNarrow]} />
              </View>
            ) : (
              <Input label="Price" value={price} onChangeText={setPrice} placeholder="2500" keyboardType="numeric" style={[styles.priceInput, isNarrow && styles.priceInputNarrow]} />
            )}
          </View>

          <Text style={styles.pricingHint}>{getPricingFormatHint(selectedCategory)}</Text>

          <Input label="Description" value={description} onChangeText={setDescription} placeholder="Describe this service" multiline />

          <Input label="Image URLs" value={imageUrls} onChangeText={setImageUrls} placeholder="Paste image URLs separated by commas" multiline />

          {imageUrls.trim().length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {imageUrls.split(',').map((u) => u.trim()).filter(Boolean).slice(0, 3).map((uri, idx) => (
                  <Image key={uri + idx} source={{ uri }} style={[styles.imagePreview, { width: imageSize, height: imageSize }]} />
                ))}
            </View>
          )}

          <View style={styles.formActionsRow}>
            <Button title={isEditing ? 'Update Service' : 'Add Service'} loading={loading} onPress={saveService} />
            <Button title="Cancel" variant="ghost" onPress={cancelForm} />
          </View>
        </Card>
      )}

      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionTitle}>My Services</Text>
        <Text style={styles.sectionSubtitleSmall}>Review your current service offerings and pricing at a glance.</Text>
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollCompact}>
            <SafePressable onPress={() => { setSelectedCategory('Custom Service'); setQueryText(''); }} style={[styles.categoryPill, selectedCategory==='Custom Service' && styles.categoryPillActive]}>
              <Text style={[styles.categoryText, selectedCategory==='Custom Service' && styles.categoryTextActive]}>All</Text>
            </SafePressable>
            {serviceCategories.map(c => (
              <SafePressable key={c} onPress={() => setSelectedCategory(c)} style={[styles.categoryPill, selectedCategory===c && styles.categoryPillActive]}>
                <Text style={[styles.categoryText, selectedCategory===c && styles.categoryTextActive]}>{c}</Text>
              </SafePressable>
            ))}
          </ScrollView>
          <View style={styles.sortRow}>
            <SafePressable onPress={() => setSortBy('newest')} style={[styles.sortButton, sortBy==='newest' && styles.sortButtonActive]}><Text style={[styles.sortText, sortBy==='newest' && styles.sortTextActive]}>Newest</Text></SafePressable>
            <SafePressable onPress={() => setSortBy('price-asc')} style={[styles.sortButton, sortBy==='price-asc' && styles.sortButtonActive]}><Text style={[styles.sortText, sortBy==='price-asc' && styles.sortTextActive]}>Price ↑</Text></SafePressable>
            <SafePressable onPress={() => setSortBy('price-desc')} style={[styles.sortButton, sortBy==='price-desc' && styles.sortButtonActive]}><Text style={[styles.sortText, sortBy==='price-desc' && styles.sortTextActive]}>Price ↓</Text></SafePressable>
          </View>
        </View>
      </View>

      {loadingServices ? (
        <Card style={styles.statusCard} variant="default">
          <Text style={styles.statusText}>Loading services...</Text>
        </Card>
      ) : services.length === 0 ? (
        <Card style={styles.emptyCard} variant="default">
          <Text style={styles.emptyTitle}>No services yet</Text>
          <Text style={styles.emptyBody}>Tap "New Service" to add your first funeral service offering.</Text>
          <Button title="Add First Service" onPress={openCreateForm} />
        </Card>
      ) : (
        <View>
          {selectedCategory === 'Custom Service' ? (
            // Grouped view: render a section per category that has services
            serviceCategories.map((cat) => {
              const list = filteredServices.filter((s:any) => ((s.category_name || s.categoryName || 'Custom Service') === cat));
              if (!list || list.length === 0) return null;
              return (
                <View key={cat} style={styles.categorySection}>
                  <Text style={styles.categorySectionTitle}>{cat} ({list.length})</Text>
                  <View style={styles.serviceListGrid}>
                    {list.map((service) => (
                      <Card key={service.id} style={[styles.serviceCard, isNarrow ? styles.serviceCardFull : styles.serviceCardHalf]} variant="elevated">
                        <View style={[styles.serviceRow, isNarrow && styles.serviceRowStack]}>
                          {Array.isArray(service.images) && service.images.length > 0 ? (
                            <Image source={{ uri: service.images[0] }} style={[styles.serviceImage, { width: imageSize, height: imageSize }]} />
                          ) : (
                            <View style={[styles.serviceImagePlaceholder, { width: imageSize, height: imageSize }]}>
                              <Text style={styles.serviceImageInitial}>{service.name?.charAt(0) ?? 'S'}</Text>
                            </View>
                          )}

                          <View style={styles.serviceBody}>
                            <View style={styles.serviceTitleRow}>
                              <View style={styles.titleColumn}>
                                <Text style={styles.serviceName}>{service.name}</Text>
                              </View>
                              <View style={styles.topRightMeta}>
                                <Text style={styles.categoryLabel}>{(service as any).category_name || (service as any).categoryName || 'Service'}</Text>
                                <View style={styles.priceBadge}>
                                  <Text style={styles.priceText}>{formatPriceLabel(service)}</Text>
                                </View>
                              </View>
                            </View>

                            <Text style={styles.serviceDescription} numberOfLines={2} ellipsizeMode="tail">
                              {service.description || 'No description available.'}
                            </Text>

                            <View style={styles.serviceMetaRow}>
                              <View style={styles.metaChip}>
                                <Text style={styles.metaChipText}>⭐ {service.rating || 0}</Text>
                              </View>
                              <View style={styles.metaChip}>
                                <Text style={styles.metaChipText}>{service.review_count || 0} reviews</Text>
                              </View>
                              <View style={{ flex: 1 }} />
                              <View style={styles.cardActions}>
                                <Button title="Edit" variant="ghost" onPress={() => openEditForm(service)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }} />
                                <Button
                                  title="Delete"
                                  variant="danger"
                                  loading={deletingServiceId === service.id}
                                  onPress={() => deleteService(service)}
                                  style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
                                />
                              </View>
                            </View>
                          </View>
                        </View>
                      </Card>
                    ))}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.serviceListGrid}>
              {filteredServices.map((service) => (
                <Card key={service.id} style={[styles.serviceCard, isNarrow ? styles.serviceCardFull : styles.serviceCardHalf]} variant="elevated">
                  <View style={[styles.serviceRow, isNarrow && styles.serviceRowStack]}>
                    {Array.isArray(service.images) && service.images.length > 0 ? (
                      <Image source={{ uri: service.images[0] }} style={[styles.serviceImage, { width: imageSize, height: imageSize }]} />
                    ) : (
                      <View style={[styles.serviceImagePlaceholder, { width: imageSize, height: imageSize }]}>
                        <Text style={styles.serviceImageInitial}>{service.name?.charAt(0) ?? 'S'}</Text>
                      </View>
                    )}

                    <View style={styles.serviceBody}>
                      <View style={styles.serviceTitleRow}>
                        <View style={styles.titleColumn}>
                          <Text style={styles.serviceName}>{service.name}</Text>
                        </View>
                        <View style={styles.topRightMeta}>
                          <Text style={styles.categoryLabel}>{(service as any).category_name || (service as any).categoryName || 'Service'}</Text>
                          <View style={styles.priceBadge}>
                            <Text style={styles.priceText}>{formatPriceLabel(service)}</Text>
                          </View>
                        </View>
                      </View>

                      <Text style={styles.serviceDescription} numberOfLines={2} ellipsizeMode="tail">
                        {service.description || 'No description available.'}
                      </Text>

                      <View style={styles.serviceMetaRow}>
                        <View style={styles.metaChip}>
                          <Text style={styles.metaChipText}>⭐ {service.rating || 0}</Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Text style={styles.metaChipText}>{service.review_count || 0} reviews</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <View style={styles.cardActions}>
                          <Button title="Edit" variant="ghost" onPress={() => openEditForm(service)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }} />
                          <Button
                            title="Delete"
                            variant="danger"
                            loading={deletingServiceId === service.id}
                            onPress={() => deleteService(service)}
                            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={[styles.quickActions, isNarrow && styles.quickActionsNarrow]}>
        <Button title="Back to Dashboard" variant="ghost" onPress={() => navigation.navigate('Dashboard')} />
      </View>
    </Screen>
  );
}

function formatPriceLabel(service: any) {
  const category = (service as any).category_name || (service as any).categoryName || 'Custom Service';
  const cat = category.toLowerCase();
  if (cat.includes('logistics')) {
    const breakdown = (service as any).priceBreakdown || (service as any).price_breakdown;
    if (breakdown) {
      const c = Number(breakdown.chairs || 0).toFixed(2);
      const t = Number(breakdown.tables || 0).toFixed(2);
      const s = Number(breakdown.souvenirs || 0).toFixed(2);
      return `Chairs: ₵ ${c}\nTables: ₵ ${t}\nSouvenirs: ₵ ${s}`;
    }
    const p = `₵ ${Number(service.price || 0).toFixed(2)}`;
    return `${p} per item`;
  }

  const p = `₵ ${Number(service.price || 0).toFixed(2)}`;
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
  return p;
}

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    maxWidth: '92%',
  },
  quickActions: {
    marginBottom: 20,
  },
  pageHeadline: {
    gap: 10,
  },
  subtitleInfo: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  headerButton: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryButton: {
    alignSelf: 'flex-start',
  },
  formCard: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionHeaderContainer: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  pricingHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionSubtitleSmall: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  categoryScroll: {
    paddingVertical: 6,
    paddingRight: 6,
    marginBottom: 12,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6EEF8',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryScrollNarrow: {
    paddingVertical: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  inputRowStack: {
    flexDirection: 'column',
  },
  priceInput: {
    width: 120,
  },
  priceInputNarrow: {
    width: '100%',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
    alignItems: 'center',
  },
  imagePreview: {
    width: 84,
    height: 84,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statusCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  statusText: {
    color: '#6B7280',
    fontSize: 15,
  },
  emptyCard: {
    padding: 20,
    marginBottom: 18,
    alignItems: 'flex-start',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyBody: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  serviceList: {
    marginBottom: 32,
  },
  serviceCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  serviceRowStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  serviceImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  serviceImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceImageInitial: {
    color: '#6B7280',
    fontWeight: '900',
  },
  serviceBody: {
    flex: 1,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  titleColumn: {
    gap: 6,
    flex: 1,
  },
  topRightMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  categoryLabel: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  serviceDescription: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  priceBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priceText: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  serviceMeta: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flex: 1,
  },
  metaChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  metaLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  metaValue: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  cardActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  closeText: {
    color: '#475569',
    fontWeight: '700',
  },
  pageHeaderColumn: {
    flexDirection: 'column',
    gap: 12,
  },
  titleNarrow: {
    fontSize: 22,
  },
  subtitleNarrow: {
    fontSize: 13,
  },
  primaryButtonNarrow: {
    alignSelf: 'flex-start',
  },
  quickActionsNarrow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%'
  },
  headerActionsRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  headerActionsLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
    maxWidth: 420,
  },
  searchInput: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 8,
  },
  filterRow: {
    marginTop: 12,
    gap: 12,
  },
  categoryScrollCompact: {
    paddingVertical: 6,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  sortButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sortText: {
    color: '#374151',
    fontWeight: '700',
  },
  sortTextActive: {
    color: '#FFF',
  },
  serviceListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  serviceCardHalf: {
    width: '48%',
  },
  serviceCardFull: {
    width: '100%'
  },
  categorySection: {
    marginBottom: 20,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
});
