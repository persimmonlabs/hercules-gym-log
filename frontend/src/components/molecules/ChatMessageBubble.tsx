/**
 * ChatMessageBubble
 * Renders a single chat message with appropriate styling based on role
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';
import type { ChatRole } from '@/types/herculesAI';

interface ChatMessageBubbleProps {
  content: string;
  role: ChatRole;
  index: number;
}

const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
};

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  content,
  role,
  index,
}) => {
  const { theme } = useTheme();
  const isUser = role === 'user';
  const displayContent = isUser ? content : stripMarkdown(content);

  const bubbleStyle = {
    backgroundColor: isUser ? theme.accent.primary : theme.surface.elevated,
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    borderWidth: isUser ? 0 : 1.5,
    borderColor: isUser ? 'transparent' : theme.accent.primary,
  } as const;

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(300)}
      style={[styles.container, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}
    >
      <View style={[styles.bubble, bubbleStyle]}>
        <Text variant="body" color={isUser ? 'onAccent' : 'primary'}>
          {displayContent}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  bubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
});
