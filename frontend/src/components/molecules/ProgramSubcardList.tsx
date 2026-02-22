import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
  showAll?: boolean;
  onToggleShowAll?: () => void;
  maxVisible?: number;
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
  showAll = false,
  onToggleShowAll,
  maxVisible = 3,
}) => {
  const { theme } = useTheme();
  const getProgramSummary = (program: Program) => {
    const workoutCount = program.workouts.filter(w => w.exercises && w.exercises.length > 0).length;
    return `${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}`;
  };

  const visiblePrograms = showAll ? programs : programs.slice(0, maxVisible);
  const hasMoreItems = programs.length > maxVisible;

  return (
    <View style={styles.container}>
      {/* Card Header with Expand/Collapse Button */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text variant="heading3" color="primary">
            My Plans
          </Text>
        </View>
        {hasMoreItems && onToggleShowAll && (
          <Pressable
            style={styles.expandCollapseButton}
            onPress={() => {
              triggerHaptic('selection');
              onToggleShowAll();
            }}
          >
            <Text variant="caption" color="primary" style={styles.expandCollapseText}>
              {showAll ? 'Collapse' : 'Expand'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.recentWorkoutsList}>
        {programs.length === 0 ? (
          <SurfaceCard
            tone="neutral"
            padding="md"
            showAccentStripe={false}
            style={[styles.emptyCard, { borderColor: theme.border.light }]}
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
          visiblePrograms.map((program) => {
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
                  style={[styles.inlineCard, { borderColor: theme.border.light }, isSelected && styles.expandedCard]}
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
                          <View style={[styles.iconCircle, { borderColor: theme.accent.orange }]}>
                            <IconSymbol name="edit" size={sizing.iconMD} color={colors.accent.orange} />
                          </View>
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
                          <View style={[styles.iconCircle, { borderColor: theme.accent.orange }]}>
                            <IconSymbol name="delete" size={sizing.iconMD} color={colors.accent.orange} />
                          </View>
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
                          <View style={[styles.iconCircle, { borderColor: theme.accent.orange }]}>
                            <IconSymbol name="close" size={sizing.iconMD} color={colors.accent.orange} />
                          </View>
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

        {/* Show More/Less Button - REMOVED */}
      </View>

      {/* Buttons Row */}
      <View style={styles.buttonsContainer}>
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
          textColor={theme.accent.orange}
          style={[styles.wideButton, { ...shadows.sm }]}
          onPress={() => {
            triggerHaptic('selection');
            onCreatePlanPress();
          }}
        />
      </View>
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
    borderRadius: radius.lg,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    paddingLeft: spacing.lg,
  },
  expandedCard: {
    paddingLeft: 0,
    paddingHorizontal: spacing.lg,
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
    paddingLeft: spacing.lg,
  },
  largeActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 60,
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
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
    gap: spacing.sm,
  },
  wideButton: {
    alignSelf: 'center',
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  expandCollapseButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  expandCollapseText: {
    fontWeight: '400',
  },
});
