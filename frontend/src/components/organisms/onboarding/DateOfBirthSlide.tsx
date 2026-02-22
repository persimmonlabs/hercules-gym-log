/**
 * DateOfBirthSlide
 * Date of birth input with auto-advance between MM, DD, YYYY fields.
 */

import React, { useRef, useCallback } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { spacing } from '@/constants/theme';
import { lt, slideStyles, SCREEN_WIDTH } from '@/constants/onboarding';

interface DateOfBirthSlideProps {
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  setDobMonth: (v: string) => void;
  setDobDay: (v: string) => void;
  setDobYear: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
}

export const DateOfBirthSlide: React.FC<DateOfBirthSlideProps> = ({
  dobMonth, dobDay, dobYear,
  setDobMonth, setDobDay, setDobYear,
  onSave, onSkip,
}) => {
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const handleMonthChange = useCallback((t: string) => {
    const cleaned = t.replace(/[^0-9]/g, '');
    setDobMonth(cleaned);
    if (cleaned.length === 2) dayRef.current?.focus();
  }, [setDobMonth]);

  const handleDayChange = useCallback((t: string) => {
    const cleaned = t.replace(/[^0-9]/g, '');
    setDobDay(cleaned);
    if (cleaned.length === 2) yearRef.current?.focus();
  }, [setDobDay]);

  const handleYearChange = useCallback((t: string) => {
    setDobYear(t.replace(/[^0-9]/g, ''));
  }, [setDobYear]);

  return (
    <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.centeredContent}>
        <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>
          Date of Birth
        </Text>
        <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>
          Helps personalize your experience
        </Text>
        <View style={slideStyles.inputRow}>
          <View style={slideStyles.inputGroup}>
            <Text variant="caption" style={{ color: lt.text.secondary, textAlign: 'center' }}>Month</Text>
            <TextInput
              value={dobMonth} onChangeText={handleMonthChange}
              placeholder="MM" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
              style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
              maxLength={2} returnKeyType="next"
            />
          </View>
          <View style={slideStyles.inputGroup}>
            <Text variant="caption" style={{ color: lt.text.secondary, textAlign: 'center' }}>Day</Text>
            <TextInput
              ref={dayRef}
              value={dobDay} onChangeText={handleDayChange}
              placeholder="DD" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
              style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
              maxLength={2} returnKeyType="next"
            />
          </View>
          <View style={[slideStyles.inputGroup, { flex: 1.4 }]}>
            <Text variant="caption" style={{ color: lt.text.secondary, textAlign: 'center' }}>Year</Text>
            <TextInput
              ref={yearRef}
              value={dobYear} onChangeText={handleYearChange}
              placeholder="YYYY" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
              style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
              maxLength={4} returnKeyType="done"
            />
          </View>
        </View>
      </View>
      <View>
        <View style={slideStyles.buttonRow}>
          <Button label="Skip" variant="secondary" onPress={onSkip} style={slideStyles.halfButton} />
          <Button label="Save" variant="primary" onPress={onSave} style={slideStyles.halfButton} />
        </View>
        <Text variant="caption" style={[slideStyles.skipHint, { color: lt.text.tertiary }]}>
          You can update this later in Settings
        </Text>
      </View>
    </View>
  );
};
