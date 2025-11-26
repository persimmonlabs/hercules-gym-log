import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { QuickFilterChip } from '@/components/atoms/QuickFilterChip';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import type { PremadeProgram, UserProgram, ExperienceLevel } from '@/types/premadePlan';

const FILTERS: { label: string; value: ExperienceLevel | 'all' }[] = [
  { label: 'All Levels', value: 'all' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: radius.full,
  },
  titleContainer: {
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  filtersContent: {
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
});

export default function BrowseProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { premadePrograms, loadPremadePrograms } = useProgramsStore();
  const [selectedFilter, setSelectedFilter] = useState<ExperienceLevel | 'all'>('all');

  useEffect(() => {
    loadPremadePrograms();
  }, [loadPremadePrograms]);

  const filteredPrograms = useMemo(() => {
    if (selectedFilter === 'all') {
      return premadePrograms;
    }
    return premadePrograms.filter(p => p.metadata.experienceLevel === selectedFilter);
  }, [premadePrograms, selectedFilter]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  }, [router]);

  const handleProgramPress = useCallback((program: PremadeProgram | UserProgram) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: '/program-details',
      params: { programId: program.id }
    });
  }, [router]);

  const handleFilterPress = useCallback((value: ExperienceLevel | 'all') => {
    setSelectedFilter(value);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.titleContainer}>
          <Text variant="heading2" color="primary">Browse Programs</Text>
          <Text variant="body" color="secondary">Find a plan that fits your goals</Text>
        </View>
      </View>

      {/* Filters */}
      <View>
        <FlatList
          horizontal
          data={FILTERS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filtersContent, styles.filtersContainer]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <QuickFilterChip
              label={item.label}
              active={selectedFilter === item.value}
              onPress={() => handleFilterPress(item.value)}
            />
          )}
        />
      </View>

      {/* Program List */}
      <FlatList
        data={filteredPrograms}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCard program={item} onPress={handleProgramPress} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="search" size={48} color={colors.neutral.gray400} />
            <Text variant="body" color="secondary">No programs found for this level.</Text>
          </View>
        }
      />
    </View>
  );
}
