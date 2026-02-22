/**
 * ActionApprovalCard
 * Simplified card for approving or rejecting AI-proposed actions
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';
import { triggerHaptic } from '@/utils/haptics';
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
  update_profile: 'Update Profile',
  create_plan: 'Create Plan',
  create_program_plan: 'Create Program',
  create_schedule: 'Create Schedule',
  edit_workout_session: 'Edit Session',
  delete_workout_session: 'Delete Session',
  create_custom_exercise: 'Create Custom Exercise',
};

export const ActionApprovalCard: React.FC<ActionApprovalCardProps> = ({
  action,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const actionLabel = ACTION_TYPE_LABELS[action.actionType] || action.actionType;

  const handleApprove = () => {
    triggerHaptic('light');
    onApprove();
  };

  const handleReject = () => {
    triggerHaptic('light');
    onReject();
  };

  return (
    <Animated.View entering={FadeInUp.duration(200)} style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.surface.elevated, borderColor: theme.border.light }]}>
        <Text variant="caption" color="secondary" style={styles.label}>
          {actionLabel}
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={handleReject}
            disabled={isLoading}
            style={[
              styles.button,
              styles.rejectButton,
              { borderColor: theme.border.medium },
              isLoading && styles.buttonDisabled,
            ]}
          >
            <Text variant="bodySemibold" color="secondary">
              Reject
            </Text>
          </Pressable>
          <Pressable
            onPress={handleApprove}
            disabled={isLoading}
            style={[
              styles.button,
              styles.approveButton,
              { backgroundColor: theme.accent.primary },
              isLoading && styles.buttonDisabled,
            ]}
          >
            <Text variant="bodySemibold" color="onAccent">
              Approve
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  label: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  rejectButton: {
    borderWidth: 1,
  },
  approveButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
});
