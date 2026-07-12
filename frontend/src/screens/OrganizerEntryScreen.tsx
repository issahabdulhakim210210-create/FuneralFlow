import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { RootStackParamList } from '../navigation/routes';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function OrganizerEntryScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'OrganizerEntry'>) {
  const [collectorName, setCollectorName] = useState('');
  const [collectorIdentifier, setCollectorIdentifier] = useState('');
  const [sessionId, setSessionId] = useState('');

  const goToDonations = () => {
    if (!collectorName.trim() || !collectorIdentifier.trim() || !sessionId.trim()) {
      return Alert.alert('Missing information', 'Please enter your name, the organizer identifier, and the session ID.');
    }

    navigation.navigate('SessionDetail', {
      id: sessionId.trim(),
      collectorName: collectorName.trim(),
      collectorIdentifier: collectorIdentifier.trim(),
    });
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>I am with an Organizer</Text>
          <Text style={styles.subtitle}>Enter your details to record donations for the session.</Text>

          <View style={styles.field}> 
            <Input label="Your name" value={collectorName} onChangeText={setCollectorName} placeholder="e.g. Kwame Mensah" />
          </View>

          <View style={styles.field}>
            <Input label="Organizer ID" value={collectorIdentifier} onChangeText={setCollectorIdentifier} placeholder="Enter organizer identifier" />
          </View>

          <View style={styles.field}>
            <Input label="Session Code" value={sessionId} onChangeText={setSessionId} placeholder="Enter session code (SES-...)" />
          </View>

          <Button title="Continue to Donations" onPress={goToDonations} size="lg" style={styles.button} />
          <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = {
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.black,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  field: {
    marginBottom: spacing.md,
  },
  button: {
    marginBottom: spacing.md,
  },
};
