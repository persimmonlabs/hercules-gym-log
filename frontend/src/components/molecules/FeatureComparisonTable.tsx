/**
 * FeatureComparisonTable
 * A Free vs Premium feature comparison table for the upgrade screen.
 * Features listed on the left, with checkmark columns for Free and Premium.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';

interface FeatureRow {
  label: string;
  free: boolean;
  premium: boolean;
  isNew?: boolean;
}

interface FeatureComparisonTableProps {
  features: FeatureRow[];
}

const COLUMN_WIDTH = 70;

export const FeatureComparisonTable: React.FC<FeatureComparisonTableProps> = ({
  features,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Continuous Premium Column Background */}
      <View
        style={[
          styles.premiumBackground,
          {
            backgroundColor: theme.accent.orangeMuted,
            borderRadius: radius.md,
          },
        ]}
      />

      {/* Column Headers */}
      <View style={styles.headerRow}>
        <View style={styles.labelColumn} />
        <View style={styles.checkColumn}>
          <Text variant="caption" color="tertiary" style={styles.headerText}>
            Free
          </Text>
        </View>
        <View style={[styles.checkColumn, styles.premiumColumn]}>
          <Text variant="captionMedium" color="orange" style={styles.headerText}>
            Premium
          </Text>
        </View>
      </View>

      {/* Feature Rows */}
      {features.map((feature, index) => {
        const isLast = index === features.length - 1;
        return (
          <Animated.View
            key={feature.label}
            entering={FadeInDown.delay(100 + index * 50).springify()}
          >
            <View
              style={[
                styles.featureRow,
                { borderBottomColor: theme.border.light },
                isLast && styles.lastRow,
              ]}
            >
              <View style={styles.labelColumn}>
                <Text variant="body" color="primary" style={styles.labelText}>
                  {feature.label}
                </Text>
                {feature.isNew && (
                  <View style={[styles.newBadge, { backgroundColor: theme.surface.elevated }]}>
                    <Text variant="captionSmall" color="secondary">NEW</Text>
                  </View>
                )}
              </View>

              <View style={styles.checkColumn}>
                {feature.free && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.accent.orange}
                  />
                )}
              </View>

              <View style={[styles.checkColumn, styles.premiumColumn]}>
                {feature.premium && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.accent.orange}
                  />
                )}
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  premiumBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: COLUMN_WIDTH,
    height: '100%',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm },
  labelColumn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkColumn: { width: COLUMN_WIDTH, alignItems: 'center', justifyContent: 'center' },
  premiumColumn: { paddingVertical: spacing.xs },
  headerText: { textAlign: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  lastRow: { borderBottomWidth: 0 },
  labelText: { flexShrink: 1 },
  newBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm },
});
