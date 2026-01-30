/**
 * PlanEmptyStateCard
 * Enhanced CTA card prompting users to add or create plan content.
 * Supports different variants with appropriate icons and messaging.
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius } from '@/constants/theme';

type EmptyStateVariant = 'workout' | 'plan' | 'exercises' | 'generic';

interface PlanEmptyStateCardProps {
  title: string;
  description?: string;
  buttonLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Visual variant affects icon and default messaging */
  variant?: EmptyStateVariant;
  /** Show encouraging hint text */
  showHint?: boolean;
  /** Custom hint text */
  hintText?: string;
  /** Secondary action */
  secondaryButtonLabel?: string;
  onSecondaryPress?: () => void;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, {
  icon: string;
  defaultHint: string;
}> = {
  workout: {
    icon: 'fitness-center',
    defaultHint: 'Tip: Start with 3-5 exercises for a focused workout',
  },
  plan: {
    icon: 'calendar-today',
    defaultHint: 'Tip: Add your favorite workouts to build a weekly routine',
  },
  exercises: {
    icon: 'add-circle-outline',
    defaultHint: 'Search or browse to find the perfect exercises',
  },
  generic: {
    icon: 'lightbulb-outline',
    defaultHint: 'Get started by adding your first item',
  },
};

export const PlanEmptyStateCard: React.FC<PlanEmptyStateCardProps> = ({
  title,
  description,
  buttonLabel,
  onPress,
  style,
  variant = 'generic',
  showHint = true,
  hintText,
  secondaryButtonLabel,
  onSecondaryPress,
}) => {
  const config = VARIANT_CONFIG[variant];
  const displayHint = hintText || config.defaultHint;

  return (
    <SurfaceCard tone="card" padding="xl" showAccentStripe style={style}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <IconSymbol
            name={config.icon as any}
            size={40}
            color={colors.accent.orange}
          />
        </View>

        {/* Text Content */}
        <View style={styles.copyGroup}>
          <Text variant="bodySemibold" color="primary" style={styles.title}>
            {title}
          </Text>
          {description && (
            <Text variant="body" color="secondary" style={styles.description}>
              {description}
            </Text>
          )}
        </View>

        {/* Hint */}
        {showHint && (
          <View style={styles.hintContainer}>
            <IconSymbol
              name="lightbulb-outline"
              size={16}
              color={colors.text.tertiary}
            />
            <Text variant="caption" color="tertiary" style={styles.hintText}>
              {displayHint}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label={buttonLabel}
            variant="primary"
            size="lg"
            onPress={onPress}
          />
          {secondaryButtonLabel && onSecondaryPress && (
            <Button
              label={secondaryButtonLabel}
              variant="ghost"
              size="md"
              onPress={onSecondaryPress}
            />
          )}
        </View>
      </Animated.View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.accent.orangeMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  copyGroup: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.md,
  },
  hintText: {
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
