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
import { colors, spacing, radius, shadows, sizing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { supabaseClient } from '@/lib/supabaseClient';

const ProfileModal: React.FC = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string; full_name: string } | null>(null);
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

  // Fetch user profile data - prefer metadata, fallback to DB
  useEffect(() => {
    const syncProfile = async () => {
      if (!user) return;
      
      const meta = user.user_metadata;
      
      // If we have names in metadata, use them (Source of Truth)
      if (meta?.first_name || meta?.last_name || meta?.full_name) {
        setUserProfile({
          first_name: meta.first_name || '',
          last_name: meta.last_name || '',
          full_name: meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim()
        });
        return;
      }

      // Fallback to DB only if metadata is missing
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name, full_name')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
        
        if (data) {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    syncProfile();
  }, [user]);

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
    // 1. Prefer local state (optimistic updates + synced data)
    if (userProfile?.full_name) {
      return userProfile.full_name;
    }
    if (userProfile?.first_name || userProfile?.last_name) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
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
    // Prefer metadata first as it's the most reliable source of truth
    if (user?.user_metadata?.first_name) return user.user_metadata.first_name;
    if (userProfile?.first_name) return userProfile.first_name;
    return '';
  };

  const getCurrentLastName = () => {
    // Prefer metadata first as it's the most reliable source of truth
    if (user?.user_metadata?.last_name) return user.user_metadata.last_name;
    if (userProfile?.last_name) return userProfile.last_name;
    return '';
  };

  const handleNameSave = (firstName: string, lastName: string) => {
    // Update local state immediately for responsive UI
    setUserProfile({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
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
              onPress={handleSignOut}
              disabled={isSigningOut}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              {isSigningOut ? (
                <ActivityIndicator color={colors.accent.red} />
              ) : (
                <>
                  <IconSymbol
                    name="logout"
                    color={colors.accent.red}
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
  const scale = useSharedValue(1);

  return (
    <Animated.View style={{ transform: [{ scale: scale.value }] }}>
      <Pressable
        style={styles.preferenceItem}
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
    paddingTop: spacing.xl + spacing.sm,
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
