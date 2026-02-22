/**
 * SocialAuthButtons
 * Platform-aware Google and Apple sign-in buttons.
 * Apple button only shown on iOS. Google shown on both platforms.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms/Text';
import { spacing, radius, sizing } from '@/constants/theme';
import { lt } from '@/constants/onboarding';

interface SocialAuthButtonsProps {
  onGooglePress: () => void;
  onApplePress: () => void;
  loading: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onGooglePress,
  onApplePress,
  loading,
}) => {
  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.socialButton, { backgroundColor: '#000000' }]}
          onPress={onApplePress}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text variant="bodySemibold" style={{ color: '#FFFFFF' }}>
                Continue with Apple
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.socialButton, styles.googleButton]}
        onPress={onGooglePress}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={lt.text.primary} size="small" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <Text variant="bodySemibold" style={{ color: lt.text.primary }}>
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm,
  },
  socialButton: {
    height: sizing.buttonLG,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: lt.border.medium,
  },
});
