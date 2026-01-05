/**
 * AddExercisesHeader
 * Displays the heading and back button for the Add Exercises screen.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, sizing } from '@/constants/theme';

interface AddExercisesHeaderProps {
  title?: string;
  subtitle?: string;
  onBack: () => void;
}

export const AddExercisesHeader: React.FC<AddExercisesHeaderProps> = ({
  title,
  subtitle,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <IconSymbol name="arrow-back" color={colors.text.primary} size={sizing.iconMD} />
      </Pressable>

      <View style={styles.textGroup}>
        <Text variant="heading2" color="primary" style={styles.title}>
          {title ?? 'Add Exercises'}
        </Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {subtitle ?? 'Choose from our library of exercises to include in your workout.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
  },
  textGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    textAlign: 'left',
  },
  subtitle: {
    textAlign: 'left',
    maxWidth: 280,
  },
});
