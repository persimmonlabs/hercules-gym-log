/**
 * Profile Modal
 * A modal screen for displaying user profile and account preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { NameEditModal } from '@/components/molecules/NameEditModal';
import { UnitsModal } from '@/components/molecules/UnitsModal';
import { ProfilePickerModal } from '@/components/molecules/ProfilePickerModal';
import { DateOfBirthModal } from '@/components/molecules/DateOfBirthModal';
import { HeightModal } from '@/components/molecules/HeightModal';
import { WeightModal } from '@/components/molecules/WeightModal';
import { NotificationsModal } from '@/components/molecules/NotificationsModal';
import { SignOutConfirmationModal } from '@/components/molecules/SignOutConfirmationModal';
import { FeedbackModal } from '@/components/molecules/FeedbackModal';
import { colors, spacing, radius, shadows, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
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
  const { profile, fetchProfile, updateProfile, updateBodyMetrics, updateProfileField } = useUserProfileStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [isUnitsModalVisible, setIsUnitsModalVisible] = useState(false);
  const [isDobModalVisible, setIsDobModalVisible] = useState(false);
  const [isGenderModalVisible, setIsGenderModalVisible] = useState(false);
  const [isHeightModalVisible, setIsHeightModalVisible] = useState(false);
  const [isWeightModalVisible, setIsWeightModalVisible] = useState(false);
  const [isExperienceModalVisible, setIsExperienceModalVisible] = useState(false);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false);
  const [isTrainingDaysModalVisible, setIsTrainingDaysModalVisible] = useState(false);
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [isDeleteAccountModalVisible, setIsDeleteAccountModalVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { weightUnit, distanceUnit, sizeUnit, formatWeight, hapticsEnabled, setHapticsEnabled, smartSuggestionsEnabled, setSmartSuggestionsEnabled, themePreference, setThemePreference } = useSettingsStore();
  const { notificationsEnabled, configs } = useNotificationStore();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const { premiumOverride, setPremiumOverride } = useDevToolsStore();
  const backScale = useSharedValue(1);

  const handleBackPress = () => {
    backScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    triggerHaptic('selection');
    setTimeout(() => {
      backScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      router.back();
    }, 100);
  };

  const handlePreferencePress = (title: string) => {
    triggerHaptic('selection');

    if (title === 'Send Feedback') {
      setIsFeedbackModalVisible(true);
    } else {
      // TODO: Handle other preference items when implemented
    }
  };

  const handleSignOut = () => {
    triggerHaptic('warning');
    setIsSignOutModalVisible(true);
  };

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      // Navigation will be handled automatically by the auth state change
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      setIsSigningOut(false);
    }
  };

  const handleCloseSignOutModal = () => {
    if (!isSigningOut) {
      setIsSignOutModalVisible(false);
    }
  };

  const handleDeleteAccount = () => {
    triggerHaptic('warning');
    setIsDeleteAccountModalVisible(true);
  };

  const handleDeleteAccountConfirm = async () => {
    setIsDeletingAccount(true);
    try {
      // TODO: Implement account deletion logic
      // This should:
      // 1. Delete user data from profiles table
      // 2. Delete user data from workouts table
      // 3. Delete user from auth
      // 4. Sign out and redirect
      
      // For now, just show a placeholder
      Alert.alert('Coming Soon', 'Account deletion will be implemented in a future update.');
      setIsDeleteAccountModalVisible(false);
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Error', 'Failed to delete account. Please contact support.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleCloseDeleteAccountModal = () => {
    if (!isDeletingAccount) {
      setIsDeleteAccountModalVisible(false);
    }
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
    triggerHaptic('selection');
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

    if (totalInches === 0) return null;

    if (sizeUnit === 'cm') {
      const heightCm = Math.round(totalInches * 2.54);
      return `${heightCm} cm`;
    }

    return `${feet}' ${inches}"`;
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

  const genderLabels: Record<string, string> = {
    male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say',
  };
  const experienceLabels: Record<string, string> = {
    beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
  };
  const goalLabels: Record<string, string> = {
    'build-muscle': 'Build Muscle', 'lose-fat': 'Lose Fat', 'gain-strength': 'Gain Strength',
    'general-fitness': 'General Fitness', 'improve-endurance': 'Improve Endurance',
  };
  const equipmentLabels: Record<string, string> = {
    'full-gym': 'Full Gym', 'dumbbells-only': 'Dumbbells Only', 'bodyweight': 'Bodyweight Only',
    'home-gym': 'Home Gym', 'resistance-bands': 'Resistance Bands',
  };

  const formatDob = (dob: string | null | undefined) => {
    if (!dob) return 'Not set';
    // Parse ISO date string directly to avoid timezone offset issues
    const parts = dob.split('-');
    if (parts.length !== 3) return 'Not set';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary.bg }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.primary.bg }]}>
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
                size={22}
              />
            </Pressable>
          </Animated.View>
          <Text variant="heading3" color="primary" style={{ fontWeight: '600' }}>
            Settings
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={[styles.headerDivider, { backgroundColor: theme.text.tertiary }]} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Profile Info */}
        <View style={styles.profileHeader}>
          <View style={[
            profile?.firstName ? styles.avatarWithInitial : styles.avatar,
            { backgroundColor: theme.accent.orange, borderColor: theme.accent.orange }
          ]}>
            {profile?.firstName ? (
              <Text variant="heading2" style={styles.avatarInitialText}>
                {profile.firstName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <IconSymbol
                name="person"
                color="#FFFFFF"
                size={40}
              />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text variant="heading3" color="primary" style={{ fontWeight: '600' }}>
              {getUserDisplayName()}
            </Text>
            <Text variant="body" color="secondary" style={{ fontSize: 14 }}>
              {user?.email || 'No email'}
            </Text>
            <Text variant="caption" color="secondary" style={{ fontSize: 12 }}>
              {formatMemberSince(user?.created_at)}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.text.tertiary }]} />

        {/* Premium Section */}
        <View style={styles.section}>
          <Text variant="caption" color="secondary" style={styles.sectionTitle}>
            PREMIUM
          </Text>

          <View style={[styles.settingsGroup, { backgroundColor: theme.surface.card }]}>
            {!isPremiumLoading && !isPremium ? (
              <SettingsItem
                title="Go Premium"
                subtitle="Unlock advanced analytics and unlimited workouts"
                onPress={() => router.push('/premium' as any)}
              />
            ) : isPremiumLoading ? (
              <View style={styles.settingsItem}>
                <View style={styles.settingsItemContent}>
                  <Text variant="bodySemibold" color="primary" style={{ fontSize: 15 }}>
                    Loading Premium Status
                  </Text>
                  <Text variant="caption" color="secondary" style={{ fontSize: 13 }}>
                    Checking subscription details...
                  </Text>
                </View>
              </View>
            ) : (
              <SettingsItem
                title="Manage Subscription"
                subtitle="View billing history and manage your premium plan"
                onPress={() => router.push('/manage-subscription' as any)}
              />
            )}
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.text.tertiary }]} />

        {/* Account Preferences */}
        <View style={styles.section}>
          <Text variant="caption" color="secondary" style={styles.sectionTitle}>
            PREFERENCES
          </Text>

          <View style={[styles.settingsGroup, { backgroundColor: theme.surface.card }]}>
            <SettingsItem
              title="Name"
              subtitle={getUserDisplayName()}
              onPress={handleNameEdit}
              showDivider
            />
            <SettingsItem
              title="Notifications"
              subtitle={notificationsEnabled ? `${configs.length} reminder${configs.length !== 1 ? 's' : ''} active` : 'Set workout reminders'}
              onPress={() => {
                triggerHaptic('selection');
                setIsNotificationsModalVisible(true);
              }}
              showDivider
            />
            <SettingsItem
              title="Units of Measurement"
              subtitle={`${weightUnit === 'kg' ? 'kg' : 'lbs'} • ${distanceUnit === 'km' ? 'km' : 'mi'} • ${sizeUnit === 'cm' ? 'cm' : 'ft/in'}`}
              onPress={() => {
                triggerHaptic('selection');
                setIsUnitsModalVisible(true);
              }}
              showDivider
            />
            <ToggleSettingsItem
              title="Smart Set Suggestions"
              subtitle="Suggests weights and reps based on your training patterns"
              value={smartSuggestionsEnabled}
              onValueChange={(val) => {
                setSmartSuggestionsEnabled(val);
                triggerHaptic('selection');
              }}
              showDivider
            />
            <ToggleSettingsItem
              title="Haptic Feedback"
              subtitle={hapticsEnabled ? "Enabled" : "Disabled"}
              value={hapticsEnabled}
              onValueChange={(val) => {
                setHapticsEnabled(val);
                if (val) triggerHaptic('selection');
              }}
              showDivider
            />
            <ToggleSettingsItem
              title="Dark Mode"
              subtitle={themePreference === 'dark' ? "On" : "Off"}
              value={themePreference === 'dark'}
              onValueChange={(val) => {
                triggerHaptic('selection');
                setThemePreference(val ? 'dark' : 'light');
              }}
            />
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.text.tertiary }]} />

        {/* Profile Section */}
        <View style={styles.section}>
          <Text variant="caption" color="secondary" style={styles.sectionTitle}>
            PROFILE
          </Text>

          <View style={[styles.settingsGroup, { backgroundColor: theme.surface.card }]}>
            <SettingsItem
              title="Date of Birth"
              subtitle={formatDob(profile?.dateOfBirth)}
              onPress={() => { triggerHaptic('selection'); setIsDobModalVisible(true); }}
              showDivider
            />
            <SettingsItem
              title="Gender"
              subtitle={profile?.gender ? genderLabels[profile.gender] || 'Not set' : 'Not set'}
              onPress={() => { triggerHaptic('selection'); setIsGenderModalVisible(true); }}
              showDivider
            />
            <SettingsItem
              title="Height"
              subtitle={getFormattedHeight() || 'Not set'}
              onPress={() => { triggerHaptic('selection'); setIsHeightModalVisible(true); }}
              showDivider
            />
            <SettingsItem
              title="Weight"
              subtitle={profile?.weightLbs ? formatWeight(profile.weightLbs) : 'Not set'}
              onPress={() => { triggerHaptic('selection'); setIsWeightModalVisible(true); }}
              showDivider
            />
            <SettingsItem
              title="Experience Level"
              subtitle={profile?.experienceLevel ? experienceLabels[profile.experienceLevel] || 'Not set' : 'Not set'}
              onPress={() => { triggerHaptic('selection'); setIsExperienceModalVisible(true); }}
              showDivider
            />
            <SettingsItem
              title="Primary Goal"
              subtitle={profile?.primaryGoal ? goalLabels[profile.primaryGoal] || 'Not set' : 'Not set'}
              onPress={() => { triggerHaptic('selection'); setIsGoalModalVisible(true); }}
              showDivider
            />
            <SettingsItem
              title="Available Equipment"
              subtitle={profile?.availableEquipment ? equipmentLabels[profile.availableEquipment] || 'Not set' : 'Not set'}
              onPress={() => { triggerHaptic('selection'); setIsEquipmentModalVisible(true); }}
              showDivider
            />
            <SettingsItem
              title="Training Days per Week"
              subtitle={profile?.trainingDaysPerWeek ? `${profile.trainingDaysPerWeek} days` : 'Not set'}
              onPress={() => { triggerHaptic('selection'); setIsTrainingDaysModalVisible(true); }}
            />
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.text.tertiary }]} />

        {/* Support */}
        <View style={styles.section}>
          <Text variant="caption" color="secondary" style={styles.sectionTitle}>
            SUPPORT
          </Text>

          <View style={[styles.settingsGroup, { backgroundColor: theme.surface.card }]}>
            <SettingsItem
              title="Send Feedback"
              subtitle="Help us improve the app"
              onPress={() => handlePreferencePress('Send Feedback')}
              showDivider
            />
            <SettingsItem
              title="FAQ"
              subtitle="Frequently asked questions"
              onPress={() => handlePreferencePress('FAQ')}
              showDivider
            />
            <SettingsItem
              title="About"
              subtitle="App version and legal information"
              onPress={() => handlePreferencePress('About')}
            />
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.text.tertiary }]} />

        {/* Dev Tools (only in development) */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text variant="caption" color="secondary" style={styles.sectionTitle}>
              DEVELOPER TOOLS
            </Text>

            <View style={[styles.settingsGroup, { backgroundColor: theme.surface.card }]}>
              <Pressable
                style={styles.devToggleRow}
                onPress={() => {
                  triggerHaptic('selection');
                  const newValue = premiumOverride === 'premium' ? 'free' : 'premium';
                  setPremiumOverride(newValue);
                }}
              >
                <View style={styles.devToggleInfo}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySemibold" color="primary">Premium Status</Text>
                    <Text variant="caption" color="secondary" style={{ fontSize: 13 }}>
                      {premiumOverride === 'premium' ? 'Premium' : 'Free'}
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
        )}

        <View style={[styles.sectionDivider, { backgroundColor: theme.text.tertiary }]} />

        {/* Account */}
        <View style={styles.section}>
          <Text variant="caption" color="secondary" style={styles.sectionTitle}>
            ACCOUNT
          </Text>

          <View style={[styles.settingsGroup, { backgroundColor: theme.surface.card }]}>
            <SettingsItem
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              showDivider
            />
            <SettingsItem
              title="Delete Account"
              subtitle="Permanently delete your account and data"
              onPress={handleDeleteAccount}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomDivider, { backgroundColor: theme.text.tertiary }]} />

      <NameEditModal
        visible={isNameModalVisible}
        firstName={getCurrentFirstName()}
        lastName={getCurrentLastName()}
        onClose={handleCloseNameModal}
        onSave={handleNameSave}
      />

      <DateOfBirthModal
        visible={isDobModalVisible}
        currentValue={profile?.dateOfBirth}
        onSave={(iso) => updateProfileField('dateOfBirth', iso)}
        onClose={() => setIsDobModalVisible(false)}
      />

      <ProfilePickerModal
        visible={isGenderModalVisible}
        title="Gender"
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
        ]}
        selectedValue={profile?.gender}
        onSelect={(v) => updateProfileField('gender', v)}
        onClose={() => setIsGenderModalVisible(false)}
      />

      <HeightModal
        visible={isHeightModalVisible}
        heightFeet={profile?.heightFeet || 0}
        heightInches={profile?.heightInches || 0}
        onSave={(feet, inches) => updateBodyMetrics(feet, inches, profile?.weightLbs || 0)}
        onClose={() => setIsHeightModalVisible(false)}
      />

      <WeightModal
        visible={isWeightModalVisible}
        weightLbs={profile?.weightLbs || 0}
        onSave={(lbs) => updateBodyMetrics(profile?.heightFeet || 0, profile?.heightInches || 0, lbs)}
        onClose={() => setIsWeightModalVisible(false)}
      />

      <ProfilePickerModal
        visible={isExperienceModalVisible}
        title="Experience Level"
        options={[
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
        ]}
        selectedValue={profile?.experienceLevel}
        onSelect={(v) => updateProfileField('experienceLevel', v)}
        onClose={() => setIsExperienceModalVisible(false)}
      />

      <ProfilePickerModal
        visible={isGoalModalVisible}
        title="Primary Goal"
        options={[
          { value: 'build-muscle', label: 'Build Muscle' },
          { value: 'lose-fat', label: 'Lose Fat' },
          { value: 'gain-strength', label: 'Gain Strength' },
          { value: 'general-fitness', label: 'General Fitness' },
          { value: 'improve-endurance', label: 'Improve Endurance' },
        ]}
        selectedValue={profile?.primaryGoal}
        onSelect={(v) => updateProfileField('primaryGoal', v)}
        onClose={() => setIsGoalModalVisible(false)}
      />

      <ProfilePickerModal
        visible={isEquipmentModalVisible}
        title="Available Equipment"
        options={[
          { value: 'full-gym', label: 'Full Gym' },
          { value: 'dumbbells-only', label: 'Dumbbells Only' },
          { value: 'bodyweight', label: 'Bodyweight Only' },
          { value: 'home-gym', label: 'Home Gym' },
          { value: 'resistance-bands', label: 'Resistance Bands' },
        ]}
        selectedValue={profile?.availableEquipment}
        onSelect={(v) => updateProfileField('availableEquipment', v)}
        onClose={() => setIsEquipmentModalVisible(false)}
      />

      <ProfilePickerModal
        visible={isTrainingDaysModalVisible}
        title="Training Days per Week"
        options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: `${n} day${n > 1 ? 's' : ''}` }))}
        selectedValue={profile?.trainingDaysPerWeek}
        onSelect={(v) => updateProfileField('trainingDaysPerWeek', v)}
        onClose={() => setIsTrainingDaysModalVisible(false)}
      />

      <UnitsModal
        visible={isUnitsModalVisible}
        onClose={() => setIsUnitsModalVisible(false)}
      />

      <NotificationsModal
        visible={isNotificationsModalVisible}
        onClose={() => setIsNotificationsModalVisible(false)}
      />

      <SignOutConfirmationModal
        visible={isSignOutModalVisible}
        onClose={handleCloseSignOutModal}
        onConfirm={handleSignOutConfirm}
        isLoading={isSigningOut}
      />

      <FeedbackModal
        visible={isFeedbackModalVisible}
        onClose={() => setIsFeedbackModalVisible(false)}
      />

      <DeleteAccountConfirmationModal
        visible={isDeleteAccountModalVisible}
        onClose={handleCloseDeleteAccountModal}
        onConfirm={handleDeleteAccountConfirm}
        isLoading={isDeletingAccount}
      />
    </SafeAreaView>
  );
};

interface SettingsItemProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  showDivider?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ title, subtitle, onPress, showDivider }) => {
  const { theme } = useTheme();

  return (
    <>
      <Pressable
        onPress={() => {
          triggerHaptic('selection');
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [
          styles.settingsItem,
          { backgroundColor: pressed ? theme.surface.elevated : 'transparent' }
        ]}
      >
        <View style={styles.settingsItemContent}>
          <Text variant="bodySemibold" color="primary" style={{ fontSize: 15 }}>
            {title}
          </Text>
          <Text variant="caption" color="secondary" style={{ fontSize: 13 }}>
            {subtitle}
          </Text>
        </View>
        <IconSymbol
          name="chevron-right"
          color={theme.text.tertiary}
          size={18}
        />
      </Pressable>
      {showDivider && (
        <View style={[styles.settingsItemDivider, { backgroundColor: theme.surface.elevated }]} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  headerContainer: {
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWithInitial: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionDivider: {
    height: 1,
    marginVertical: spacing.lg,
    opacity: 0.15,
  },
  headerDivider: {
    height: 1,
    opacity: 0.15,
  },
  bottomDivider: {
    height: 1,
    opacity: 0.15,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  settingsGroup: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
  },
  settingsItemDivider: {
    height: 0.5,
    marginLeft: spacing.lg,
    opacity: 0.5,
  },
  settingsItemContent: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
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
  devToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    flex: 1,
  },
});

interface ToggleSettingsItemProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showDivider?: boolean;
}

const ToggleSettingsItem: React.FC<ToggleSettingsItemProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
  showDivider
}) => {
  const { theme } = useTheme();

  return (
    <>
      <View style={styles.settingsItem}>
        <View style={styles.settingsItemContent}>
          <Text variant="bodySemibold" color="primary" style={{ fontSize: 15 }}>
            {title}
          </Text>
          <Text variant="caption" color="secondary" style={{ fontSize: 13 }}>
            {subtitle}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.surface.subtle, true: theme.accent.orange }}
          thumbColor={'#FFFFFF'}
          ios_backgroundColor={theme.surface.subtle}
        />
      </View>
      {showDivider && (
        <View style={[styles.settingsItemDivider, { backgroundColor: theme.surface.elevated }]} />
      )}
    </>
  );
};

interface DeleteAccountConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const DeleteAccountConfirmationModal: React.FC<DeleteAccountConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <View style={modalStyles.overlay}>
      <View style={[modalStyles.container, { backgroundColor: theme.surface.card }]}>
        <View style={modalStyles.header}>
          <IconSymbol name="warning" size={32} color="#FF3B30" />
          <Text variant="heading3" color="primary" style={{ marginTop: spacing.md }}>
            Delete Account
          </Text>
        </View>

        <View style={modalStyles.content}>
          <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
            This action cannot be undone. Deleting your account will permanently remove:
          </Text>
          
          <View style={modalStyles.warningList}>
            <Text variant="body" color="secondary" style={modalStyles.warningItem}>
              • All your workout data and history
            </Text>
            <Text variant="body" color="secondary" style={modalStyles.warningItem}>
              • Personal profile information
            </Text>
            <Text variant="body" color="secondary" style={modalStyles.warningItem}>
              • Premium subscription (if active)
            </Text>
            <Text variant="body" color="secondary" style={modalStyles.warningItem}>
              • All app preferences and settings
            </Text>
          </View>

          <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
            Are you sure you want to continue?
          </Text>
        </View>

        <View style={modalStyles.actions}>
          <Pressable
            style={[modalStyles.button, modalStyles.cancelButton, { backgroundColor: theme.surface.elevated }]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text variant="bodySemibold" color="primary">
              Cancel
            </Text>
          </Pressable>

          <Pressable
            style={[modalStyles.button, modalStyles.deleteButton, { backgroundColor: '#FF3B30' }]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text variant="bodySemibold" style={{ color: '#FFFFFF' }}>
                Delete Account
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    maxWidth: 400,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  content: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  warningList: {
    gap: spacing.xs,
    marginVertical: spacing.md,
  },
  warningItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.surface.elevated,
  },
  deleteButton: {},
});

export default ProfileModal;
