/**
 * ScreenHeader
 * Molecule providing a consistent layout for screen titles and subtitles.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { colors, spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  /** Primary screen heading */
  title: string;
  /** Optional supporting copy rendered beneath the title */
  subtitle?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      <Text variant="heading1" color="primary">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="secondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
