import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, radius, sizing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export default function SignupScreen() {
    const router = useRouter();
    const setJustSignedUp = useAuthStore((state) => state.setJustSignedUp);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
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
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    },
                },
            });

            if (error) throw error;

            if (data.session) {
                // User is signed in automatically — mark as just signed up and send to onboarding
                setJustSignedUp(true);
                router.replace('/onboarding');
            } else {
                // Email confirmation required
                // Mark as just signed up so they see onboarding after confirming email and logging in
                setJustSignedUp(true);
                Alert.alert(
                    'Success',
                    'Please check your email to confirm your account.',
                    [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
                );
            }
        } catch (error: any) {
            Alert.alert('Signup Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join Hercules and begin your fitness journey</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.nameRow}>
                        <View style={[styles.inputGroup, styles.nameInput]}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="First name"
                                placeholderTextColor={colors.text.tertiary}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={[styles.inputGroup, styles.nameInput]}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Last name"
                                placeholderTextColor={colors.text.tertiary}
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.text.tertiary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Create a password"
                            placeholderTextColor={colors.text.tertiary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm your password"
                            placeholderTextColor={colors.text.tertiary}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Link href="/auth/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Sign In</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary.bg,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    header: {
        marginBottom: spacing.xl,
        alignItems: 'center',
    },
    title: {
        ...typography.heading1,
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    nameRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    nameInput: {
        flex: 1,
    },
    label: {
        ...typography.labelMedium,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    input: {
        height: sizing.inputHeight,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        fontSize: 16,
        color: colors.text.primary,
        backgroundColor: colors.surface.card,
    },
    button: {
        height: sizing.buttonLG,
        backgroundColor: colors.accent.primary,
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
        shadowColor: colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        ...typography.bodySemibold,
        color: '#fff',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    footerText: {
        ...typography.body,
        color: colors.text.secondary,
    },
    linkText: {
        ...typography.bodySemibold,
        color: colors.accent.primary,
    },
});
