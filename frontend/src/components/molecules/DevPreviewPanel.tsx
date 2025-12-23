import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useDevToolsStore } from '@/store/devToolsStore';

interface DevPreviewPanelProps {}

export const DevPreviewPanel: React.FC<DevPreviewPanelProps> = (): React.ReactElement | null => {
  const { theme } = useTheme();

  const forceEmptyAnalytics = useDevToolsStore((state) => state.forceEmptyAnalytics);
  const premiumOverride = useDevToolsStore((state) => state.premiumOverride);
  const toggleForceEmptyAnalytics = useDevToolsStore((state) => state.toggleForceEmptyAnalytics);
  const setPremiumOverride = useDevToolsStore((state) => state.setPremiumOverride);
  const reset = useDevToolsStore((state) => state.reset);

  const premiumLabel = useMemo((): string => {
    if (premiumOverride === 'premium') return 'Forced: Unlocked';
    if (premiumOverride === 'free') return 'Forced: Locked';
    return 'Default';
  }, [premiumOverride]);

  const handleSetPremiumDefault = useCallback((): void => {
    setPremiumOverride('default');
  }, [setPremiumOverride]);

  const handleSetPremiumFree = useCallback((): void => {
    setPremiumOverride('free');
  }, [setPremiumOverride]);

  const handleSetPremiumPremium = useCallback((): void => {
    setPremiumOverride('premium');
  }, [setPremiumOverride]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: spacing.md,
        },
        headerRow: {
          gap: spacing.xs,
          alignItems: 'center',
        },
        section: {
          gap: spacing.sm,
        },
        row: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        button: {
          flex: 1,
        },
        divider: {
          height: spacing.xs,
        },
        caption: {
          color: theme.text.tertiary,
          textAlign: 'center',
        },
      }),
    [theme.text.tertiary]
  );

  if (!__DEV__) {
    return null;
  }

  return (
    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text variant="heading3" color="primary">
            Preview States
          </Text>
          <Text variant="caption" style={styles.caption}>
            Dev-only overrides
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="bodySemibold" color="secondary">
            Performance Empty State
          </Text>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button
                label={forceEmptyAnalytics ? 'Disable Empty Preview' : 'Enable Empty Preview'}
                onPress={toggleForceEmptyAnalytics}
                variant={forceEmptyAnalytics ? 'secondary' : 'ghost'}
                size="sm"
              />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text variant="bodySemibold" color="secondary">
            Premium Analytics ({premiumLabel})
          </Text>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button label="Default" onPress={handleSetPremiumDefault} variant="secondary" size="sm" />
            </View>
            <View style={styles.button}>
              <Button label="Locked" onPress={handleSetPremiumFree} variant="ghost" size="sm" />
            </View>
            <View style={styles.button}>
              <Button label="Unlocked" onPress={handleSetPremiumPremium} variant="ghost" size="sm" />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.button}>
            <Button label="Reset Preview" onPress={reset} variant="light" size="sm" />
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
};
