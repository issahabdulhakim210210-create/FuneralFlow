import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DocumentsScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const isFamilyMember = user?.role === 'FAMILY_MEMBER';
  const initialSessionId = route?.params?.id || '';
  const hasSessionIdParam = Boolean(initialSessionId);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [session, setSession] = useState<any>(null);
  const [documentType, setDocumentType] = useState('');
  const [pickedDocument, setPickedDocument] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
      if (isFamilyMember) {
        loadDocuments(initialSessionId);
      }
    }
  }, [initialSessionId, isFamilyMember]);

  async function loadSession(idOverride?: string) {
    const effectiveId = idOverride?.trim() || sessionId.trim();
    if (!effectiveId) return;

    try {
      const { data } = await api.get(`/sessions/${effectiveId}`);
      setSession(data);
      setSessionId(effectiveId);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load session');
    }
  }

  async function loadDocuments(idOverride?: string) {
    if (!isFamilyMember) {
      return Alert.alert('Access denied', 'Only family members may view session documents.');
    }

    const effectiveId = idOverride?.trim() || sessionId.trim();
    if (!effectiveId) {
      return Alert.alert('Session required', 'Enter a session ID to load documents.');
    }

    try {
      setLoadingDocs(true);
      const { data } = await api.get('/documents', { params: { sessionId: effectiveId } });
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load documents');
    } finally {
      setLoadingDocs(false);
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    // Expo DocumentPicker returns a shape with `canceled` and `assets`.
    // If not canceled, take the first asset as the picked document.
    if ((result as any)?.canceled === false) {
      const asset = (result as any).assets && (result as any).assets[0];
      if (asset) setPickedDocument(asset);
    }
  }

  async function handleUpload() {
    if (!isFamilyMember) {
      return Alert.alert('Access denied', 'Only family members may upload documents.');
    }
    if (!sessionId.trim()) {
      return Alert.alert('Session required', 'Enter a session ID before uploading.');
    }
    if (!pickedDocument) {
      return Alert.alert('Document required', 'Choose a file to upload.');
    }
    if (!documentType.trim()) {
      return Alert.alert('Document type required', 'Enter a document type.');
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('sessionId', sessionId.trim());
      formData.append('documentType', documentType.trim());
      formData.append('file', {
        uri: pickedDocument.uri,
        name: pickedDocument.name || 'document',
        type: pickedDocument.mimeType || 'application/octet-stream',
      } as any);

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPickedDocument(null);
      setDocumentType('');
      Alert.alert('Upload complete', 'Your document was uploaded successfully.');
      loadDocuments();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function openDocument(document: any) {
    if (!isFamilyMember) {
      return Alert.alert('Access denied', 'Only family members may open session documents.');
    }

    try {
      const { data } = await api.get(`/documents/${document.id}/signed-url`);
      const url = data?.url || document.secure_url;
      if (!url) throw new Error('No document URL available');
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Open failed', e?.message || 'Could not open document.');
    }
  }

  const uploadEnabled = Boolean(sessionId.trim() && pickedDocument && documentType.trim());

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SafePressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: '#0066cc', fontWeight: '600' }}>← Back</Text>
        </SafePressable>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🗂️</Text>
          <Text style={styles.title}>Document Vault</Text>
          <Text style={styles.subtitle}>Upload and browse documents for a session.</Text>
        </View>

        <Card variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Session</Text>
          <Text style={styles.cardBody}>Upload or view documents for the current session.</Text>
          {!hasSessionIdParam && (
            <View style={styles.sessionRow}>
              <TextInput
                placeholder="Session ID"
                value={sessionId}
                onChangeText={setSessionId}
                style={[styles.input, { flex: 1 }]}
              />
              <Button title="Load" onPress={() => { loadSession(); loadDocuments(); }} size="sm" style={styles.loadButton} />
            </View>
          )}
          {hasSessionIdParam && !session && (
            <Text style={styles.sessionMetaText}>Loading session from current context...</Text>
          )}
          {hasSessionIdParam && session && (
            <Text style={styles.sessionMetaText}>Using current session context.</Text>
          )}
          {session ? (
            <View style={styles.sessionMeta}>
              <Text style={styles.sessionMetaText}>Deceased: {session.deceased_full_name || session.name || 'Unknown'}</Text>
              <Text style={styles.sessionMetaText}>Status: {session.status || 'Unknown'}</Text>
            </View>
          ) : null}
        </Card>

{isFamilyMember ? (
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Upload Documents</Text>
          <Text style={styles.cardBody}>Choose a file and assign a type before uploading to the secure vault.</Text>
          <View style={styles.uploadRow}>
            <Button title={pickedDocument ? pickedDocument.name : 'Choose File'} onPress={pickDocument} size="sm" />
            <TextInput
              placeholder="Document type"
              value={documentType}
              onChangeText={setDocumentType}
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
            />
          </View>
          <Button
            title={uploading ? 'Uploading...' : 'Upload Document'}
            onPress={handleUpload}
            disabled={!uploadEnabled || uploading}
            style={styles.uploadButton}
            loading={uploading}
          />
        </Card>
      ) : (
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Document Vault Access</Text>
          <Text style={styles.cardBody}>Only a family member may view or upload session documents.</Text>
        </Card>
      )}

        {isFamilyMember ? (
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.cardTitle}>Browse Documents</Text>
            <Text style={styles.cardBody}>View documents already uploaded for this session.</Text>
            <Button
              title={loadingDocs ? 'Refreshing...' : 'Refresh List'}
              onPress={loadDocuments}
              size="sm"
              variant="secondary"
              style={styles.refreshButton}
              loading={loadingDocs}
            />
            {documents.length === 0 ? (
              <Text style={styles.emptyText}>No documents found for this session.</Text>
            ) : (
              documents.map((document) => (
                <View key={document.id} style={styles.documentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.documentName}>{document.document_type}</Text>
                    <Text style={styles.documentMeta}>{document.mime_type || 'Unknown type'}</Text>
                    <Text style={styles.documentMeta}>{new Date(document.created_at).toLocaleString()}</Text>
                  </View>
                  <Button title="Open" onPress={() => openDocument(document)} size="sm" />
                </View>
              ))
            )}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const { colors, radius, shadows, spacing, typography } = require('../theme/colors');

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: { fontSize: 48, marginBottom: spacing.md },
  title: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.black, color: colors.text.primary, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.sizes.base, color: colors.text.secondary, textAlign: 'center' },
  card: { marginBottom: spacing.xl, padding: spacing.md },
  cardTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary, marginBottom: spacing.md },
  cardBody: { fontSize: typography.sizes.base, color: colors.text.secondary, lineHeight: 22, marginBottom: spacing.md },
  sessionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  uploadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  input: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary },
  loadButton: { minWidth: 100 },
  uploadButton: { marginTop: spacing.sm },
  refreshButton: { marginTop: spacing.sm },
  sessionMeta: { marginTop: spacing.sm },
  sessionMetaText: { fontSize: typography.sizes.sm, color: colors.text.secondary, marginBottom: 4 },
  emptyText: { color: colors.text.secondary, fontSize: typography.sizes.sm, marginTop: spacing.sm },
  documentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: spacing.sm },
  documentName: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text.primary },
  documentMeta: { fontSize: typography.sizes.sm, color: colors.text.secondary },
});

