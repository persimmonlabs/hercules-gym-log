/**
 * Profile Modal
 * A modal screen for displaying user profile and account preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { NameEditModal } from '@/components/molecules/NameEditModal';
import { BodyMetricsModal } from '@/components/molecules/BodyMetricsModal';
import { UnitsModal } from '@/components/molecules/UnitsModal';
import { NotificationsModal } from '@/components/molecules/NotificationsModal';
import { AppearanceModal } from '@/components/molecules/AppearanceModal';
import { colors, spacing, radius, shadows, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';
import { supabaseClient } from '@/lib/supabaseClient';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useDevToolsStore } from '@/store/devToolsStore';

const ProfileModal: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, fetchProfile, updateProfile, updateBodyMetrics } = useUserProfileStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [isBodyMetricsModalVisible, setIsBodyMetricsModalVisible] = useState(false);
  const [isUnitsModalVisible, setIsUnitsModalVisible] = useState(false);
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [isAppearanceModalVisible, setIsAppearanceModalVisible] = useState(false);
  const { weightUnit, distanceUnit, sizeUnit, formatWeight } = useSettingsStore();
  const { notificationsEnabled, configs } = useNotificationStore();
  const { premiumOverride, setPremiumOverride } = useDevToolsStore();
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
    // TODO: Navigate to preference screens when implemented
  };

  const handleSignOut = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await signOut();
              // Navigation will be handled automatically by the auth state change
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  // Fetch user profile data from store (which syncs with profiles table)
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  // Format the account creation date
  const formatMemberSince = (createdAt: string | undefined) => {
    if (!createdAt) return 'Member';

    const date = new Date(createdAt);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `Member since ${month} ${year}`;
  };

  // Get user's display name
  const getUserDisplayName = () => {
    // 1. Prefer store state (centralized, real-time updates)
    if (profile?.fullName) {
      return profile.fullName;
    }
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }

    // 2. Fallback to auth metadata
    const meta = user?.user_metadata;
    if (meta?.full_name) return meta.full_name;
    if (meta?.first_name || meta?.last_name) {
      return `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
    }

    // 3. Fallback to email-based name
    if (!user?.email) return 'User';
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  };

  const handleNameEdit = () => {
    void Haptics.selectionAsync();
    setIsNameModalVisible(true);
  };

  const handleCloseNameModal = useCallback(() => {
    setIsNameModalVisible(false);
  }, []);

  // Get current first/last name for modal prepopulation
  const getCurrentFirstName = () => {
    // Use store as source of truth
    return profile?.firstName || '';
  };

  const getCurrentLastName = () => {
    // Use store as source of truth
    return profile?.lastName || '';
  };

  const handleNameSave = (firstName: string, lastName: string) => {
    // Update the centralized store for real-time updates across the app
    updateProfile(firstName, lastName);
  };

  const getFormattedHeight = () => {
    const hasHeightData =
      typeof profile?.heightFeet === 'number' && typeof profile?.heightInches === 'number';

    if (!hasHeightData) {
      return null;
    }

    const feet = profile?.heightFeet ?? 0;
    const inches = profile?.heightInches ?? 0;
    const totalInches = feet * 12 + inches;

    if (sizeUnit === 'cm') {
      const heightCm = Math.round(totalInches * 2.54);
      return `${heightCm} cm`;
    }

    return `${totalInches} in`;
  };

  const getBodyMetricsSubtitle = () => {
    const heightLabel = getFormattedHeight();
    const weightLabel = profile?.weightLbs ? formatWeight(profile.weightLbs) : null;

    if (heightLabel && weightLabel) {
      return `${heightLabel} • ${weightLabel}`;
    }

    if (heightLabel) {
      return heightLabel;
    }

    if (weightLabel) {
      return weightLabel;
    }

    return 'Set height and weight for accurate stats';
  };

  const handleBodyMetricsSave = (heightFeet: number, heightInches: number, weightLbs: number) => {
    updateBodyMetrics(heightFeet, heightInches, weightLbs);
    setIsBodyMetricsModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary.bg }]}>
        <Animated.View style={{ transform: [{ scale: backScale.value }] }}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Back to Dashboard"
          >
            <IconSymbol
              name="arrow-back"
              color={theme.text.primary}
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
            <View style={[
              profile?.firstName ? styles.avatarWithInitial : styles.avatar,
              { backgroundColor: theme.surface.card, borderColor: theme.accent.orange }
            ]}>
              {profile?.firstName ? (
                <Text variant="heading1" style={styles.avatarInitialText}>
                  {profile.firstName.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <IconSymbol
                  name="person"
                  color={theme.text.primary}
                  size={48}
                />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text variant="heading2" color="primary">
                {getUserDisplayName()}
              </Text>
              <Text variant="body" color="secondary">
                {user?.email || 'No email'}
              </Text>
              <Text variant="caption" color="secondary">
                {formatMemberSince(user?.created_at)}
              </Text>
            </View>
          </View>
        </SurfaceCard>

        {/* Account Preferences */}
        <SurfaceCard tone="card" padding="lg" style={{ borderWidth: 0 }}>
          <View style={styles.section}>
            <Text variant="heading3" color="primary" style={styles.sectionTitle}>
              Account Preferences
            </Text>

            <View style={styles.preferencesList}>
              <PreferenceItem
                icon="person"
                title="Name"
                subtitle={getUserDisplayName()}
                onPress={handleNameEdit}
              />
              <PreferenceItem
                icon="notifications"
                title="Notifications"
                subtitle={notificationsEnabled ? `${configs.length} reminder${configs.length !== 1 ? 's' : ''} active` : 'Set workout reminders'}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsNotificationsModalVisible(true);
                }}
              />

              <PreferenceItem
                icon="palette"
                title="Appearance"
                subtitle="Customize app theme"
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsAppearanceModalVisible(true);
                }}
              />
                          </View>
          </View>
        </SurfaceCard>

        {/* Workout Preferences */}
        <SurfaceCard tone="card" padding="lg" style={{ borderWidth: 0 }}>
          <View style={styles.section}>
            <Text variant="heading3" color="primary" style={styles.sectionTitle}>
              Workout Preferences
            </Text>

            <View style={styles.preferencesList}>
              <PreferenceItem
                icon="fitness-center"
                title="Units of Measurement"
                subtitle={`${weightUnit === 'kg' ? 'kg' : 'lbs'} • ${distanceUnit === 'km' ? 'km' : 'mi'} • ${sizeUnit === 'cm' ? 'cm' : 'in'}`}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsUnitsModalVisible(true);
                }}
              />

              <PreferenceItem
                icon="straighten"
                title="Body Metrics"
                subtitle={getBodyMetricsSubtitle()}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsBodyMetricsModalVisible(true);
                }}
              />

                                        </View>
          </View>
        </SurfaceCard>

        {/* Support */}
        <SurfaceCard tone="card" padding="lg" style={{ borderWidth: 0 }}>
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
        </SurfaceCard>

        {/* Dev Tools (only in development) */}
        {__DEV__ && (
          <SurfaceCard tone="card" padding="lg" style={{ borderWidth: 0 }}>
            <View style={styles.section}>
              <Text variant="heading3" color="primary" style={styles.sectionTitle}>
                Developer Tools
              </Text>

              <View style={styles.preferencesList}>
                <Pressable
                  style={styles.devToggleRow}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    const newValue = premiumOverride === 'premium' ? 'free' : 'premium';
                    setPremiumOverride(newValue);
                  }}
                >
                  <View style={styles.devToggleInfo}>
                    <IconSymbol name="star" size={24} color={theme.accent.orange} />
                    <View style={{ marginLeft: spacing.md, flex: 1 }}>
                      <Text variant="bodySemibold" color="primary">Premium Status</Text>
                      <Text variant="caption" color="secondary">
                        {premiumOverride === 'premium' ? 'Premium (tap to switch to Free)' : 'Free (tap to switch to Premium)'}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.devToggleBadge,
                    { backgroundColor: premiumOverride === 'premium' ? theme.accent.orange : theme.surface.elevated }
                  ]}>
                    <Text variant="captionSmall" style={{ color: premiumOverride === 'premium' ? '#FFF' : theme.text.secondary }}>
                      {premiumOverride === 'premium' ? 'PRO' : 'FREE'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </SurfaceCard>
        )}

        {/* Sign Out Button */}
        <View style={styles.signOutSection}>
          <SurfaceCard tone="neutral" padding="lg" style={styles.signOutCard}>
            <Pressable
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={isSigningOut}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              {isSigningOut ? (
                <ActivityIndicator color={theme.accent.red} />
              ) : (
                <>
                  <IconSymbol
                    name="logout"
                    color={theme.accent.red}
                    size={24}
                  />
                  <Text variant="bodySemibold" color="red">
                    Sign Out
                  </Text>
                </>
              )}
            </Pressable>
          </SurfaceCard>
        </View>
      </ScrollView>

      <NameEditModal
        visible={isNameModalVisible}
        firstName={getCurrentFirstName()}
        lastName={getCurrentLastName()}
        onClose={handleCloseNameModal}
        onSave={handleNameSave}
      />

      <BodyMetricsModal
        visible={isBodyMetricsModalVisible}
        heightFeet={profile?.heightFeet || 5}
        heightInches={profile?.heightInches || 9}
        weightLbs={profile?.weightLbs || 0}
        onClose={() => setIsBodyMetricsModalVisible(false)}
        onSave={handleBodyMetricsSave}
      />

      <UnitsModal
        visible={isUnitsModalVisible}
        onClose={() => setIsUnitsModalVisible(false)}
      />

      <NotificationsModal
        visible={isNotificationsModalVisible}
        onClose={() => setIsNotificationsModalVisible(false)}
      />

      <AppearanceModal
        visible={isAppearanceModalVisible}
        onClose={() => setIsAppearanceModalVisible(false)}
      />
    </SafeAreaView>
  );
};

interface PreferenceItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const PreferenceItem: React.FC<PreferenceItemProps> = ({ icon, title, subtitle, onPress }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  return (
    <Pressable
      onPress={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
        void Haptics.selectionAsync();
        setTimeout(() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          onPress();
        }, 100);
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <SurfaceCard
        tone="neutral"
        padding="lg"
        showAccentStripe={false}
        style={{ transform: [{ scale: scale.value }], borderWidth: 0, height: 88 }}
      >
        <View style={styles.preferenceItemContent}>
          <View style={styles.preferenceIcon}>
            <IconSymbol
              name={icon}
              color={theme.accent.orange}
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
            color={theme.text.tertiary}
            size={20}
          />
        </View>
      </SurfaceCard>
    </Pressable>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary.bg,
  },
  backButton: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: spacing.xl,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.xl + spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    borderWidth: 0,
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
    borderWidth: 3,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWithInitial: {
    width: sizing.avatar,
    height: sizing.avatar,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 3,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialText: {
    color: colors.text.primary,
    fontSize: 40,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  preferencesList: {
    gap: spacing.md,
  },
  preferenceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  preferenceIcon: {
    width: spacing.xl,
    height: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  preferenceContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  signOutSection: {
    marginTop: spacing.md,
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
  devToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  devToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  devToggleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
});

export default ProfileModal;
