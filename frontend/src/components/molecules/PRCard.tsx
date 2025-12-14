import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing, shadows } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

interface PRCardProps {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string | null;
  onReplace?: () => void;
}

export const PRCard: React.FC<PRCardProps> = ({ exerciseName, weight, reps, date, onReplace }) => {
  const { formatWeightValue, getWeightUnit } = useSettingsStore();
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No data';

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
              {reps} reps
            </Text>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <View style={styles.stats}>
            <View style={styles.weightBadge}>
              <Text variant="heading3" color="onAccent">
                {formatWeightValue(weight)}
              </Text>
              <Text variant="captionSmall" color="onAccent" style={styles.unit}>
                {getWeightUnit()}
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
