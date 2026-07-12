import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SafePressable from '../components/SafePressable';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

type SupportType =
  | 'ARTICLE'
  | 'VIDEO'
  | 'COUNSELING'
  | 'MENTAL_HEALTH'
  | 'MESSAGE'
  | 'COMMUNITY';

type SupportItem = {
  id: string;
  type: SupportType;
  title: string;
  description: string;
  body: string;
};

const supportItems: SupportItem[] = [
  {
    id: '1',
    type: 'ARTICLE',
    title: 'Understanding Grief After Losing a Loved One',
    description: 'A simple guide to understanding the emotions that come after loss.',
    body:
      'Grief is a natural response to loss. It can come with sadness, anger, confusion, guilt, or even numbness. Everyone grieves differently, and there is no fixed timeline. Be patient with yourself and allow trusted people to support you.',
  },
  {
    id: '2',
    type: 'ARTICLE',
    title: 'How Families Can Support Each Other',
    description: 'Practical ways families can stay connected during mourning.',
    body:
      'Families can support one another by listening without judgment, helping with practical tasks, sharing memories, and checking in regularly. Small acts of kindness can make a big difference during bereavement.',
  },
  {
    id: '3',
    type: 'COUNSELING',
    title: 'When to Speak to a Counselor',
    description: 'Signs that professional grief counseling may help.',
    body:
      'Consider speaking to a counselor if grief makes it difficult to sleep, eat, work, care for yourself, or if you feel hopeless for a long period. Professional support can help you process your loss safely.',
  },
  {
    id: '4',
    type: 'MENTAL_HEALTH',
    title: 'Taking Care of Your Mental Health',
    description: 'Gentle mental health practices after a funeral.',
    body:
      'Try to rest, eat regularly, drink water, take short walks, and talk to someone you trust. Avoid isolating yourself completely. If emotions feel overwhelming, seek help from a mental health professional.',
  },
  {
    id: '5',
    type: 'MESSAGE',
    title: 'A Message of Comfort',
    description: 'A short inspirational message for grieving families.',
    body:
      'May the memories of your loved one bring comfort. May you find strength in family, friends, faith, and community. Healing takes time, and you do not have to walk through grief alone.',
  },
  {
    id: '6',
    type: 'COMMUNITY',
    title: 'Community Support',
    description: 'Ways your community can help after loss.',
    body:
      'Community support may include meals, visits, financial support, transport, childcare, prayer, or help with funeral activities. Accepting help is not weakness; it is part of healing together.',
  },
];

const filters: Array<'ALL' | SupportType> = [
  'ALL',
  'ARTICLE',
  'COUNSELING',
  'MENTAL_HEALTH',
  'MESSAGE',
  'COMMUNITY',
];

function labelForType(type: string) {
  if (type === 'ALL') return 'All';
  if (type === 'ARTICLE') return 'Articles';
  if (type === 'VIDEO') return 'Videos';
  if (type === 'COUNSELING') return 'Counseling';
  if (type === 'MENTAL_HEALTH') return 'Mental Health';
  if (type === 'MESSAGE') return 'Messages';
  if (type === 'COMMUNITY') return 'Community';
  return type;
}

export default function GriefSupportScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | SupportType>('ALL');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<SupportItem | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return supportItems.filter((item) => {
      const filterMatch = activeFilter === 'ALL' || item.type === activeFilter;

      const searchMatch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query);

      return filterMatch && searchMatch;
    });
  }, [activeFilter, search]);

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Grief Support</Text>
        <Text style={styles.subtitle}>
          Browse articles, counseling resources, mental health guidance, inspirational messages, and community support.
        </Text>
      </View>

      <Input
        label="Search Support Resources"
        placeholder="Search articles, counseling, messages..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
          {filters.map((filter) => {
          const active = activeFilter === filter;

          return (
            <SafePressable
              key={filter}
              onPress={() => {
                setActiveFilter(filter);
                setSelectedItem(null);
              }}
              style={({ pressed }: any) => [styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {labelForType(filter)}
              </Text>
            </SafePressable>
          );
        })}
      </View>

      {selectedItem ? (
        <Card style={styles.detailCard} variant="elevated">
          <View style={styles.cardLabel}>
            <Text style={styles.cardLabelText}>{labelForType(selectedItem.type)}</Text>
          </View>

          <Text style={styles.detailTitle}>{selectedItem.title}</Text>
          <Text style={styles.detailBody}>{selectedItem.body}</Text>

          <View style={styles.actionRow}>
            <Button
              title="Back to Resources"
              variant="secondary"
              onPress={() => setSelectedItem(null)}
              size="lg"
              style={styles.actionButton}
            />
            <Button
              title="Back to Dashboard"
              variant="ghost"
              onPress={() => navigation.navigate('Dashboard')}
              size="lg"
              style={styles.actionButton}
            />
          </View>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {filteredItems.length === 0 ? (
            <Card style={styles.emptyCard} variant="default">
              <Text style={styles.emptyTitle}>No resources found</Text>
              <Text style={styles.emptyText}>Try another search term or category above.</Text>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} style={styles.resourceCard} variant="elevated">
                <View style={styles.cardLabel}>
                  <Text style={styles.cardLabelText}>{labelForType(item.type)}</Text>
                </View>

                <Text style={styles.resourceTitle}>{item.title}</Text>
                <Text style={styles.resourceDescription}>{item.description}</Text>

                <Button
                  title={
                    item.type === 'ARTICLE'
                      ? 'Read Article'
                      : item.type === 'COUNSELING'
                      ? 'View Counseling Resource'
                      : item.type === 'MENTAL_HEALTH'
                      ? 'View Mental Health Resource'
                      : item.type === 'MESSAGE'
                      ? 'Read Message'
                      : 'View Support'
                  }
                  variant="secondary"
                  onPress={() => setSelectedItem(item)}
                  size="lg"
                />
              </Card>
            ))
          )}
        </View>
      )}

      <View style={styles.footerButton}>
        <Button
          title="Back to Dashboard"
          variant="ghost"
          onPress={() => navigation.navigate('Dashboard')}
          size="lg"
          style={styles.dashboardButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    maxWidth: '92%',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    marginBottom: 10,
  },
  filterChipActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  filterLabel: {
    fontWeight: '700',
    fontSize: 13,
    color: '#475569',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    marginBottom: 24,
  },
  resourceCard: {
    marginBottom: 18,
  },
  emptyCard: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
  },
  cardLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  cardLabelText: {
    color: '#3730A3',
    fontWeight: '700',
    fontSize: 12,
  },
  resourceTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  resourceDescription: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  detailCard: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 16,
  },
  detailBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: 150,
  },
  footerButton: {
    marginBottom: 30,
  },
  dashboardButton: {
    alignSelf: 'flex-start',
  },
});
