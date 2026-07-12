import React, { useState, useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { api } from '../services/api';

const serviceCategories = [
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
  'Security',
  'Ushers',
  'Logistics',
  'Custom Service',
];

export default function CreateServiceScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 520;
  const imageSize = Math.max(64, Math.min(120, Math.floor(width * 0.22)));

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

  async function saveService() {
    if (!canSubmit) {
      Alert.alert('Missing information', 'Please provide a name and a valid price.');
      return;
    }

    try {
      setLoading(true);
      const images = imageUrls.split(',').map((s) => s.trim()).filter(Boolean);
      const payload: any = {
        name: name.trim(),
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

      await api.post('/services', payload);
      Alert.alert('Created', 'Service created successfully.');
      navigation.navigate('ServiceCatalog');
    } catch (err: any) {
      Alert.alert('Create failed', err?.message || 'Please try again.');
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
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card} variant="elevated">
          <Text style={styles.title}>Create Service</Text>

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
            <Input label="Service Name" value={name} onChangeText={setName} placeholder="Premium Catering" />
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

          <Input label="Description" value={description} onChangeText={setDescription} placeholder="Short description" multiline />
          <Input label="Image URLs" value={imageUrls} onChangeText={setImageUrls} placeholder="Comma-separated URLs" multiline />

          {imageUrls.trim().length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {imageUrls.split(',').map((u) => u.trim()).filter(Boolean).slice(0, 4).map((uri, idx) => (
                <Image key={uri + idx} source={{ uri }} style={[styles.imagePreview, { width: imageSize, height: imageSize }]} />
              ))}
            </View>
          )}


          <View style={styles.actions}>
            <Button title="Create" onPress={saveService} loading={loading} />
            <Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: { padding: 18 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  categoryScroll: { paddingVertical: 6, paddingRight: 6, marginBottom: 12 },
  categoryPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#E6EEF8', backgroundColor: '#FFFFFF', marginRight: 8 },
  categoryPillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  categoryText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  categoryTextActive: { color: '#FFFFFF' },
  categoryScrollNarrow: { paddingVertical: 6 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  inputRowStack: { flexDirection: 'column' },
  priceInput: { width: 120 },
  priceInputNarrow: { width: '100%' },
  pricingHint: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 12, marginTop: -8 },
  imagePreviewContainer: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 6, alignItems: 'center' },
  imagePreview: { width: 84, height: 84, borderRadius: 8, backgroundColor: '#F1F5F9' },
  actions: { marginTop: 14, flexDirection: 'row', gap: 10 },
});
