/**
 * ChatHistorySidePanel
 * Side panel that slides from the right for viewing and selecting past chat sessions
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, shadows } from '@/constants/theme';
import { triggerHaptic } from '@/utils/haptics';
import {
  fetchChatSessions,
  deleteChatSession,
} from '@/services/herculesAIService';
import type { ChatSessionSummary } from '@/types/herculesAI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 320);

interface ChatHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
  visible,
  onClose,
  onSelectSession,
  onNewChat,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const translateX = useSharedValue(PANEL_WIDTH);
  const backdropOpacity = useSharedValue(0);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchChatSessions();
    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setSessions(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      loadSessions();
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateX.value = withTiming(PANEL_WIDTH, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setIsVisible)(false);
      });
    }
  }, [visible, loadSessions, translateX, backdropOpacity]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      triggerHaptic('selection');
      onSelectSession(sessionId);
      onClose();
    },
    [onSelectSession, onClose]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      triggerHaptic('warning');
      const { success } = await deleteChatSession(sessionId);
      if (success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    },
    []
  );

  const handleNewChat = useCallback(() => {
    triggerHaptic('selection');
    onNewChat();
    onClose();
  }, [onNewChat, onClose]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const renderSession = ({ item }: { item: ChatSessionSummary }) => (
    <Pressable
      style={[
        styles.sessionItem,
        {
          backgroundColor: theme.surface.elevated,
          borderColor: theme.accent.primary,
          borderWidth: 1,
        },
      ]}
      onPress={() => handleSelectSession(item.id)}
    >
      <View style={styles.sessionIcon}>
        <IconSymbol name="chat-bubble-outline" size={18} color={theme.accent.primary} />
      </View>
      <View style={styles.sessionContent}>
        <Text variant="bodySemibold" color="primary" numberOfLines={1}>
          {item.title || 'Untitled Chat'}
        </Text>
        <Text variant="caption" color="tertiary">
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Pressable
        onPress={() => handleDeleteSession(item.id)}
        hitSlop={8}
        style={styles.deleteButton}
      >
        <IconSymbol name="close" size={16} color={theme.text.tertiary} />
      </Pressable>
    </Pressable>
  );

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: theme.overlay.scrim },
          backdropStyle,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: PANEL_WIDTH,
            backgroundColor: theme.surface.card,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            ...shadows.lg,
          },
          panelStyle,
        ]}
      >
        <View style={styles.header}>
          <Text variant="heading3" color="primary">
            History
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={[styles.closeButton, { backgroundColor: theme.surface.elevated }]}
          >
            <IconSymbol name="close" size={18} color={theme.text.secondary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.accent.primary} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text variant="body" color="secondary" style={styles.errorText}>
                {error}
              </Text>
              <Button label="Retry" variant="secondary" size="sm" onPress={loadSessions} />
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.centered}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.surface.elevated }]}>
                <IconSymbol name="chat-bubble-outline" size={32} color={theme.text.tertiary} />
              </View>
              <Text variant="body" color="secondary" style={styles.emptyText}>
                No previous chats
              </Text>
              <Text variant="caption" color="tertiary" style={styles.emptySubtext}>
                Start a conversation to see it here
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              renderItem={renderSession}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<View style={styles.spacer} />}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Button
            label="New Chat"
            variant="primary"
            size="md"
            onPress={handleNewChat}
            style={styles.newChatButton}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 74, 0.15)',
  },
  sessionContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 74, 0.2)',
  },
  newChatButton: {
    width: '100%',
  },
  spacer: {
    height: spacing.xl * 2,
  },
});
