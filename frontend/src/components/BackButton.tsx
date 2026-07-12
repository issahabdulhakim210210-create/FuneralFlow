import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { spacing } from '../theme/colors';

export default function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.container}>
      <Button title={'← Back'} variant="ghost" size="sm" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
