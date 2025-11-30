/**
 * ScreenHeader
 * Molecule providing a consistent layout for screen titles and subtitles.
 */

import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, shadows } from '@/constants/theme';

interface ScreenHeaderProps {
  /** Primary screen heading */
  title: string;
  /** Optional supporting copy rendered beneath the title */
  subtitle?: string;
  /** Optional profile icon press handler */
  onProfilePress?: () => void;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onProfilePress }) => {
  const scale = useSharedValue(1);

  const handleProfilePress = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    void Haptics.selectionAsync();
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      onProfilePress?.();
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.textContainer}>
          <Text variant="heading1" color="primary">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onProfilePress && (
          <Animated.View style={{ transform: [{ scale: scale.value }] }}>
            <Pressable
              style={styles.profileButton}
              onPress={handleProfilePress}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <IconSymbol
                name="person"
                color={colors.text.primary}
                size={24}
              />
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.orangeLight,
  },
});
