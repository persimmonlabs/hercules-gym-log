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
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { NameEditModal } from '@/components/molecules/NameEditModal';
import { BodyMetricsModal } from '@/components/molecules/BodyMetricsModal';
import { UnitsModal } from '@/components/molecules/UnitsModal';
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
  const { profile, fetchProfile, updateProfile, updateBodyMetrics } = useUserProfileStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [isBodyMetricsModalVisible, setIsBodyMetricsModalVisible] = useState(false);
  const [isUnitsModalVisible, setIsUnitsModalVisible] = useState(false);
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [isDeleteAccountModalVisible, setIsDeleteAccountModalVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { weightUnit, distanceUnit, sizeUnit, formatWeight, hapticsEnabled, setHapticsEnabled } = useSettingsStore();
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
                icon="star"
                title="Go Premium"
                subtitle="Unlock advanced analytics and unlimited workouts"
                onPress={() => router.push('/premium' as any)}
              />
            ) : isPremiumLoading ? (
              <View style={styles.settingsItem}>
                <View style={styles.settingsItemIcon}>
                  <IconSymbol name="star" color={theme.accent.orange} size={22} />
                </View>
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
                icon="credit-card"
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
              icon="person"
              title="Name"
              subtitle={getUserDisplayName()}
              onPress={handleNameEdit}
              showDivider
            />
            <SettingsItem
              icon="notifications"
              title="Notifications"
              subtitle={notificationsEnabled ? `${configs.length} reminder${configs.length !== 1 ? 's' : ''} active` : 'Set workout reminders'}
              onPress={() => {
                triggerHaptic('selection');
                setIsNotificationsModalVisible(true);
              }}
              showDivider
            />
            <SettingsItem
              icon="straighten"
              title="Units of Measurement"
              subtitle={`${weightUnit === 'kg' ? 'kg' : 'lbs'} • ${distanceUnit === 'km' ? 'km' : 'mi'} • ${sizeUnit === 'cm' ? 'cm' : 'in'}`}
              onPress={() => {
                triggerHaptic('selection');
                setIsUnitsModalVisible(true);
              }}
              showDivider
            />
            <ToggleSettingsItem
              icon="vibration"
              title="Haptic Feedback"
              subtitle={hapticsEnabled ? "Enabled" : "Disabled"}
              value={hapticsEnabled}
              onValueChange={(val) => {
                setHapticsEnabled(val);
                if (val) triggerHaptic('selection');
              }}
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
              icon="feedback"
              title="Send Feedback"
              subtitle="Help us improve the app"
              onPress={() => handlePreferencePress('Send Feedback')}
              showDivider
            />
            <SettingsItem
              icon="question-mark-circle"
              title="FAQ"
              subtitle="Frequently asked questions"
              onPress={() => handlePreferencePress('FAQ')}
              showDivider
            />
            <SettingsItem
              icon="info"
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
                  <IconSymbol name="star" size={22} color={theme.accent.orange} />
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
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
              icon="logout"
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              showDivider
            />
            <SettingsItem
              icon="trash"
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
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  showDivider?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon, title, subtitle, onPress, showDivider }) => {
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
        <View style={styles.settingsItemIcon}>
          <IconSymbol
            name={icon}
            color={theme.accent.orange}
            size={22}
          />
        </View>
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
    marginLeft: spacing.lg + spacing.xl + spacing.md,
    opacity: 0.5,
  },
  settingsItemIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showDivider?: boolean;
}

const ToggleSettingsItem: React.FC<ToggleSettingsItemProps> = ({
  icon,
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
        <View style={styles.settingsItemIcon}>
          <IconSymbol
            name={icon}
            color={theme.accent.orange}
            size={22}
          />
        </View>
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
