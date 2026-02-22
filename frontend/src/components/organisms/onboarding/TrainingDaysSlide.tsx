/**
 * TrainingDaysSlide
 * Horizontal pill selector for training days per week (1–7).
 * Replaces the vertical button list with a compact horizontal layout.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { spacing, radius } from '@/constants/theme';
import { lt, slideStyles, SCREEN_WIDTH } from '@/constants/onboarding';
import { triggerHaptic } from '@/utils/haptics';

interface TrainingDaysSlideProps {
  selectedDays?: number | null;
  onSelect: (field: string, value: number) => void;
  onSkip: () => void;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export const TrainingDaysSlide: React.FC<TrainingDaysSlideProps> = ({
  selectedDays,
  onSelect,
  onSkip,
}) => {
  const handleSelect = (day: number) => {
    triggerHaptic('selection');
    onSelect('trainingDaysPerWeek', day);
  };

  return (
    <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.centeredContent}>
        <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>
          Training Days
        </Text>
        <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>
          How many days per week do you train?
        </Text>
        <View style={styles.pillRow}>
          {DAYS.map((day) => {
            const isSelected = selectedDays === day;
            return (
              <Pressable
                key={day}
                style={[
                  styles.pill,
                  { borderColor: lt.border.light, backgroundColor: lt.surface.card },
                  isSelected && { backgroundColor: lt.accent.orange, borderColor: lt.accent.orange },
                ]}
                onPress={() => handleSelect(day)}
              >
                <Text
                  variant="bodySemibold"
                  style={{ color: isSelected ? lt.text.onAccent : lt.text.primary, textAlign: 'center' }}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" style={{ color: lt.text.tertiary, textAlign: 'center' }}>
          {selectedDays ? `${selectedDays} day${selectedDays > 1 ? 's' : ''} per week` : ''}
        </Text>
      </View>
      <View>
        <Button label="Skip" variant="secondary" onPress={onSkip} style={slideStyles.mainButton} />
        <Text variant="caption" style={[slideStyles.skipHint, { color: lt.text.tertiary }]}>
          You can update this later in Settings
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
