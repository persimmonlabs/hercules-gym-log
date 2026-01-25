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
  NativeSyntheticEvent,
  NativeScrollEvent,
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

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { PremiumLock } from '@/components/atoms/PremiumLock';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { ActionApprovalCard } from '@/components/molecules/ActionApprovalCard';
import { ChatUsageBanner } from '@/components/molecules/ChatUsageBanner';
import { TypingIndicator } from '@/components/molecules/TypingIndicator';
import { ChatHistoryModal } from '@/components/molecules/ChatHistoryModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { spacing, radius, typography, shadows } from '@/constants/theme';
import { triggerHaptic } from '@/utils/haptics';
import {
  sendChatMessage,
  submitActionDecision,
  fetchUsageStats,
  fetchChatMessages,
} from '@/services/herculesAIService';
import { sanitizeMessageForDisplay } from '@/utils/messageSanitizer';
import { usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { useSchedulesStore } from '@/store/schedulesStore';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import type { ChatMessage, ActionProposal, UsageInfo } from '@/types/herculesAI';

/**
 * CRITICAL: Detects if a message looks like an action proposal that should have buttons.
 * This is a frontend safety net for when the AI forgets to include the action payload.
 */
const looksLikeActionProposal = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  
  // Check for confirmation questions that indicate a proposal
  const confirmationPatterns = [
    'would you like me to create',
    'would you like me to set up',
    'would you like me to schedule',
    'would you like me to log',
    'would you like me to add',
    'shall i create',
    'shall i set up',
    'want me to create',
    'ready to create',
    'create this for you',
    'set this up for you',
  ];
  
  return confirmationPatterns.some(pattern => lowerContent.includes(pattern));
};

/**
 * MissingActionFallback
 * Shows when message looks like a proposal but no action payload was included.
 * This prevents the infinite loop where user types "yes" and AI repeats.
 */
const MissingActionFallback: React.FC<{
  onRetry: () => void;
  onDismiss: () => void;
  isLoading: boolean;
  theme: any;
}> = ({ onRetry, onDismiss, isLoading, theme }) => {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border.light,
      backgroundColor: theme.surface.elevated,
    }}>
      <Text variant="caption" color="secondary" style={{ flex: 1 }}>
        Ready to create?
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable
          onPress={onDismiss}
          disabled={isLoading}
          style={[{
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.border.medium,
            opacity: isLoading ? 0.5 : 1,
          }]}
        >
          <Text variant="bodySemibold" color="secondary">
            No thanks
          </Text>
        </Pressable>
        <Pressable
          onPress={onRetry}
          disabled={isLoading}
          style={[{
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: theme.accent.primary,
            opacity: isLoading ? 0.5 : 1,
          }]}
        >
          <Text variant="bodySemibold" color="onAccent">
            Yes, create it
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const HerculesAIScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Track if user has manually scrolled - only reset when user sends a new message
  const userHasScrolled = useRef(false);
  
  // CRITICAL: Counter to trigger scroll to end when user sends a message
  // Incrementing this triggers a useEffect that scrolls after render
  const [scrollTrigger, setScrollTrigger] = useState(0);
  
  // Track scroll dimensions for smart scrolling
  const scrollMetrics = useRef<{
    contentHeight: number;
    layoutHeight: number;
    currentOffset: number;
  }>({ contentHeight: 0, layoutHeight: 0, currentOffset: 0 });

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

  // CRITICAL: Trigger scroll to end when user sends a message
  // This function increments the trigger which fires a useEffect after React's render cycle
  const scrollToUserMessageTop = useCallback(() => {
    setScrollTrigger((prev) => prev + 1);
  }, []);
  
  // CRITICAL: useEffect that fires AFTER React has processed the state update
  // This ensures the FlatList has the new message before we scroll
  useEffect(() => {
    if (scrollTrigger === 0) return; // Skip initial render
    
    // Use multiple timeouts to ensure scroll happens after render is complete
    // First timeout: Allow React to commit the update
    const timer1 = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 50);
    
    // Second timeout: Ensure scroll sticks after any layout adjustments
    const timer2 = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 150);
    
    // Third timeout: Final scroll to guarantee position
    const timer3 = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [scrollTrigger]);
  
  // Called when content size changes - update metrics
  const handleContentSizeChange = useCallback((width: number, height: number) => {
    scrollMetrics.current.contentHeight = height;
  }, []);

  // Smooth half-page scroll: only scroll when content is within threshold of bottom
  // Scrolls by half the visible height with smooth animation
  const scrollChunkedIfNeeded = useCallback(() => {
    if (userHasScrolled.current) return;
    
    const { contentHeight, layoutHeight, currentOffset } = scrollMetrics.current;
    const visibleBottom = currentOffset + layoutHeight;
    const distanceFromBottom = contentHeight - visibleBottom;
    
    // Only scroll if content is within 80px of being hidden (positive = content below visible area)
    if (distanceFromBottom < 80) return;
    
    // Scroll by half the visible page height for smooth, substantial movement
    const scrollAmount = layoutHeight / 2;
    const newOffset = currentOffset + scrollAmount;
    
    flatListRef.current?.scrollToOffset({ offset: newOffset, animated: true });
  }, []);

  // Keyboard handling with Reanimated
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      // Add extra padding between input and keyboard for visual buffer
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

  const messageListAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
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

    // Reset scroll behavior when user sends a message - they want to see the response
    userHasScrolled.current = false;

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

    // CRITICAL: Scroll user's message to top of visible area
    // This triggers a useEffect that scrolls AFTER the state update is processed
    scrollToUserMessageTop();

    const { data, error } = await sendChatMessage(userMessage.content, sessionId ?? undefined);

    if (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.message}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    // Don't scroll here - typing animation will handle scrolling via scrollChunkedIfNeeded
  }, [inputText, isLoading, sessionId, scrollToUserMessageTop, pendingAction]);

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
        // Show feedback prompt for rejection
        const feedbackMessage: ChatMessage = {
          id: `feedback-prompt-${Date.now()}`,
          role: 'assistant',
          content: "No problem! What would you like me to change? You can ask for different exercises, more or fewer sets, a different workout type, or anything else.",
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
        const resultMessage: ChatMessage = {
          id: `action-result-${Date.now()}`,
          role: 'assistant',
          // CRITICAL: Sanitize message to ensure no JSON is ever shown to users
          content: sanitizeMessageForDisplay(data.summary),
          createdAt: new Date().toISOString(),
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
              console.log('[HerculesAI] Programs and plans refreshed');
            } else if (actionType === 'create_schedule') {
              await useSchedulesStore.getState().hydrateSchedules();
              console.log('[HerculesAI] Schedules refreshed');
            } else if (
              actionType === 'add_workout_session' ||
              actionType === 'edit_workout_session' ||
              actionType === 'delete_workout_session'
            ) {
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
          content: `Action failed: ${error.message}`,
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

  // Handler for dismissing the fallback without taking action
  const handleFallbackDismiss = useCallback(() => {
    // Add a message acknowledging the dismissal
    const dismissMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: 'No problem! Let me know if you\'d like to make any changes or try something different.',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, dismissMessage]);
    setNewMessageIds((prev) => new Set(prev).add(dismissMessage.id));
    triggerHaptic('light');
    // Don't scroll - typing animation will handle it
  }, []);

  // Handler for fallback retry - sends a confirmation message to regenerate with action
  const handleFallbackRetry = useCallback(async () => {
    if (isLoading) return;
    
    // Reset scroll behavior - user is taking action
    userHasScrolled.current = false;
    
    // Send a clear confirmation that should trigger action generation
    const confirmMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: 'Yes, please create that for me now.',
      createdAt: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, confirmMessage]);
    setIsLoading(true);
    triggerHaptic('light');
    
    // Scroll user's message to top
    scrollToUserMessageTop();
    
    const { data, error } = await sendChatMessage(confirmMessage.content, sessionId ?? undefined);
    
    if (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.message}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } else if (data) {
      console.log('[HerculesAI] Fallback retry response:', {
        hasAction: !!data.action,
        actionType: data.action?.actionType,
      });
      
      if (!sessionId) {
        setSessionId(data.sessionId);
      }
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: sanitizeMessageForDisplay(data.message),
        createdAt: new Date().toISOString(),
        action: data.action
          ? { ...data.action, status: 'pending' as const }
          : null,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setNewMessageIds((prev) => new Set(prev).add(assistantMessage.id));
      
      if (data.action) {
        console.log('[HerculesAI] Fallback retry succeeded - action received:', data.action.actionType);
        setPendingAction({ ...data.action, status: 'pending' });
      } else {
        console.warn('[HerculesAI] Fallback retry failed - still no action in response');
      }
      
      loadUsage();
    }
    
    setIsLoading(false);
    // Don't scroll here - typing animation will handle scrolling
  }, [isLoading, sessionId, scrollToUserMessageTop]);

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isAnimationComplete = animationCompleteIds.has(item.id) || !newMessageIds.has(item.id);
    
    // FIXED: Only show action card AFTER animation completes for smoother UX
    const hasAction = item.action && item.action.status === 'pending';
    const showActionCard = hasAction && isAnimationComplete;
    
    // CRITICAL: Detect if this message looks like a proposal but has no action
    // Only show fallback after animation completes
    const isLastAssistantMessage = item.role === 'assistant' && 
      messages.filter(m => m.role === 'assistant').slice(-1)[0]?.id === item.id;
    const looksLikeProposal = item.role === 'assistant' && looksLikeActionProposal(item.content);
    const showMissingActionFallback = isAnimationComplete && isLastAssistantMessage && looksLikeProposal && !hasAction && !pendingAction && !isLoading;

    // Debug logging to track action detection
    if (item.role === 'assistant') {
      console.log('[HerculesAI] Rendering message:', {
        hasAction: !!item.action,
        actionStatus: item.action?.status,
        isAnimationComplete,
        showActionCard,
        showMissingActionFallback,
      });
    }

    return (
      <>
        <ChatMessageBubble
          content={item.content}
          role={item.role}
          index={index}
          isNewMessage={newMessageIds.has(item.id)}
          onAnimationComplete={() => handleAnimationComplete(item.id)}
          onTypingProgress={scrollChunkedIfNeeded} // Chunked scroll when content nears bottom
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
        {showMissingActionFallback && (
          <MissingActionFallback
            onRetry={handleFallbackRetry}
            onDismiss={handleFallbackDismiss}
            isLoading={isLoading}
            theme={theme}
          />
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
            <PremiumLock
              isLocked={true}
              featureName="Hercules AI"
              ctaText="Unlock with Premium"
              onUnlock={handleUpgrade}
            >
              <Text variant="body" color="secondary">
                Get personalized workout advice, track your progress, and let AI help you reach your fitness goals.
              </Text>
            </PremiumLock>
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


  // Calculate input area height for FlatList bottom padding
  // Add significant extra buffer (100px) so content appears higher on screen, not hidden behind input
  const inputAreaHeight = 52 + spacing.sm + (insets.bottom || spacing.xs) + spacing.sm + spacing.xl + 100;

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
          // Detect when user manually scrolls
          onScrollBeginDrag={() => {
            userHasScrolled.current = true;
          }}
          // Track scroll position for chunked scrolling
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollMetrics.current.currentOffset = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          // Track content size changes and handle pending scroll-to-top
          onContentSizeChange={handleContentSizeChange}
          onLayout={(event) => {
            scrollMetrics.current.layoutHeight = event.nativeEvent.layout.height;
          }}
          ListFooterComponent={<TypingIndicator isVisible={isLoading} />}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
              <Text variant="heading2" color="primary" style={styles.emptyTitle}>
                Hey there! 👋
              </Text>
              <Text variant="body" color="secondary" style={styles.emptyText}>
                I&apos;m Hercules, your AI fitness assistant. Ask me anything about
                workouts, form, nutrition, or let me help you plan your next session.
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
        </Animated.View>
      </View>
      <ChatHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
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
    paddingHorizontal: spacing.lg,
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
    bottom: 15,
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
