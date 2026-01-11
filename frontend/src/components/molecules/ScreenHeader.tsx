/**
 * ScreenHeader
 * Molecule providing a consistent layout for screen titles and subtitles.
 */

import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { spacing, radius, shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ScreenHeaderProps {
  /** Primary screen heading */
  title: string;
  /** Optional supporting copy rendered beneath the title */
  subtitle?: string;
  /** Optional profile icon press handler */
  onProfilePress?: () => void;
  /** Optional user initial to display in profile button (shows orange circle with letter) */
  userInitial?: string | null;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onProfilePress, userInitial }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleProfilePress = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    triggerHaptic('selection');
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
          <Animated.View style={animatedStyle}>
            <Pressable
              style={[
                userInitial ? styles.profileButtonWithInitial : styles.profileButton,
                {
                  backgroundColor: userInitial ? theme.accent.orange : theme.surface.card,
                  borderColor: theme.accent.orange,
                  borderWidth: userInitial ? 0 : 1
                }
              ]}
              onPress={handleProfilePress}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              {userInitial ? (
                <Text variant="bodySemibold" style={[styles.initialText, { color: theme.text.onAccent }]}>
                  {userInitial}
                </Text>
              ) : (
                <IconSymbol
                  name="person"
                  color={theme.accent.orange}
                  size={24}
                />
              )}
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
    paddingBottom: spacing.sm,
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  titleWrapper: {
    gap: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  profileButtonWithInitial: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  initialText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
