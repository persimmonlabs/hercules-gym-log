/**
 * OutdoorControlBar
 * Start / Pause / Resume / Finish controls for outdoor sessions.
 * Uses the app's existing Button component for visual consistency.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { spacing } from '@/constants/theme';
import type { OutdoorSessionStatus } from '@/types/outdoor';

interface OutdoorControlBarProps {
  status: OutdoorSessionStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  isFinishing?: boolean;
}

export const OutdoorControlBar: React.FC<OutdoorControlBarProps> = ({
  status,
  onStart,
  onPause,
  onResume,
  onFinish,
  isFinishing = false,
}) => {
  return (
    <View style={styles.container}>
      {status === 'idle' && (
        <View style={styles.buttonWrapper}>
          <Button
            label="Start"
            size="lg"
            variant="primary"
            onPress={onStart}
          />
        </View>
      )}

      {status === 'active' && (
        <>
          <View style={styles.buttonWrapper}>
            <Button
              label="Pause"
              size="lg"
              variant="ghost"
              onPress={onPause}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <Button
              label="Finish"
              size="lg"
              variant="primary"
              onPress={onFinish}
              disabled={isFinishing}
              loading={isFinishing}
            />
          </View>
        </>
      )}

      {status === 'paused' && (
        <>
          <View style={styles.buttonWrapper}>
            <Button
              label="Resume"
              size="lg"
              variant="ghost"
              onPress={onResume}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <Button
              label="Finish"
              size="lg"
              variant="primary"
              onPress={onFinish}
              disabled={isFinishing}
              loading={isFinishing}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonWrapper: {
    width: '100%',
  },
});
