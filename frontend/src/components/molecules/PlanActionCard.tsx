/**
 * PlanActionCard
 * Reusable action card for plan-related CTAs.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';

interface PlanActionCardProps {
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const PlanActionCard: React.FC<PlanActionCardProps> = ({
  title,
  description,
  buttonLabel,
  onPress,
  style,
}) => {
  const showButton = Boolean(buttonLabel && onPress);

  return (
    <SurfaceCard tone="neutral" padding="lg" style={[styles.cardShell, style]} showAccentStripe={false}>
      <View style={styles.content}>
        <Text variant="heading3" color="primary">
          {title}
        </Text>
        <Text variant="body" color="secondary">
          {description}
        </Text>
        {showButton ? (
          <View style={styles.buttonWrapper}>
            <Button label={buttonLabel as string} size="lg" onPress={onPress as () => void} />
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
  },
  content: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  buttonWrapper: {
    width: '100%',
  },
});
