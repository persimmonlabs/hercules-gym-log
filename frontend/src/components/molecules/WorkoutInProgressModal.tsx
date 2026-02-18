import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface WorkoutInProgressModalProps {
  visible: boolean;
  sessionName: string;
  elapsedMinutes: number;
  onResume: () => void;
  onCancel: () => void;
}

export const WorkoutInProgressModal: React.FC<WorkoutInProgressModalProps> = ({
  visible,
  sessionName,
  elapsedMinutes,
  onResume,
  onCancel,
}): React.ReactElement => {
  const { theme } = useTheme();

  const elapsedLabel = useMemo(() => {
    const minutes = Math.max(elapsedMinutes, 0);
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }, [elapsedMinutes]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay.scrim }]} onPress={onCancel}>
        <Pressable style={styles.dialogPressable} onPress={() => undefined}>
          <SurfaceCard tone="card" padding="xl" showAccentStripe={false} style={styles.card}>
            <View style={styles.header}>
              <Text variant="heading3" color="primary" style={styles.textCentered}>
                Workout in Progress
              </Text>
              <Text variant="body" color="secondary" style={styles.textCentered}>
                You have an ongoing session &quot;{sessionName}&quot; ({elapsedLabel} elapsed).
              </Text>
            </View>

            <View style={styles.actions}>
              <Button label="Resume Session" size="md" onPress={onResume} />
              <Button label="Cancel" size="md" variant="ghost" onPress={onCancel} />
            </View>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialogPressable: {
    width: '100%',
  },
  card: {
    width: '100%',
  },
  header: {
    gap: spacing.xs,
  },
  textCentered: {
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
