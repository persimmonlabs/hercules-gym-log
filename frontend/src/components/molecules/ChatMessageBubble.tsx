/**
 * ChatMessageBubble
 * Renders a single chat message with appropriate styling based on role
 * AI responses use custom markdown rendering for rich formatting
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';
import { parseMarkdown, renderMarkdown } from '@/utils/markdownRenderer';
import { sanitizeMessageForDisplay } from '@/utils/messageSanitizer';
import type { ChatRole } from '@/types/herculesAI';

interface ChatMessageBubbleProps {
  content: string;
  role: ChatRole;
  index: number;
  isNewMessage?: boolean;
  onAnimationComplete?: () => void;
  onTypingProgress?: () => void; // Called during typing animation to enable auto-scroll
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  content,
  role,
  index,
  isNewMessage = false,
  onAnimationComplete,
  onTypingProgress,
}) => {
  const { theme } = useTheme();
  const isUser = role === 'user';
  
  // Track if animation has already completed to prevent infinite loops
  const animationCompletedRef = useRef(false);
  // Store callbacks in ref to avoid dependency issues
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;
  const onTypingProgressRef = useRef(onTypingProgress);
  onTypingProgressRef.current = onTypingProgress;
  // Track last line count to detect newline completions
  const lastLineCountRef = useRef(0);
  
  // CRITICAL: Sanitize content to ensure no JSON is ever shown to users
  // This is the last line of defense - backend should already sanitize, but we double-check
  const sanitizedContent = useMemo(() => {
    if (isUser) {
      return content; // User messages don't need sanitization
    }
    return sanitizeMessageForDisplay(content);
  }, [content, isUser]);
  
  // Typing effect for AI responses (only for new messages)
  const shouldAnimate = !isUser && isNewMessage;
  const [displayedText, setDisplayedText] = useState(shouldAnimate ? '' : sanitizedContent);

  useEffect(() => {
    // If animation already completed, don't restart
    if (animationCompletedRef.current) {
      return;
    }

    if (shouldAnimate && sanitizedContent) {
      setDisplayedText('');
      let currentIndex = 0;
      lastLineCountRef.current = 0;
      
      // 5ms per character as requested by user
      const typingInterval = setInterval(() => {
        if (currentIndex < sanitizedContent.length) {
          currentIndex += 1;
          const currentText = sanitizedContent.slice(0, currentIndex);
          setDisplayedText(currentText);
          
          // CHUNKED SCROLL: Check every 2 new lines if scroll is needed
          const currentLineCount = (currentText.match(/\n/g) || []).length;
          if (currentLineCount >= lastLineCountRef.current + 2) {
            lastLineCountRef.current = currentLineCount;
            onTypingProgressRef.current?.();
          }
        } else {
          clearInterval(typingInterval);
          animationCompletedRef.current = true;
          onTypingProgressRef.current?.(); // Final scroll check
          onAnimationCompleteRef.current?.();
        }
      }, 5); // 5ms per character

      return () => clearInterval(typingInterval);
    } else if (!shouldAnimate) {
      setDisplayedText(sanitizedContent);
      // If not animating, immediately notify completion
      if (!isUser && !animationCompletedRef.current) {
        animationCompletedRef.current = true;
        onAnimationCompleteRef.current?.();
      }
    }
  }, [sanitizedContent, shouldAnimate, isUser]);

  // Parse markdown for AI responses
  const parsedMarkdown = useMemo(() => {
    if (!isUser) {
      return parseMarkdown(displayedText);
    }
    return [];
  }, [displayedText, isUser]);

  if (isUser) {
    const bubbleStyle = {
      backgroundColor: theme.accent.primary,
      alignSelf: 'flex-end',
      maxWidth: '85%',
    } as const;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50).duration(300)}
        style={[styles.container, { alignItems: 'flex-end' }]}
      >
        <View style={[styles.bubble, bubbleStyle]}>
          <Text variant="body" color="onAccent">
            {content}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // AI response - full width with markdown rendering
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(300)}
      style={styles.aiContainer}
    >
      {renderMarkdown(parsedMarkdown, {
        text: { primary: theme.text.primary, secondary: theme.text.secondary },
        accent: { primary: theme.accent.primary },
        surface: { elevated: theme.surface.elevated },
        border: { medium: theme.border.medium },
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  aiContainer: {
    marginVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    width: '100%',
  },
});
