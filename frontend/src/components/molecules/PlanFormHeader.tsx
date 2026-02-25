import React from 'react';
import { StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { colors, radius, sizing, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PlanFormHeaderProps {
  planName: string;
  onPlanNameChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export const PlanFormHeader: React.FC<PlanFormHeaderProps> = ({
  planName,
  onPlanNameChange,
  searchTerm,
  onSearchTermChange,
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text variant="caption" color="secondary">
            Plan name
          </Text>
          <TextInput
            value={planName}
            onChangeText={onPlanNameChange}
            placeholder="e.g. Upper Body Strength"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            selectionColor={theme.accent.primary}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text variant="caption" color="secondary">
            Search exercises
          </Text>
          <TextInput
            value={searchTerm}
            onChangeText={onSearchTermChange}
            placeholder="Find by name or category"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            selectionColor={theme.accent.primary}
          />
        </View>
      </SurfaceCard>
    </View>
  );
};

const inputTypography: TextStyle = {
  ...typography.body,
  fontWeight: typography.body.fontWeight as TextStyle['fontWeight'],
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
    borderRadius: radius.lg,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  input: {
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    color: colors.text.primary,
    ...inputTypography,
  },
});
