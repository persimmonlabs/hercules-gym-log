import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing, shadows } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';
import type { ExerciseType } from '@/types/exercise';

interface PRCardProps {
  exerciseName: string;
  exerciseType?: ExerciseType;
  distanceUnit?: 'miles' | 'meters' | 'floors';
  weight: number;
  reps: number;
  distance?: number;
  duration?: number;
  assistanceWeight?: number;
  date: string | null;
  onReplace?: () => void;
}

const formatDurationCompact = (totalSeconds: number): string => {
  if (!totalSeconds || totalSeconds === 0) return '0:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const PRCard: React.FC<PRCardProps> = ({
  exerciseName, exerciseType = 'weight', distanceUnit,
  weight, reps, distance = 0, duration = 0, assistanceWeight = 0,
  date, onReplace,
}) => {
  const { weightUnit, formatWeightValue, formatDistanceValueForExercise, getDistanceUnitForExercise } = useSettingsStore();

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No data';

  // Compute badge value, badge unit, and meta detail based on exercise type
  let badgeValue: string;
  let badgeUnit: string;
  let metaDetail: string;

  switch (exerciseType) {
    case 'cardio': {
      // If distance is 0, show duration as the primary metric instead
      if (distance > 0) {
        badgeValue = formatDistanceValueForExercise(distance, distanceUnit);
        badgeUnit = getDistanceUnitForExercise(distanceUnit);
        metaDetail = formatDurationCompact(duration);
      } else {
        badgeValue = formatDurationCompact(duration);
        badgeUnit = 'time';
        metaDetail = duration > 0 ? 'longest' : 'No data';
      }
      break;
    }
    case 'duration': {
      badgeValue = formatDurationCompact(duration);
      badgeUnit = 'time';
      metaDetail = 'longest';
      break;
    }
    case 'bodyweight':
    case 'reps_only': {
      badgeValue = String(reps);
      badgeUnit = 'reps';
      metaDetail = 'best set';
      break;
    }
    case 'assisted': {
      badgeValue = formatWeightValue(assistanceWeight);
      badgeUnit = weightUnit;
      metaDetail = `${reps} reps`;
      break;
    }
    case 'weight':
    default: {
      badgeValue = formatWeightValue(weight);
      badgeUnit = weightUnit;
      metaDetail = `${reps} reps`;
      break;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <Text variant="bodySemibold" style={styles.label} numberOfLines={2} color="primary">
            {exerciseName}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption" color="tertiary">
              {formattedDate}
            </Text>
            <Text variant="caption" color="tertiary">
              •
            </Text>
            <Text variant="caption" color="tertiary">
              {metaDetail}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.stats}>
            <View style={styles.weightBadge}>
              <Text variant="heading3" color="onAccent">
                {badgeValue}
              </Text>
              <Text variant="captionSmall" color="onAccent" style={styles.unit}>
                {badgeUnit}
              </Text>
            </View>
          </View>

          {onReplace && (
            <TouchableOpacity onPress={onReplace} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    ...shadows.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    height: 88,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mainInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stats: {
    marginLeft: spacing.md,
  },
  weightBadge: {
    backgroundColor: colors.accent.orange,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  unit: {
    opacity: 0.9,
    marginTop: -2,
  },
  menuButton: {
    padding: spacing.xs,
    marginRight: -spacing.xs, // align to edge visualy
  },
});
