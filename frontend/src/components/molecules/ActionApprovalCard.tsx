/**
 * ActionApprovalCard
 * Card for approving or rejecting AI-proposed actions
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import type { ActionProposal } from '@/types/herculesAI';

interface ActionApprovalCardProps {
  action: ActionProposal;
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  create_workout_template: 'Create Workout',
  add_workout_session: 'Log Workout',
  update_user_profile: 'Update Profile',
  create_plan: 'Create Plan',
};

export const ActionApprovalCard: React.FC<ActionApprovalCardProps> = ({
  action,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const actionLabel = ACTION_TYPE_LABELS[action.actionType] || action.actionType;

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={styles.container}>
      <SurfaceCard tone="neutral" padding="lg" showAccentStripe>
        <View style={styles.header}>
          <Text variant="bodySemibold" color="orange">
            Action Required
          </Text>
        </View>
        <Text variant="body" color="primary" style={styles.label}>
          {actionLabel}
        </Text>
        <Text variant="caption" color="secondary" style={styles.description}>
          Hercules AI wants to perform this action. Review and approve or reject.
        </Text>
        <View style={styles.actions}>
          <Button
            label="Reject"
            variant="secondary"
            size="sm"
            onPress={onReject}
            disabled={isLoading}
            style={styles.button}
          />
          <Button
            label="Approve"
            variant="primary"
            size="sm"
            onPress={onApprove}
            disabled={isLoading}
            style={styles.button}
          />
        </View>
      </SurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  header: {
    marginBottom: spacing.xs,
  },
  label: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    minWidth: 80,
  },
});
