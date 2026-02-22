/**
 * OptionSlide
 * Reusable onboarding slide with a title, subtitle, option grid, and skip button.
 * Used for Gender, Experience, Goal, and Equipment screens.
 */

import React from 'react';
import { View, Pressable } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { lt, slideStyles, SCREEN_WIDTH } from '@/constants/onboarding';
import { triggerHaptic } from '@/utils/haptics';

interface OptionItem {
  value: string;
  label: string;
}

interface OptionSlideProps {
  title: string;
  subtitle: string;
  field: string;
  options: OptionItem[];
  selectedValue?: string | null;
  onSelect: (field: string, value: string | number) => void;
  onSkip: () => void;
}

export const OptionSlide: React.FC<OptionSlideProps> = ({
  title,
  subtitle,
  field,
  options,
  selectedValue,
  onSelect,
  onSkip,
}) => {
  const handleSelect = (value: string) => {
    triggerHaptic('selection');
    onSelect(field, value);
  };

  return (
    <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.centeredContent}>
        <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>
          {title}
        </Text>
        <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>
          {subtitle}
        </Text>
        <View style={slideStyles.optionsGrid}>
          {options.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  slideStyles.optionCard,
                  { backgroundColor: lt.surface.card, borderColor: lt.border.light },
                  isSelected && { backgroundColor: lt.accent.orange, borderColor: lt.accent.orange },
                ]}
                onPress={() => handleSelect(opt.value)}
              >
                <Text
                  variant="bodySemibold"
                  style={{ textAlign: 'center', color: isSelected ? lt.text.onAccent : lt.text.primary }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View>
        <Button label="Skip" variant="secondary" onPress={onSkip} style={slideStyles.mainButton} />
        <Text variant="caption" style={[slideStyles.skipHint, { color: lt.text.tertiary }]}>
          You can update this later in Settings
        </Text>
      </View>
    </View>
  );
};
