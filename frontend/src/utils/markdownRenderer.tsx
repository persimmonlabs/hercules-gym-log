/**
 * Custom Markdown Renderer for React Native
 * Parses and renders markdown with proper formatting
 */

import React from 'react';
import { View, Text as RNText, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { spacing, radius, typography } from '@/constants/theme';

interface MarkdownStyles {
  text: {
    primary: string;
    secondary: string;
  };
  accent: {
    primary: string;
  };
  surface: {
    elevated: string;
  };
  border: {
    medium: string;
  };
}

interface MarkdownElement {
  type: 'text' | 'bold' | 'italic' | 'code' | 'heading' | 'list' | 'paragraph' | 'codeblock' | 'blockquote';
  content: string | MarkdownElement[];
  level?: number;
  ordered?: boolean;
  items?: { text: string; subItems?: string[] }[];
}

export const parseMarkdown = (text: string): MarkdownElement[] => {
  const lines = text.split('\n');
  const elements: MarkdownElement[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push({
          type: 'codeblock',
          content: codeBlockContent.join('\n'),
        });
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      elements.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Bullet lists
    if (line.match(/^[\s]*[-*]\s+(.+)$/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s+(.+)$/)) {
        const match = lines[i].match(/^[\s]*[-*]\s+(.+)$/);
        if (match) listItems.push(match[1]);
        i++;
      }
      elements.push({
        type: 'list',
        ordered: false,
        content: listItems.join('\n'),
      });
      continue;
    }

    // Numbered lists (with support for bullet sub-items and blank lines between items)
    if (line.match(/^[\s]*\d+\.\s+(.+)$/)) {
      const structuredItems: { text: string; subItems?: string[] }[] = [];
      while (i < lines.length) {
        // Skip blank lines within the numbered list
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }
        if (i >= lines.length) break;

        const numberedMatch = lines[i].match(/^[\s]*\d+\.\s+(.+)$/);
        if (numberedMatch) {
          structuredItems.push({ text: numberedMatch[1] });
          i++;
          // Collect any bullet sub-items that follow this numbered item
          const subItems: string[] = [];
          while (i < lines.length) {
            // Skip blank lines between sub-items
            if (lines[i].trim() === '') {
              // Peek ahead: if the next non-blank line is a bullet, skip the blank
              let peek = i + 1;
              while (peek < lines.length && lines[peek].trim() === '') peek++;
              if (peek < lines.length && lines[peek].match(/^[\s]*[-*]\s+(.+)$/)) {
                i++;
                continue;
              }
              break;
            }
            const subMatch = lines[i].match(/^[\s]*[-*]\s+(.+)$/);
            if (subMatch) {
              subItems.push(subMatch[1]);
              i++;
            } else {
              break;
            }
          }
          if (subItems.length > 0) {
            structuredItems[structuredItems.length - 1].subItems = subItems;
          }
        } else {
          break;
        }
      }
      elements.push({
        type: 'list',
        ordered: true,
        items: structuredItems,
        content: structuredItems.map(item => item.text).join('\n'),
      });
      continue;
    }

    // Blockquotes
    if (line.startsWith('>')) {
      elements.push({
        type: 'blockquote',
        content: line.substring(1).trim(),
      });
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push({
        type: 'paragraph',
        content: line,
      });
    }

    i++;
  }

  return elements;
};

const parseInlineMarkdown = (text: string): (string | { type: string; content: string })[] => {
  const parts: (string | { type: string; content: string })[] = [];
  let current = '';
  let i = 0;

  while (i < text.length) {
    // Bold **text**
    if (text[i] === '*' && text[i + 1] === '*') {
      if (current) {
        parts.push(current);
        current = '';
      }
      i += 2;
      let boldText = '';
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
        boldText += text[i];
        i++;
      }
      if (boldText) parts.push({ type: 'bold', content: boldText });
      i += 2;
      continue;
    }

    // Italic *text*
    if (text[i] === '*' && text[i + 1] !== '*') {
      if (current) {
        parts.push(current);
        current = '';
      }
      i += 1;
      let italicText = '';
      while (i < text.length && text[i] !== '*') {
        italicText += text[i];
        i++;
      }
      if (italicText) parts.push({ type: 'italic', content: italicText });
      i += 1;
      continue;
    }

    // Inline code `text`
    if (text[i] === '`') {
      if (current) {
        parts.push(current);
        current = '';
      }
      i += 1;
      let codeText = '';
      while (i < text.length && text[i] !== '`') {
        codeText += text[i];
        i++;
      }
      if (codeText) parts.push({ type: 'code', content: codeText });
      i += 1;
      continue;
    }

    current += text[i];
    i++;
  }

  if (current) parts.push(current);
  return parts;
};

const renderInlineParts = (text: string, theme: MarkdownStyles) => {
  const parts = parseInlineMarkdown(text);
  return parts.map((part, i) => {
    if (typeof part === 'string') {
      return <RNText key={i}>{part}</RNText>;
    }
    if (part.type === 'bold') {
      return (
        <RNText key={i} style={{ fontWeight: '700' }}>
          {part.content}
        </RNText>
      );
    }
    if (part.type === 'italic') {
      return (
        <RNText key={i} style={{ fontStyle: 'italic' }}>
          {part.content}
        </RNText>
      );
    }
    if (part.type === 'code') {
      return (
        <RNText
          key={i}
          style={{
            backgroundColor: theme.surface.elevated,
            color: theme.accent.primary,
            fontFamily: 'monospace',
            fontSize: 14,
          }}
        >
          {part.content}
        </RNText>
      );
    }
    return null;
  });
};

export const renderMarkdown = (elements: MarkdownElement[], theme: MarkdownStyles) => {
  // Post-process: merge all ordered lists into one continuous list
  // This handles cases where blank lines, paragraphs, or typing animation
  // cause the parser to split a single numbered list into multiple elements.
  // Strategy: find all ordered list elements and merge them, removing any
  // empty paragraphs that appear between them.
  const merged: MarkdownElement[] = [];
  for (let idx = 0; idx < elements.length; idx++) {
    const el = elements[idx];
    if (el.type === 'list' && el.ordered) {
      // Ensure items array exists
      const elItems = el.items ?? (el.content as string).split('\n').map(t => ({ text: t }));
      // Look back: can we merge into a previous ordered list?
      // Search backwards through merged, skipping empty paragraphs
      let mergeTarget: MarkdownElement | null = null;
      let removeFrom = -1;
      for (let j = merged.length - 1; j >= 0; j--) {
        const candidate = merged[j];
        if (candidate.type === 'list' && candidate.ordered) {
          mergeTarget = candidate;
          removeFrom = j + 1;
          break;
        }
        // Allow skipping empty paragraphs or whitespace-only paragraphs between lists
        if (candidate.type === 'paragraph' && (candidate.content as string).trim() === '') {
          continue;
        }
        // Stop if we hit any real content
        break;
      }
      if (mergeTarget && mergeTarget.items) {
        // Remove any empty paragraphs between the lists
        if (removeFrom >= 0) {
          merged.splice(removeFrom);
        }
        mergeTarget.items = [...mergeTarget.items, ...elItems];
        mergeTarget.content = mergeTarget.items.map(item => item.text).join('\n');
      } else {
        merged.push({ ...el, items: elItems });
      }
    } else {
      merged.push({ ...el });
    }
  }

  return merged.map((element, index) => {
    switch (element.type) {
      case 'heading':
        const headingSize = element.level === 1 ? 24 : element.level === 2 ? 20 : 18;
        const headingWeight = element.level === 1 ? '700' : '600';
        return (
          <RNText
            key={index}
            style={{
              fontSize: headingSize,
              fontWeight: headingWeight,
              color: theme.text.primary,
              marginTop: spacing.md,
              marginBottom: spacing.sm,
              lineHeight: headingSize + 8,
            }}
          >
            {element.content as string}
          </RNText>
        );

      case 'paragraph':
        const inlineParts = parseInlineMarkdown(element.content as string);
        return (
          <RNText
            key={index}
            style={{
              fontSize: typography.body.fontSize,
              color: theme.text.primary,
              lineHeight: 24,
              marginBottom: spacing.sm,
            }}
          >
            {inlineParts.map((part, i) => {
              if (typeof part === 'string') {
                return <RNText key={i}>{part}</RNText>;
              }
              if (part.type === 'bold') {
                return (
                  <RNText key={i} style={{ fontWeight: '700' }}>
                    {part.content}
                  </RNText>
                );
              }
              if (part.type === 'italic') {
                return (
                  <RNText key={i} style={{ fontStyle: 'italic' }}>
                    {part.content}
                  </RNText>
                );
              }
              if (part.type === 'code') {
                return (
                  <RNText
                    key={i}
                    style={{
                      backgroundColor: theme.surface.elevated,
                      color: theme.accent.primary,
                      fontFamily: 'monospace',
                      fontSize: 14,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    {part.content}
                  </RNText>
                );
              }
              return null;
            })}
          </RNText>
        );

      case 'list':
        // Ordered lists use structured items with sub-items support
        if (element.ordered && element.items) {
          return (
            <View key={index} style={{ marginBottom: spacing.sm }}>
              {element.items.map((item, i) => (
                <View key={i} style={{ marginBottom: spacing.xs }}>
                  <View style={{ flexDirection: 'row' }}>
                    <RNText
                      style={{
                        color: theme.accent.primary,
                        fontSize: 16,
                        marginRight: spacing.sm,
                        lineHeight: 24,
                        fontWeight: '600',
                        minWidth: 24,
                      }}
                    >
                      {`${i + 1}.`}
                    </RNText>
                    <RNText
                      style={{
                        flex: 1,
                        fontSize: typography.body.fontSize,
                        color: theme.text.primary,
                        lineHeight: 24,
                      }}
                    >
                      {renderInlineParts(item.text, theme)}
                    </RNText>
                  </View>
                  {item.subItems && item.subItems.length > 0 && (
                    <View style={{ marginLeft: 32 }}>
                      {item.subItems.map((sub, si) => (
                        <View key={si} style={{ flexDirection: 'row', marginBottom: 2 }}>
                          <RNText
                            style={{
                              color: theme.text.secondary,
                              fontSize: 14,
                              marginRight: spacing.sm,
                              lineHeight: 22,
                            }}
                          >
                            {'•'}
                          </RNText>
                          <RNText
                            style={{
                              flex: 1,
                              fontSize: 14,
                              color: theme.text.secondary,
                              lineHeight: 22,
                            }}
                          >
                            {renderInlineParts(sub, theme)}
                          </RNText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          );
        }

        // Unordered lists use flat content string
        const listItems = (element.content as string).split('\n');
        return (
          <View key={index} style={{ marginBottom: spacing.sm }}>
            {listItems.map((item, i) => {
              return (
                <View key={i} style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
                  <RNText
                    style={{
                      color: theme.accent.primary,
                      fontSize: 16,
                      marginRight: spacing.sm,
                      lineHeight: 24,
                    }}
                  >
                    {'•'}
                  </RNText>
                  <RNText
                    style={{
                      flex: 1,
                      fontSize: typography.body.fontSize,
                      color: theme.text.primary,
                      lineHeight: 24,
                    }}
                  >
                    {renderInlineParts(item, theme)}
                  </RNText>
                </View>
              );
            })}
          </View>
        );

      case 'codeblock':
        return (
          <View
            key={index}
            style={{
              backgroundColor: theme.surface.elevated,
              padding: spacing.md,
              borderRadius: radius.md,
              marginVertical: spacing.sm,
            }}
          >
            <RNText
              style={{
                fontFamily: 'monospace',
                fontSize: 14,
                color: theme.text.primary,
                lineHeight: 20,
              }}
            >
              {element.content as string}
            </RNText>
          </View>
        );

      case 'blockquote':
        return (
          <View
            key={index}
            style={{
              backgroundColor: theme.surface.elevated,
              borderLeftWidth: 4,
              borderLeftColor: theme.accent.primary,
              paddingLeft: spacing.md,
              paddingVertical: spacing.sm,
              marginVertical: spacing.sm,
              borderRadius: radius.sm,
            }}
          >
            <RNText
              style={{
                fontSize: typography.body.fontSize,
                color: theme.text.primary,
                lineHeight: 24,
              }}
            >
              {element.content as string}
            </RNText>
          </View>
        );

      default:
        return null;
    }
  });
};
