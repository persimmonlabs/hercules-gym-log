/**
 * ChatHistoryModal
 * Modal for viewing and selecting past chat sessions
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';
import { triggerHaptic } from '@/utils/haptics';
import {
  fetchChatSessions,
  deleteChatSession,
} from '@/services/herculesAIService';
import type { ChatSessionSummary } from '@/types/herculesAI';

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
      loadSessions();
    }
  }, [visible, loadSessions]);

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

  const renderSession = ({ item }: { item: ChatSessionSummary }) => (
    <Pressable
      style={[styles.sessionItem, { backgroundColor: theme.surface.card }]}
      onPress={() => handleSelectSession(item.id)}
    >
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
        <IconSymbol name="delete" size={20} color={theme.text.tertiary} />
      </Pressable>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.primary.bg,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <Text variant="heading3" color="primary">
            Chat History
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <IconSymbol name="close" size={24} color={theme.text.primary} />
          </Pressable>
        </View>

        <View style={styles.newChatWrapper}>
          <Button
            label="Start New Chat"
            variant="primary"
            size="md"
            onPress={handleNewChat}
          />
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.accent.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text variant="body" color="secondary">
              {error}
            </Text>
            <Button label="Retry" variant="secondary" size="sm" onPress={loadSessions} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centered}>
            <IconSymbol name="chat-bubble-outline" size={48} color={theme.text.tertiary} />
            <Text variant="body" color="secondary" style={styles.emptyText}>
              No previous chats yet.{'\n'}Start a new conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSession}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  newChatWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  sessionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  deleteButton: {
    padding: spacing.sm,
  },
});
