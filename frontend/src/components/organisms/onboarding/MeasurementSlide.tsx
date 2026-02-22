/**
 * MeasurementSlide
 * Reusable height/weight input with unit toggle and auto-advance between fields.
 * Supports both imperial (ft/in, lbs) and metric (cm, kg) from the start.
 */

import React, { useRef, useCallback } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { spacing, radius } from '@/constants/theme';
import { lt, slideStyles, SCREEN_WIDTH } from '@/constants/onboarding';

type MeasurementType = 'height' | 'weight';

interface MeasurementSlideProps {
  type: MeasurementType;
  isMetric: boolean;
  onToggleUnit: () => void;
  heightFt: string;
  heightIn: string;
  heightCm: string;
  weightInput: string;
  setHeightFt: (v: string) => void;
  setHeightIn: (v: string) => void;
  setHeightCm: (v: string) => void;
  setWeightInput: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
}

export const MeasurementSlide: React.FC<MeasurementSlideProps> = ({
  type, isMetric, onToggleUnit,
  heightFt, heightIn, heightCm, weightInput,
  setHeightFt, setHeightIn, setHeightCm, setWeightInput,
  onSave, onSkip,
}) => {
  const inchRef = useRef<TextInput>(null);

  const isHeight = type === 'height';
  const title = isHeight ? 'Height' : 'Body Weight';
  const subtitle = 'Used for improved calculations';

  const handleFtChange = useCallback((t: string) => {
    const c = t.replace(/[^0-9]/g, '');
    setHeightFt(c);
    if (c.length === 1 && parseInt(c, 10) >= 4) inchRef.current?.focus();
  }, [setHeightFt]);

  const handleInChange = useCallback((t: string) => {
    const c = t.replace(/[^0-9]/g, '');
    const n = parseInt(c, 10);
    if (c === '' || (n >= 0 && n <= 11)) setHeightIn(c);
  }, [setHeightIn]);

  const handleWeightChange = useCallback((t: string) => {
    if (isMetric) {
      const cleaned = t.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length <= 2) setWeightInput(cleaned);
    } else {
      setWeightInput(t.replace(/[^0-9]/g, ''));
    }
  }, [isMetric, setWeightInput]);

  return (
    <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.centeredContent}>
        <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>
          {title}
        </Text>
        <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>
          {subtitle}
        </Text>

        <View style={styles.unitToggle}>
          <Pressable
            style={[styles.unitOption, !isMetric && styles.unitActive]}
            onPress={() => isMetric && onToggleUnit()}
          >
            <Text variant="caption" style={{ color: !isMetric ? lt.text.onAccent : lt.text.secondary }}>
              {isHeight ? 'ft / in' : 'lbs'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.unitOption, isMetric && styles.unitActive]}
            onPress={() => !isMetric && onToggleUnit()}
          >
            <Text variant="caption" style={{ color: isMetric ? lt.text.onAccent : lt.text.secondary }}>
              {isHeight ? 'cm' : 'kg'}
            </Text>
          </Pressable>
        </View>

        {isHeight ? (
          isMetric ? (
            <View style={slideStyles.inputRow}>
              <View style={slideStyles.inputGroup}>
                <TextInput
                  value={heightCm}
                  onChangeText={(t) => setHeightCm(t.replace(/[^0-9]/g, ''))}
                  placeholder="175" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                  style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
                  maxLength={3}
                />
              </View>
              <Text variant="body" style={{ color: lt.text.secondary }}>cm</Text>
            </View>
          ) : (
            <View style={slideStyles.inputRow}>
              <View style={slideStyles.inputGroup}>
                <TextInput
                  value={heightFt}
                  onChangeText={handleFtChange}
                  placeholder="5" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                  style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
                  maxLength={1}
                />
              </View>
              <Text variant="body" style={{ color: lt.text.secondary }}>ft</Text>
              <View style={slideStyles.inputGroup}>
                <TextInput
                  ref={inchRef}
                  value={heightIn}
                  onChangeText={handleInChange}
                  placeholder="9" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                  style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
                  maxLength={2}
                />
              </View>
              <Text variant="body" style={{ color: lt.text.secondary }}>in</Text>
            </View>
          )
        ) : (
          <View style={slideStyles.inputRow}>
            <View style={slideStyles.inputGroup}>
              <TextInput
                value={weightInput}
                onChangeText={handleWeightChange}
                placeholder={isMetric ? '70' : '150'}
                placeholderTextColor={lt.text.tertiary}
                keyboardType={isMetric ? 'decimal-pad' : 'numeric'}
                style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
                maxLength={isMetric ? 5 : 3}
              />
            </View>
            <Text variant="body" style={{ color: lt.text.secondary }}>{isMetric ? 'kg' : 'lbs'}</Text>
          </View>
        )}
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

const styles = StyleSheet.create({
  unitToggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: lt.border.light,
    alignSelf: 'center',
  },
  unitOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: lt.surface.card,
  },
  unitActive: {
    backgroundColor: lt.accent.orange,
  },
});
