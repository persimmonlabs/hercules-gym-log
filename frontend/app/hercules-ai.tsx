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
import type { ChatMessage, ActionProposal, UsageInfo } from '@/types/herculesAI';

const HerculesAIScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionProposal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

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
      if (!sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        createdAt: new Date().toISOString(),
        action: data.action
          ? { ...data.action, status: 'pending' as const }
          : null,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.action) {
        setPendingAction({ ...data.action, status: 'pending' });
      }

      loadUsage();
    }

    setIsLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, isLoading, sessionId]);

  const handleActionDecision = useCallback(
    async (decision: 'approve' | 'reject') => {
      if (!pendingAction) return;

      setActionLoading(true);
      triggerHaptic(decision === 'approve' ? 'success' : 'light');

      const { data, error } = await submitActionDecision(pendingAction.id, decision);

      if (data) {
        const resultMessage: ChatMessage = {
          id: `action-result-${Date.now()}`,
          role: 'assistant',
          content: data.summary,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, resultMessage]);
      } else if (error) {
        const errorMessage: ChatMessage = {
          id: `action-error-${Date.now()}`,
          role: 'assistant',
          content: `Action failed: ${error.message}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }

      setPendingAction(null);
      setActionLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
    setPendingAction(null);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <ChatMessageBubble content={item.content} role={item.role} index={index} />
  );

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
          <View style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={12}>
              <IconSymbol name="arrow-back" size={24} color={theme.text.primary} />
            </Pressable>
            <Text variant="heading3" color="primary" style={styles.headerTitle}>
              Hercules AI
            </Text>
            <View style={{ width: 24 }} />
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
  const inputAreaHeight = 52 + spacing.sm + (insets.bottom || spacing.xs) + spacing.sm;

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.border.light }]}>
          <Pressable 
            onPress={handleBack} 
            hitSlop={12}
            style={[styles.headerButton, { backgroundColor: theme.surface.elevated }]}
          >
            <IconSymbol name="arrow-back" size={20} color={theme.text.primary} />
          </Pressable>
          <Text variant="heading3" color="primary" style={styles.headerTitle}>
            Hercules AI
          </Text>
          <Pressable 
            onPress={handleOpenHistory} 
            hitSlop={12}
            style={[styles.headerButton, { backgroundColor: theme.surface.elevated }]}
          >
            <IconSymbol name="menu" size={20} color={theme.text.primary} />
          </Pressable>
        </View>

        {usage && (
          <View style={styles.usageBannerWrapper}>
            <ChatUsageBanner usage={usage} />
          </View>
        )}

        <Animated.FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageListContainer}
          contentContainerStyle={[styles.messageList, { paddingBottom: inputAreaHeight }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

        {pendingAction && (
          <ActionApprovalCard
            action={pendingAction}
            onApprove={() => handleActionDecision('approve')}
            onReject={() => handleActionDecision('reject')}
            isLoading={actionLoading}
          />
        )}

        <Animated.View 
          style={[
            styles.inputContainer, 
            { 
              paddingBottom: insets.bottom || spacing.xs,
              backgroundColor: theme.primary.bg,
            },
            inputContainerAnimatedStyle,
          ]}
        >
          <View style={[styles.inputWrapper, { backgroundColor: theme.surface.card, borderWidth: 1.5, borderColor: theme.accent.primary, ...shadows.sm }]}>
            <TextInput
              style={[styles.input, { color: theme.text.primary }]}
              placeholder="Ask Hercules anything..."
              placeholderTextColor={theme.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
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
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
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
  usageBannerWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
