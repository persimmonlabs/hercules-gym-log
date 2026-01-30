import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';
import { SheetModal } from '@/components/molecules/SheetModal';

interface Program {
  id: string;
  name: string;
  workouts: any[];
}

interface ViewAllProgramsModalProps {
  visible: boolean;
  programs: Program[];
  onClose: () => void;
  onProgramPress: (program: Program) => void;
  onEditProgram?: (program: Program) => void;
  onDeleteProgram?: (program: Program) => void;
  onAddProgram?: () => void;
}

export const ViewAllProgramsModal: React.FC<ViewAllProgramsModalProps> = ({
  visible,
  programs,
  onClose,
  onProgramPress,
  onEditProgram,
  onDeleteProgram,
  onAddProgram,
}) => {
  const insets = useSafeAreaInsets();
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  const handleProgramPress = useCallback((program: Program) => {
    triggerHaptic('selection');
    if (expandedProgramId === program.id) {
      setExpandedProgramId(null);
    } else {
      setExpandedProgramId(program.id);
    }
  }, [expandedProgramId]);

  const handleAction = useCallback((program: Program, action: () => void) => {
    action();
    setExpandedProgramId(null);
    onClose();
  }, [onClose]);

  const getProgramSummary = (program: Program) => {
    const workoutCount = program.workouts.filter(w => w.exercises && w.exercises.length > 0).length;
    return `${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}`;
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="My Plans"
      headerContent={
        <Text variant="body" color="secondary">
          {programs.length} {programs.length === 1 ? 'plan' : 'plans'}
        </Text>
      }
      height="85%"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.sm + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.list}>
          {programs.map((program) => {
            const isExpanded = expandedProgramId === program.id;
            return (
              <Animated.View key={program.id} style={styles.listCard}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => handleProgramPress(program)}
                >
                  <View style={styles.listCardBackground}>
                    {!isExpanded ? (
                      <Animated.View
                        key="normal"
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(150)}
                        style={styles.listCardContent}
                      >
                        <View style={styles.listCardInfo}>
                          <Text variant="bodySemibold" color="primary" numberOfLines={1}>
                            {program.name}
                          </Text>
                          <Text variant="caption" color="secondary">
                            {getProgramSummary(program)}
                          </Text>
                        </View>
                        <IconSymbol name="chevron-right" size={sizing.iconMD} color={colors.text.primary} />
                      </Animated.View>
                    ) : (
                      <Animated.View
                        key="expanded"
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(150)}
                        style={styles.expandedContent}
                      >
                        <View style={styles.actionButtons}>
                          {onEditProgram && (
                            <Pressable
                              style={styles.actionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                triggerHaptic('selection');
                                handleAction(program, () => onEditProgram(program));
                              }}
                            >
                              <IconSymbol name="edit" size={sizing.iconMD} color={colors.text.primary} />
                              <Text variant="caption" color="primary">Edit</Text>
                            </Pressable>
                          )}
                          {onDeleteProgram && (
                            <Pressable
                              style={styles.actionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                triggerHaptic('selection');
                                handleAction(program, () => onDeleteProgram(program));
                              }}
                            >
                              <IconSymbol name="delete" size={sizing.iconMD} color={colors.text.primary} />
                              <Text variant="caption" color="primary">Delete</Text>
                            </Pressable>
                          )}
                          <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              triggerHaptic('selection');
                              setExpandedProgramId(null);
                            }}
                          >
                            <IconSymbol name="close" size={sizing.iconMD} color={colors.text.primary} />
                            <Text variant="caption" color="primary">Close</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          {/* Add Plan Card */}
          {onAddProgram && (
            <Pressable
              style={[styles.listCard, styles.addCard]}
              onPress={() => {
                triggerHaptic('selection');
                onAddProgram();
                onClose();
              }}
            >
              <View style={styles.addCardInner}>
                <View style={styles.addIconWrapper}>
                  <IconSymbol name="add" size={sizing.iconLG} color={colors.accent.orange} />
                </View>
                <Text variant="body" color="primary" style={styles.addText}>
                  Add Plan
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SheetModal>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  listCard: {
    height: 80,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  listCardBackground: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  listCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listCardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  expandedContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  addCard: {
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderStyle: 'dashed',
  },
  addCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexDirection: 'row',
  },
  addIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent.orange,
  },
  addText: {
    textAlign: 'center',
  },
});
