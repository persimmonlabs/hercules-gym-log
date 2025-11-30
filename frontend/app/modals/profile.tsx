/**
 * Profile Modal
 * A modal screen for displaying user profile and account preferences
 */

import React from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, shadows, sizing } from '@/constants/theme';

const ProfileModal: React.FC = () => {
  const router = useRouter();
  const backScale = useSharedValue(1);

  const handleBackPress = () => {
    backScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    void Haptics.selectionAsync();
    setTimeout(() => {
      backScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      router.back();
    }, 100);
  };

  const handlePreferencePress = () => {
    void Haptics.selectionAsync();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={{ transform: [{ scale: backScale.value }] }}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Back to Dashboard"
          >
            <IconSymbol
              name="arrow-back"
              color={colors.text.primary}
              size={24}
            />
          </Pressable>
        </Animated.View>
        <Text variant="heading1" color="primary">
          Profile
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Profile Info Card */}
        <SurfaceCard tone="card" padding="xl" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <IconSymbol
                name="person"
                color={colors.text.primary}
                size={48}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text variant="heading2" color="primary">
                John Doe
              </Text>
              <Text variant="body" color="secondary">
                john.doe@example.com
              </Text>
              <Text variant="caption" color="secondary">
                Member since November 2024
              </Text>
            </View>
          </View>
        </SurfaceCard>

        {/* Account Preferences */}
        <View style={styles.section}>
          <Text variant="heading3" color="primary" style={styles.sectionTitle}>
            Account Preferences
          </Text>
          
          <View style={styles.preferencesList}>
            <PreferenceItem
              icon="notifications"
              title="Notifications"
              subtitle="Manage your notification preferences"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="lock"
              title="Privacy & Security"
              subtitle="Control your privacy settings"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="palette"
              title="Appearance"
              subtitle="Customize app theme and display"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="language"
              title="Language & Region"
              subtitle="Set your language and regional preferences"
              onPress={handlePreferencePress}
            />
          </View>
        </View>

        {/* Workout Preferences */}
        <View style={styles.section}>
          <Text variant="heading3" color="primary" style={styles.sectionTitle}>
            Workout Preferences
          </Text>
          
          <View style={styles.preferencesList}>
            <PreferenceItem
              icon="fitness-center"
              title="Units of Measurement"
              subtitle="Metric (kg, cm) or Imperial (lbs, ft)"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="timer"
              title="Rest Timer Defaults"
              subtitle="Set default rest periods between sets"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="trending-up"
              title="Progress Tracking"
              subtitle="Configure how your progress is calculated"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="event"
              title="Workout Reminders"
              subtitle="Set schedule and reminder preferences"
              onPress={handlePreferencePress}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text variant="heading3" color="primary" style={styles.sectionTitle}>
            Support
          </Text>
          
          <View style={styles.preferencesList}>
            <PreferenceItem
              icon="help"
              title="Help Center"
              subtitle="Get help and frequently asked questions"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="feedback"
              title="Send Feedback"
              subtitle="Help us improve the app"
              onPress={handlePreferencePress}
            />
            <PreferenceItem
              icon="info"
              title="About"
              subtitle="App version and legal information"
              onPress={handlePreferencePress}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.signOutSection}>
          <SurfaceCard tone="neutral" padding="lg" style={styles.signOutCard}>
            <Pressable
              style={styles.signOutButton}
              onPress={handlePreferencePress}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              <IconSymbol
                name="logout"
                color={colors.accent.red}
                size={24}
              />
              <Text variant="bodySemibold" color="red">
                Sign Out
              </Text>
            </Pressable>
          </SurfaceCard>
        </View>
      </ScrollView>
    </View>
  );
};

interface PreferenceItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const PreferenceItem: React.FC<PreferenceItemProps> = ({ icon, title, subtitle, onPress }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scale.value }] }}>
      <Pressable
        style={styles.preferenceItem}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={styles.preferenceIcon}>
          <IconSymbol
            name={icon}
            color={colors.text.secondary}
            size={24}
          />
        </View>
        <View style={styles.preferenceContent}>
          <Text variant="bodySemibold" color="primary">
            {title}
          </Text>
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        </View>
        <IconSymbol
          name="chevron-right"
          color={colors.text.tertiary}
          size={20}
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary.bg,
  },
  backButton: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.orangeLight,
    ...shadows.sm,
  },
  headerSpacer: {
    width: spacing.xl,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  profileCard: {
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: sizing.avatar,
    height: sizing.avatar,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  profileInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    paddingHorizontal: spacing.sm,
  },
  preferencesList: {
    gap: spacing.xs,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.orangeLight,
    ...shadows.sm,
  },
  preferenceIcon: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.neutral.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  preferenceContent: {
    flex: 1,
    gap: spacing.xs,
  },
  signOutSection: {
    marginTop: spacing.lg,
  },
  signOutCard: {
    borderWidth: 1,
    borderColor: colors.accent.red + '30',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

export default ProfileModal;
