import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';

interface Program {
  id: string;
  name: string;
  workouts: any[];
}

interface ProgramCarouselProps {
  programs: Program[];
  onProgramPress: (program: Program) => void;
  onAddProgramPress: () => void;
  selectedProgramId?: string | null;
  onEditProgram?: (program: Program) => void;
  onDeleteProgram?: (program: Program) => void;
  onCloseExpanded?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.65;
const CARD_SPACING = spacing.md;
const LEFT_MARGIN = spacing.lg + spacing.xs;

export const ProgramCarousel: React.FC<ProgramCarouselProps> = ({
  programs,
  onProgramPress,
  onAddProgramPress,
  selectedProgramId,
  onEditProgram,
  onDeleteProgram,
  onCloseExpanded,
}) => {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset scroll position when parent screen gains focus
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, [])
  );

  const getProgramSummary = (program: Program) => {
    const workoutCount = program.workouts.filter(w => w.exercises && w.exercises.length > 0).length;
    return `${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="normal"
        contentContainerStyle={styles.scrollContent}
      >
        {programs.map((program) => {
          const isSelected = selectedProgramId === program.id;
          return (
            <Animated.View
              key={program.id}
              style={styles.card}
            >
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  triggerHaptic('selection');
                  onProgramPress(program);
                }}
              >
                <View style={styles.cardBackground}>
                  {!isSelected ? (
                    <Animated.View
                      key="normal"
                      entering={FadeIn.duration(250)}
                      exiting={FadeOut.duration(150)}
                      style={styles.cardInner}
                    >
                      <View style={styles.cardContent}>
                        <Text variant="heading3" color="primary" numberOfLines={2}>
                          {program.name}
                        </Text>
                        <Text variant="body" color="secondary" style={styles.exerciseCount}>
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
                      <Text variant="heading4" color="primary" numberOfLines={1} style={{ marginBottom: spacing.sm }}>
                        {program.name}
                      </Text>
                      <View style={styles.actionButtons}>
                        {onEditProgram && (
                          <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              triggerHaptic('selection');
                              onEditProgram(program);
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
                              onDeleteProgram(program);
                            }}
                          >
                            <IconSymbol name="delete" size={sizing.iconMD} color={colors.text.primary} />
                            <Text variant="caption" color="primary">Delete</Text>
                          </Pressable>
                        )}
                        {onCloseExpanded && (
                          <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              triggerHaptic('selection');
                              onCloseExpanded();
                            }}
                          >
                            <IconSymbol name="close" size={sizing.iconMD} color={colors.text.primary} />
                            <Text variant="caption" color="primary">Close</Text>
                          </Pressable>
                        )}
                      </View>
                    </Animated.View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Add Program Card */}
        <Pressable
          style={[styles.card, styles.addCard]}
          onPress={() => {
            triggerHaptic('selection');
            onAddProgramPress();
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  scrollContent: {
    paddingLeft: LEFT_MARGIN,
    paddingRight: LEFT_MARGIN + spacing.xs,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  cardInner: {
    flex: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  exerciseCount: {
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
  expandedContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
});
