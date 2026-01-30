import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';

interface Program {
  id: string;
  name: string;
  workouts: any[];
}

interface ProgramSubcardListProps {
  programs: Program[];
  onProgramPress: (program: Program) => void;
  onAddProgramPress: () => void;
  onCreatePlanPress: () => void;
  selectedProgramId?: string | null;
  onEditProgram?: (program: Program) => void;
  onDeleteProgram?: (program: Program) => void;
  onCloseExpanded?: () => void;
}

export const ProgramSubcardList: React.FC<ProgramSubcardListProps> = ({
  programs,
  onProgramPress,
  onAddProgramPress,
  onCreatePlanPress,
  selectedProgramId,
  onEditProgram,
  onDeleteProgram,
  onCloseExpanded,
}) => {
  const getProgramSummary = (program: Program) => {
    const workoutCount = program.workouts.filter(w => w.exercises && w.exercises.length > 0).length;
    return `${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.recentWorkoutsList}>
        {programs.length === 0 ? (
          <SurfaceCard
            tone="neutral"
            padding="md"
            showAccentStripe={false}
            style={styles.emptyCard}
          >
            <View style={styles.emptyContent}>
              <Text variant="bodySemibold" color="primary" style={styles.emptyTitle}>
                No plans yet
              </Text>
              <Text variant="body" color="secondary" style={styles.emptySubtext}>
                Add a plan to see it here.
              </Text>
            </View>
          </SurfaceCard>
        ) : (
          programs.map((program) => {
            const isSelected = selectedProgramId === program.id;
            return (
              <Pressable
                key={program.id}
                style={styles.pressableStretch}
                onPress={() => {
                  triggerHaptic('selection');
                  onProgramPress(program);
                }}
              >
                <SurfaceCard
                  tone="neutral"
                  padding="md"
                  showAccentStripe={false}
                  style={styles.inlineCard}
                >
                  {!isSelected ? (
                    <>
                      <View style={styles.recentCardHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {program.name}
                        </Text>
                      </View>
                      <Text variant="body" color="secondary">
                        {getProgramSummary(program)}
                      </Text>
                    </>
                  ) : (
                    <View style={styles.expandedActionsContainer}>
                      {onEditProgram && (
                        <Pressable
                          style={styles.largeActionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            triggerHaptic('selection');
                            onEditProgram(program);
                          }}
                        >
                          <IconSymbol name="edit" size={sizing.iconMD} color={colors.accent.primary} />
                          <Text variant="caption" color="primary">Edit</Text>
                        </Pressable>
                      )}
                      {onDeleteProgram && (
                        <Pressable
                          style={styles.largeActionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            triggerHaptic('selection');
                            onDeleteProgram(program);
                          }}
                        >
                          <IconSymbol name="delete" size={sizing.iconMD} color={colors.accent.warning} />
                          <Text variant="caption" color="primary">Delete</Text>
                        </Pressable>
                      )}
                      {onCloseExpanded && (
                        <Pressable
                          style={styles.largeActionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            triggerHaptic('selection');
                            onCloseExpanded();
                          }}
                        >
                          <IconSymbol name="close" size={sizing.iconMD} color={colors.text.secondary} />
                          <Text variant="caption" color="primary">Close</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </SurfaceCard>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Add Plan Button */}
      <Button
        label="Add Plan"
        variant="primary"
        size="md"
        style={styles.wideButton}
        onPress={() => {
          triggerHaptic('selection');
          onAddProgramPress();
        }}
      />

      {/* Create Plan Button */}
      <Button
        label="Create Plan"
        variant="secondary"
        size="md"
        textColor={colors.accent.orange}
        style={[styles.wideButton, { ...shadows.sm }]}
        onPress={() => {
          triggerHaptic('selection');
          onCreatePlanPress();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  recentWorkoutsList: {
    gap: spacing.md,
  },
  recentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  inlineCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    paddingLeft: spacing.lg,
  },
  pressableStretch: {
    width: '100%',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  expandedActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  largeActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 60,
    flex: 1,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    paddingLeft: spacing.lg,
  },
  emptyContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  emptyTitle: {
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    textAlign: 'left',
  },
  buttonsContainer: {
    gap: 0,
  },
  wideButton: {
    alignSelf: 'center',
    width: '103%',
  },
});
