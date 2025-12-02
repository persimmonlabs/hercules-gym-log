/**
 * AnalyticsCard
 * Tappable card component for analytics sections that navigates to category screens
 * 
 * @param title - Card header title
 * @param subtitle - Optional subtitle
 * @param onPress - Navigation callback when card is tapped
 * @param showChevron - Whether to show navigation chevron
 * @param disabled - Disable tap interaction
 * @param children - Card content
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { colors, spacing, radius } from '@/constants/theme';

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
  headerRight?: React.ReactNode;
  isEmpty?: boolean;
  showAccentStripe?: boolean;
  titleCentered?: boolean;
  children: React.ReactNode;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  onPress,
  showChevron = true,
  disabled = false,
  headerRight,
  isEmpty = false,
  showAccentStripe = true,
  titleCentered = false,
  children,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const isInteractive = !disabled && onPress;

  return (
    <AnimatedTouchable
      style={animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      disabled={!isInteractive}
    >
      <SurfaceCard tone="neutral" padding="md" showAccentStripe={showAccentStripe}>
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerText, titleCentered && styles.headerTextCentered]}>
              <Text variant="heading3" color="primary">
                {title}
              </Text>
            </View>
          </View>

          {/* Header right content */}
          {headerRight && (
            <Pressable
              style={styles.headerRightContainer}
              onPress={(e) => e.stopPropagation()}
            >
              {headerRight}
            </Pressable>
          )}

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>

          {/* Subtitle below content */}
          {subtitle && !isEmpty && (
            <View style={styles.subtitleRow}>
              <Text variant="caption" color="secondary" style={styles.subtitle}>
                {subtitle}
              </Text>
            </View>
          )}

          {/* Tap for details at bottom */}
          {isInteractive && showChevron && (
            <View style={styles.footerHint}>
              <Text variant="caption" color="secondary" style={styles.tapHint}>
                Tap for details
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.text.tertiary}
              />
            </View>
          )}
        </View>
      </SurfaceCard>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  cardContent: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTextCentered: {
    alignItems: 'center',
  },
  chevronContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
    paddingTop: spacing.xs,
  },
  tapHint: {
    marginRight: spacing.xs,
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  headerRightContainer: {
    alignSelf: 'center',
  },
  subtitleRow: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.sm,
  },
  subtitle: {
    // Subtitle text
  },
  content: {
    // Content area for charts/data
  },
});
