/**
 * Hercules AI Chat Screen
 * Full-screen AI chat interface with premium gating and action handling
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Platform,
  Pressable,
  ActivityIndicator,
  Keyboard,
  Text as RNText,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { ActionApprovalCard } from '@/components/molecules/ActionApprovalCard';
import { ChatUsageBanner } from '@/components/molecules/ChatUsageBanner';
import { TypingIndicator } from '@/components/molecules/TypingIndicator';
import { ChatHistoryModal } from '@/components/molecules/ChatHistoryModal';
import { CreditsExhaustedModal } from '@/components/molecules/CreditsExhaustedModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUserProfileStore } from '@/store/userProfileStore';
import { calculateAge } from '@/utils/date';
import { spacing, radius, typography, shadows } from '@/constants/theme';
import { triggerHaptic } from '@/utils/haptics';
import {
  sendChatMessage,
  submitActionDecision,
  fetchUsageStats,
  fetchChatMessages,
  purchaseCredits,
} from '@/services/herculesAIService';
import { sanitizeMessageForDisplay } from '@/utils/messageSanitizer';
import { usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { useSchedulesStore } from '@/store/schedulesStore';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useAppStatsForAI } from '@/hooks/useAppStatsForAI';
import type { ChatMessage, ActionProposal, UsageInfo, NavigationLink } from '@/types/herculesAI';

const HerculesAIScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const profile = useUserProfileStore((s) => s.profile);
  const userAge = calculateAge(profile?.dateOfBirth);
  const insets = useSafeAreaInsets();
  const appStats = useAppStatsForAI();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Flag: when true, the next onContentSizeChange will scrollToEnd
  const shouldScrollOnNextLayout = useRef(false);
  // Track the FlatList visible height for computing bottom padding
  const listLayoutHeight = useRef<number>(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionProposal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [animationCompleteIds, setAnimationCompleteIds] = useState<Set<string>>(new Set());
  const [creditsModalVisible, setCreditsModalVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [creditsNextReset, setCreditsNextReset] = useState<string>('');

  
  // Called when content size changes - if a scroll was requested, scrollToEnd
  const handleContentSizeChange = useCallback((_width: number, _height: number) => {
    if (shouldScrollOnNextLayout.current) {
      shouldScrollOnNextLayout.current = false;
      // Use multiple timeouts to ensure scroll sticks after layout adjustments
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 150);
    }
  }, []);

  // Keyboard handling with Reanimated
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      keyboardHeight.value = withTiming(e.endCoordinates.height - (insets.bottom || 0) + 60, {
        duration: Platform.OS === 'ios' ? 250 : 150,
        easing: Easing.out(Easing.cubic),
      });
      // Don't auto-scroll or reset here - let user control scroll behavior
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.value = withTiming(0, {
        duration: Platform.OS === 'ios' ? 250 : 150,
        easing: Easing.out(Easing.cubic),
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHeight]);

  const inputContainerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));


  useEffect(() => {
    if (isPremium && disclaimerAccepted) {
      loadUsage();
    }
  }, [isPremium, disclaimerAccepted]);

  const loadUsage = async () => {
    const { data } = await fetchUsageStats();
    if (data) {
      setUsage(data);
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    // CRITICAL: Clear any pending action when user types a new message
    // This removes the action buttons since user chose to continue conversation instead
    if (pendingAction) {
      console.log('[HerculesAI] User typed instead of clicking action buttons - clearing pending action');
      setPendingAction(null);
      
      // Also mark the action in messages as dismissed (not pending anymore)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.action?.status === 'pending'
            ? { ...msg, action: { ...msg.action, status: 'dismissed' as const } }
            : msg
        )
      );
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    triggerHaptic('light');

    // ALWAYS scroll user's message to the top of the chat window
    // The large bottom padding on the FlatList ensures scrollToEnd places the message at the top
    shouldScrollOnNextLayout.current = true;

    const { data, error } = await sendChatMessage(userMessage.content, sessionId ?? undefined, appStats);

    if (error) {
      // DEBUG: Log full error details
      console.error('[HerculesAI] Error details:', {
        message: error.message,
        code: error.code,
        fullError: JSON.stringify(error)
      });
      
      if (error.code === 'CREDITS_EXHAUSTED') {
        setCreditsNextReset(error.nextResetAt || usage?.nextResetAt || '');
        setCreditsModalVisible(true);
        const exhaustedMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error.message,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, exhaustedMessage]);
      } else if (error.code === 'RATE_LIMITED') {
        const rateLimitMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'You\'re sending messages too quickly. Please wait a moment and try again.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, rateLimitMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong. Please try again in a moment.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } else if (data) {
      // CRITICAL DEBUG: Log what the backend returned
      console.log('[HerculesAI] Backend response:', {
        sessionId: data.sessionId,
        hasAction: !!data.action,
        actionType: data.action?.actionType,
        messageLength: data.message?.length,
      });

      if (!sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        // CRITICAL: Sanitize message to ensure no JSON is ever shown to users
        content: sanitizeMessageForDisplay(data.message),
        createdAt: new Date().toISOString(),
        action: data.action
          ? { ...data.action, status: 'pending' as const }
          : null,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setNewMessageIds((prev) => new Set(prev).add(assistantMessage.id));

      if (data.action) {
        console.log('[HerculesAI] Setting pendingAction:', data.action.actionType);
        setPendingAction({ ...data.action, status: 'pending' });
      } else {
        console.log('[HerculesAI] NO ACTION in response - buttons will NOT show');
      }

      loadUsage();
    }

    setIsLoading(false);
  }, [inputText, isLoading, sessionId, pendingAction]);

  const handleActionDecision = useCallback(
    async (decision: 'approve' | 'reject', actionFromCard?: ActionProposal | null) => {
      // CRITICAL FIX: Use action passed from card if pendingAction is null
      const actionToUse = actionFromCard || pendingAction;
      
      console.log('[HerculesAI] handleActionDecision called:', {
        decision,
        hasPendingAction: !!pendingAction,
        hasActionFromCard: !!actionFromCard,
        actionId: actionToUse?.id,
        actionType: actionToUse?.actionType,
      });
      
      if (!actionToUse) {
        console.error('[HerculesAI] CRITICAL: No action available for decision!');
        return;
      }

      setActionLoading(true);
      triggerHaptic(decision === 'approve' ? 'success' : 'light');

      // Mark the action in the message as no longer pending
      setMessages((prev) =>
        prev.map((msg) =>
          msg.action?.id === actionToUse.id
            ? { ...msg, action: { ...msg.action, status: decision === 'approve' ? 'approved' : 'rejected' } }
            : msg
        )
      );

      if (decision === 'reject') {
        // CRITICAL FIX: Notify backend of rejection so the ai_action_requests row
        // is properly marked as 'rejected' (prevents orphaned pending requests)
        submitActionDecision(actionToUse.id, 'reject').catch((err) => {
          console.warn('[HerculesAI] Failed to send rejection to backend (non-critical):', err);
        });

        // Show feedback prompt for rejection
        const feedbackMessage: ChatMessage = {
          id: `feedback-prompt-${Date.now()}`,
          role: 'assistant',
          content: "No problem! What would you like me to change? You can ask for different exercises, a different split, or anything else.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, feedbackMessage]);
        setNewMessageIds((prev) => new Set(prev).add(feedbackMessage.id));
        setPendingAction(null);
        setActionLoading(false);
        // Don't scroll - typing animation will handle it
        return;
      }

      console.log('[HerculesAI] Submitting action decision:', {
        actionId: actionToUse.id,
        actionType: actionToUse.actionType,
        decision,
      });

      const { data, error } = await submitActionDecision(actionToUse.id, decision);

      console.log('[HerculesAI] Action decision response:', {
        hasData: !!data,
        hasError: !!error,
        status: data?.status,
        summary: data?.summary,
        errorMessage: error?.message,
      });

      if (data) {
        // Build navigation link based on action type + created item ID
        let navLink: NavigationLink | null = null;
        if (data.status === 'executed') {
          const createdId = (data.data as Record<string, unknown>)?.id as string | undefined;
          const actionType = actionToUse.actionType;
          const returnTo = encodeURIComponent('/hercules-ai');
          if (actionType === 'create_workout_template' && createdId) {
            navLink = { label: 'View Workout', route: '/(tabs)/create-workout', params: { planId: createdId, returnTo } };
          } else if (actionType === 'create_program_plan' && createdId) {
            navLink = { label: 'View Plan', route: '/(tabs)/edit-plan', params: { planId: createdId, returnTo } };
          } else if (actionType === 'create_schedule') {
            navLink = { label: 'View Schedule', route: '/(tabs)/schedule-setup', params: { mode: 'edit', returnTo } };
          }
        }

        const resultMessage: ChatMessage = {
          id: `action-result-${Date.now()}`,
          role: 'assistant',
          // CRITICAL: Sanitize message to ensure no JSON is ever shown to users
          content: sanitizeMessageForDisplay(data.summary),
          createdAt: new Date().toISOString(),
          navigationLink: navLink,
        };
        setMessages((prev) => [...prev, resultMessage]);
        setNewMessageIds((prev) => new Set(prev).add(resultMessage.id));

        // Refresh relevant stores after successful action execution
        if (decision === 'approve' && data.status === 'executed') {
          const actionType = actionToUse.actionType;
          console.log('[HerculesAI] Action executed successfully, refreshing stores for:', actionType);

          try {
            if (actionType === 'create_workout_template') {
              await usePlansStore.getState().hydratePlans();
              console.log('[HerculesAI] Workout templates refreshed');
            } else if (actionType === 'create_program_plan') {
              await useProgramsStore.getState().hydratePrograms();
              await usePlansStore.getState().hydratePlans();
              // Also hydrate active schedule in case setActiveSchedule was included
              await useActiveScheduleStore.getState().hydrateActiveSchedule();
              console.log('[HerculesAI] Programs, plans, and active schedule refreshed');
            } else if (actionType === 'create_schedule') {
              await useActiveScheduleStore.getState().hydrateActiveSchedule();
              await useSchedulesStore.getState().hydrateSchedules();
              console.log('[HerculesAI] Active schedule and schedules refreshed');
            } else if (actionType === 'add_workout_session') {
              await useWorkoutSessionsStore.getState().hydrateWorkouts();
              console.log('[HerculesAI] Workout sessions refreshed');
            }
          } catch (hydrateError) {
            console.error('[HerculesAI] Store hydration failed:', hydrateError);
          }
        } else if (data.status !== 'executed') {
          console.warn('[HerculesAI] Action was not executed, status:', data.status);
        }
      } else if (error) {
        console.error('[HerculesAI] Action execution failed:', error);
        const errorMessage: ChatMessage = {
          id: `action-error-${Date.now()}`,
          role: 'assistant',
          content: "Something went wrong while processing that. Please try again or rephrase your request.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setNewMessageIds((prev) => new Set(prev).add(errorMessage.id));
      }

      setPendingAction(null);
      setActionLoading(false);
      // Don't scroll - typing animation will handle it
    },
    [pendingAction]
  );

  const handleBack = () => {
    triggerHaptic('light');
    router.back();
  };

  const handleAcceptDisclaimer = () => {
    setDisclaimerAccepted(true);
    triggerHaptic('light');
  };

  const handleUpgrade = () => {
    triggerHaptic('light');
    router.push('/premium');
  };

  const handleOpenHistory = () => {
    triggerHaptic('light');
    setHistoryModalVisible(true);
  };

  const handlePurchaseCredits = useCallback(async () => {
    setIsPurchasing(true);
    triggerHaptic('light');

    const { data, error } = await purchaseCredits(100);

    if (data) {
      setUsage(data);
      setCreditsModalVisible(false);

      const confirmMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: '100 AI credits have been added to your account. You can continue chatting!',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
      setNewMessageIds((prev) => new Set(prev).add(confirmMessage.id));
    } else if (error) {
      const errMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Credit purchase failed. Please try again in a moment.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    }

    setIsPurchasing(false);
  }, []);

  const handleSelectSession = async (selectedSessionId: string) => {
    setSessionId(selectedSessionId);
    setMessages([]);
    setNewMessageIds(new Set());
    setIsLoading(true);

    const { data } = await fetchChatMessages(selectedSessionId);
    if (data) {
      const loadedMessages: ChatMessage[] = data.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      }));
      setMessages(loadedMessages);
    }

    setIsLoading(false);
    loadUsage();
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setNewMessageIds(new Set());
    setAnimationCompleteIds(new Set());
    setPendingAction(null);
  };

  const handleAnimationComplete = useCallback((messageId: string) => {
    setAnimationCompleteIds((prev) => new Set(prev).add(messageId));
    // Don't scroll here - chunked scroll during typing handles positioning
  }, []);

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isAnimationComplete = animationCompleteIds.has(item.id) || !newMessageIds.has(item.id);
    
    // FIXED: Only show action card AFTER animation completes for smoother UX
    const hasAction = item.action && item.action.status === 'pending';
    const showActionCard = hasAction && isAnimationComplete;
    
    // Determine action label to append to message content
    const ACTION_LABELS: Record<string, string> = {
      create_workout_template: 'Create this workout?',
      add_workout_session: 'Log this workout?',
      update_user_profile: 'Update your profile?',
      update_profile: 'Update your profile?',
      create_plan: 'Create this plan?',
      create_program_plan: 'Create this program?',
      create_schedule: 'Create this schedule?',
    };

    let displayContent = item.content;
    if (showActionCard && item.action) {
      const label = ACTION_LABELS[item.action.actionType] || 'Proceed with this action?';
      displayContent = `${item.content}\n\n**${label}**`;
    }

    return (
      <>
        <ChatMessageBubble
          content={displayContent}
          role={item.role}
          index={index}
          isNewMessage={newMessageIds.has(item.id)}
          onAnimationComplete={() => handleAnimationComplete(item.id)}
          onTypingProgress={undefined} // Auto-scroll during AI response disabled
        />
        {showActionCard && (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
            <ActionApprovalCard
              action={item.action!}
              onApprove={() => handleActionDecision('approve', item.action)}
              onReject={() => handleActionDecision('reject', item.action)}
              isLoading={actionLoading}
            />
          </View>
        )}
        {item.navigationLink && isAnimationComplete && (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                if (item.navigationLink!.params) {
                  router.push({
                    pathname: item.navigationLink!.route as any,
                    params: item.navigationLink!.params,
                  });
                } else {
                  router.push(item.navigationLink!.route as any);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                alignSelf: 'flex-start',
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                backgroundColor: theme.surface.card,
                borderWidth: 1,
                borderColor: theme.border.medium,
              }}
            >
              <Ionicons name="open-outline" size={16} color={theme.text.primary} />
              <RNText style={{ color: theme.text.primary, fontSize: 14, fontWeight: '600' }}>
                {item.navigationLink!.label}
              </RNText>
            </Pressable>
          </View>
        )}
      </>
    );
  };

  const gradientColors: [string, string] = [theme.primary.bg, theme.surface.card];

  if (isPremiumLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.primary.bg }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={12}>
              <IconSymbol name="arrow-back" size={24} color={theme.text.primary} />
            </Pressable>
            <Text variant="heading3" color="primary" style={styles.headerTitle}>
              Hercules AI
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.premiumGate}>
            <View style={styles.premiumGateContent}>
              <View style={styles.premiumLockBadge}>
                <Ionicons name="lock-closed" size={28} color={theme.accent.orange} />
              </View>
              <Text variant="heading3" color="primary" style={{ textAlign: 'center' }}>
                Hercules AI
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
                Get personalized workout advice, track your progress, and let AI help you reach your fitness goals.
              </Text>
                            <Pressable
                style={[styles.premiumCtaButton, { backgroundColor: theme.accent.orange }]}
                onPress={handleUpgrade}
              >
                <IconSymbol name="star" size={16} color="#FFFFFF" />
                <Text variant="bodySemibold" style={{ color: '#FFFFFF' }}>
                  Unlock with Pro
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Age gate: no birthdate set
  if (!profile?.dateOfBirth) {
    return (
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={12}>
              <IconSymbol name="arrow-back" size={24} color={theme.text.primary} />
            </Pressable>
            <Text variant="heading3" color="primary" style={styles.headerTitle}>
              Hercules AI
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.premiumGate}>
            <View style={styles.premiumGateContent}>
              <View style={styles.premiumLockBadge}>
                <Ionicons name="calendar-outline" size={28} color={theme.accent.orange} />
              </View>
              <Text variant="heading3" color="primary" style={{ textAlign: 'center' }}>
                Date of Birth Required
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
                To use Hercules AI, please set your date of birth in Profile Settings.
                This feature is available to users 18 and older.
              </Text>
              <Pressable
                style={[styles.premiumCtaButton, { backgroundColor: theme.accent.orange }]}
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/modals/profile');
                }}
              >
                <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
                <Text variant="bodySemibold" style={{ color: '#FFFFFF' }}>
                  Go to Profile Settings
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Age gate: under 18
  if (userAge !== null && userAge < 18) {
    return (
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={12}>
              <IconSymbol name="arrow-back" size={24} color={theme.text.primary} />
            </Pressable>
            <Text variant="heading3" color="primary" style={styles.headerTitle}>
              Hercules AI
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.premiumGate}>
            <View style={styles.premiumGateContent}>
              <View style={styles.premiumLockBadge}>
                <Ionicons name="shield-outline" size={28} color={theme.accent.orange} />
              </View>
              <Text variant="heading3" color="primary" style={{ textAlign: 'center' }}>
                Age Restriction
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
                Hercules AI is only available to users 18 years of age or older.
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (!disclaimerAccepted) {
    return (
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View>
            <View style={styles.header}>
              <Pressable onPress={handleBack} hitSlop={12}>
                <IconSymbol name="arrow-back" size={24} color={theme.text.primary} />
              </Pressable>
              <View style={styles.headerTitleContainer}>
                <Text variant="heading3" color="primary" style={styles.headerTitle}>
                  Hercules AI
                </Text>
              </View>
              <View style={{ width: 24 }} />
            </View>
            <View style={[styles.headerBorder, { backgroundColor: theme.text.tertiary }]} />
          </View>
          <View style={styles.disclaimerContainer}>
            <SurfaceCard tone="card" padding="xl">
              <Text variant="heading3" color="primary" style={styles.disclaimerTitle}>
                Before You Start
              </Text>
              <Text variant="body" color="secondary" style={styles.disclaimerText}>
                Hercules AI is designed to help with your fitness journey by providing
                personalized workout suggestions and tracking insights.
              </Text>
              <Text variant="body" color="secondary" style={styles.disclaimerText}>
                Please note that AI suggestions are not a substitute for professional
                medical or fitness advice. Always consult with a qualified professional
                before making significant changes to your exercise routine.
              </Text>
              <Text variant="caption" color="tertiary" style={styles.disclaimerNote}>
                By continuing, you acknowledge that you understand these limitations.
              </Text>
              <Button
                label="I Understand"
                variant="primary"
                size="lg"
                onPress={handleAcceptDisclaimer}
                style={styles.disclaimerButton}
              />
            </SurfaceCard>
          </View>
        </View>
      </LinearGradient>
    );
  }


  // Bottom padding = nearly the full visible height of the FlatList
  // This ensures scrollToEnd places the last message at the TOP of the visible area
  // (the large padding fills the rest of the screen below the message)
  const inputAreaHeight = Math.max(listLayoutHeight.current - 60, 400);

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View>
          <View style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={12}>
              <IconSymbol name="arrow-back" size={24} color={theme.text.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text variant="heading3" color="primary" style={styles.headerTitle}>
                Hercules AI
              </Text>
            </View>
            <Pressable
              onPress={handleOpenHistory}
              hitSlop={12}
            >
              <IconSymbol name="menu" size={24} color={theme.text.primary} />
            </Pressable>
          </View>
          <View style={[styles.headerBorder, { backgroundColor: theme.text.tertiary }]} />
        </View>

        <Animated.FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageListContainer}
          contentContainerStyle={[styles.messageList, { paddingBottom: inputAreaHeight }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Track content size changes and handle pending scroll
          onContentSizeChange={handleContentSizeChange}
          onLayout={(event) => {
            listLayoutHeight.current = event.nativeEvent.layout.height;
          }}
          ListFooterComponent={<TypingIndicator isVisible={isLoading} />}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
              <Text variant="heading2" color="primary" style={styles.emptyTitle}>
                Hey there!
              </Text>
              <Text variant="body" color="secondary" style={styles.emptyText}>
                I&apos;m Hercules, your AI fitness assistant. Ask me anything about
                workouts, form, recovery, or let me help you plan your next session.
              </Text>
            </Animated.View>
          }
        />

        <Animated.View
          style={[
            styles.inputContainerWrapper,
            inputContainerAnimatedStyle,
          ]}
        >
          <View style={[styles.headerBorder, { backgroundColor: theme.text.tertiary }]} />
          <View
            style={[
              styles.inputContainer,
              {
                paddingBottom: insets.bottom || spacing.xs,
                backgroundColor: theme.primary.bg,
              },
            ]}
          >
            <View style={[styles.inputWrapper, { backgroundColor: theme.surface.card, borderWidth: 1.5, borderColor: theme.accent.primary, ...shadows.sm }]} >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.text.primary }]}
                placeholder="Ask Hercules anything..."
                placeholderTextColor={theme.text.tertiary}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  // Don't auto-scroll or reset on focus - let user control scroll
                }}
                multiline
                maxLength={1000}
                editable={!isLoading}
              />
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      inputText.trim() && !isLoading
                        ? theme.accent.primary
                        : theme.surface.card,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.text.primary} />
                ) : (
                  <IconSymbol
                    name="arrow-upward"
                    size={20}
                    color={inputText.trim() ? '#FFFFFF' : theme.text.tertiary}
                  />
                )}
              </Pressable>
            </View>
          </View>
          {/* Background filler: extends below the input wrapper to cover the gap when keyboard pushes it up */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: -400, height: 400, backgroundColor: theme.primary.bg }} />
        </Animated.View>
      </View>
      <ChatHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />
      <CreditsExhaustedModal
        visible={creditsModalVisible}
        nextResetAt={creditsNextReset}
        onPurchase={handlePurchaseCredits}
        onDismiss={() => setCreditsModalVisible(false)}
        isPurchasing={isPurchasing}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  headerBorder: {
    height: 1,
    width: '100%',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  premiumGateContent: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 300,
  },
  premiumLockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  premiumCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  disclaimerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  disclaimerTitle: {
    marginBottom: spacing.md,
  },
  disclaimerText: {
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  disclaimerNote: {
    marginBottom: spacing.lg,
  },
  disclaimerButton: {
    marginTop: spacing.sm,
  },
  messageListContainer: {
    flex: 1,
  },
  messageList: {
    paddingTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  emptyTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  inputContainerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    maxHeight: 120,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});

export default HerculesAIScreen;
