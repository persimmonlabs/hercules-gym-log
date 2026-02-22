/**
 * SignupSlide
 * Account creation screen with social auth (Google/Apple) and email sign-up.
 * Social buttons are platform-aware: Apple only shown on iOS.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Text } from '@/components/atoms/Text';
import { SocialAuthButtons } from '@/components/molecules/SocialAuthButtons';
import { spacing, radius, sizing } from '@/constants/theme';
import { lt, slideStyles, SCREEN_WIDTH } from '@/constants/onboarding';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/providers/AuthProvider';
import { triggerHaptic } from '@/utils/haptics';

interface SignupSlideProps {
  onSignupComplete: (firstName: string, lastName: string) => void;
}

export const SignupSlide: React.FC<SignupSlideProps> = ({ onSignupComplete }) => {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const handleEmailSignup = useCallback(async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error, data } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });
      if (error) throw error;
      if (data.session) {
        triggerHaptic('success');
        onSignupComplete(firstName, lastName);
      } else {
        Alert.alert('Check Your Email', 'Please confirm your email address to complete registration.');
      }
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, email, password, confirmPassword, onSignupComplete]);

  const handleGoogle = useCallback(async () => {
    setSocialLoading(true);
    try {
      await signInWithGoogle();
      triggerHaptic('success');
      onSignupComplete('', '');
    } catch (error: any) {
      if (!error.message?.includes('dismiss')) {
        Alert.alert('Google Sign In Failed', error.message);
      }
    } finally {
      setSocialLoading(false);
    }
  }, [signInWithGoogle, onSignupComplete]);

  const handleApple = useCallback(async () => {
    setSocialLoading(true);
    try {
      const rawNonce = Array.from(Crypto.getRandomBytes(32))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error('No identity token');
      await signInWithApple(credential.identityToken, rawNonce);
      triggerHaptic('success');
      const appleName = credential.fullName?.givenName || '';
      const appleLast = credential.fullName?.familyName || '';
      onSignupComplete(appleName, appleLast);
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Failed', error.message);
      }
    } finally {
      setSocialLoading(false);
    }
  }, [signInWithApple, onSignupComplete]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[slideStyles.slide, { width: SCREEN_WIDTH }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>
          Create Your Account
        </Text>
        <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>
          Save your progress and unlock the full experience
        </Text>

        <SocialAuthButtons
          onGooglePress={handleGoogle}
          onApplePress={handleApple}
          loading={socialLoading}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: lt.border.light }]} />
          <Text variant="caption" style={{ color: lt.text.tertiary }}>or sign up with email</Text>
          <View style={[styles.dividerLine, { backgroundColor: lt.border.light }]} />
        </View>

        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ color: lt.text.secondary, marginBottom: spacing.xs }}>First Name</Text>
            <TextInput
              style={[styles.input, { borderColor: lt.border.light, color: lt.text.primary, backgroundColor: lt.surface.card }]}
              placeholder="First" placeholderTextColor={lt.text.tertiary}
              value={firstName} onChangeText={setFirstName} autoCapitalize="words"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ color: lt.text.secondary, marginBottom: spacing.xs }}>Last Name</Text>
            <TextInput
              style={[styles.input, { borderColor: lt.border.light, color: lt.text.primary, backgroundColor: lt.surface.card }]}
              placeholder="Last" placeholderTextColor={lt.text.tertiary}
              value={lastName} onChangeText={setLastName} autoCapitalize="words"
            />
          </View>
        </View>

        <View>
          <Text variant="caption" style={{ color: lt.text.secondary, marginBottom: spacing.xs }}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: lt.border.light, color: lt.text.primary, backgroundColor: lt.surface.card }]}
            placeholder="Enter your email" placeholderTextColor={lt.text.tertiary}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          />
        </View>

        <View>
          <Text variant="caption" style={{ color: lt.text.secondary, marginBottom: spacing.xs }}>Password</Text>
          <TextInput
            style={[styles.input, { borderColor: lt.border.light, color: lt.text.primary, backgroundColor: lt.surface.card }]}
            placeholder="Create a password" placeholderTextColor={lt.text.tertiary}
            value={password} onChangeText={setPassword} secureTextEntry
          />
        </View>

        <View>
          <Text variant="caption" style={{ color: lt.text.secondary, marginBottom: spacing.xs }}>Confirm Password</Text>
          <TextInput
            style={[styles.input, { borderColor: lt.border.light, color: lt.text.primary, backgroundColor: lt.surface.card }]}
            placeholder="Confirm your password" placeholderTextColor={lt.text.tertiary}
            value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.signupButton, { backgroundColor: lt.accent.primary }]}
          onPress={handleEmailSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text variant="bodySemibold" style={{ color: '#fff' }}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    height: sizing.inputHeight,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  signupButton: {
    height: sizing.buttonLG,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
