Hercules Fitness App — Analytics System Overhaul (Implementation Overview)
Purpose

This document outlines the planned implementation for the new analytics system in the Hercules Fitness app. The goal is to deliver a clean, intuitive analytics experience that:

Helps users understand their training at a glance

Reduces clutter

Uses the exercise → muscle weighting hierarchy effectively

Provides clear value for free users

Encourages upgrades to Hercules Pro through tasteful gating and previews

This plan will evolve as features are implemented, friction is encountered, or user testing reveals better UX patterns.

Tech Context

Frontend: React Native (Expo), TypeScript

Backend: Supabase (auth, user profiles, workout history)

Local Data: JSON defining exercises, muscle hierarchy, tier mapping, and muscle weightings

Platform: Android mobile

Charts: React Native chart system (library can be chosen per implementation; likely Victory Native, Reanimated + SVG, or similar)

Calendar exists already → No additional calendar analytics required

High-Level Objectives

Reduce clutter and cognitive load in the analytics screen.

Consolidate charts into intuitive categories.

Separate “free basics” from “premium deep insights” clearly.

Provide progressive disclosure: free users preview advanced analytics with partial/blurred/locked content.

Improve readability of pie charts, legends, and bar charts.

Create drill-down flows (tap → more detail → muscle → exercises).

Free vs. Premium Analytics
Free Tier (Dashboard Basics)

PR Card (3 exercises, user-selectable)

Set Distribution (High-tier): Upper / Lower / Core donut

Weekly Volume (High-tier bar chart): Upper / Lower / Core

Workout Streak + Consistency Overview

Tap-to-open category screens (with limited content)

Premium Tier (Deep Analytics)

Mid-tier Set Distribution (e.g., Chest, Back, Shoulders, Quads…)

Low-tier Set Distribution (e.g., Rear Delts, Upper Chest…)

Weekly Volume (Mid-tier and Low-tier)

Muscle drill-down details

Trendlines for 30/60/90 days

Volume comparisons (this week vs last week)

Symmetry / Balance assessments (e.g., pushing vs pulling)

Exercise-level insights (most-used, neglected, etc.)

Advanced recommendations (imbalance suggestions, undertrained muscles)

Analytics Screen Layout (Final Target Structure)
Dashboard (Free)

Personal Records

Weekly Volume (High-tier bar)

Set Distribution (High-tier donut)

Streaks/Consistency Overview

Carousels removed or minimized — replace with distinct cards

Each card leads to a fully dedicated “Category Screen”.

Category Screens
1. Volume Category

Free: High-tier bar (Upper/Lower/Core)

Premium:

Mid-tier bar chart

Low-tier bar chart

Trendlines (30/60/90d)

Comparison vs past weeks

2. Set Distribution Category

Free: High-tier donut

Premium:

Mid-tier donut

Low-tier donut

Scrollable/interactive legends

“Other” small-muscle grouping (<3%)

3. Muscle → Exercise Drilldown

Muscle detail page shows:

Volume history

Exercises contributing most to this muscle

Estimated training balance

Premium gating applies to trendlines + low-tier breakdowns

Data / Backend Requirements

Use Supabase tables as the persistent store for:

Workouts

Sets (weight × reps × exercise)

Compute muscle volumes client-side or in Supabase edge functions

Consider creating derived Supabase tables for:

Daily Muscle Volume

Weekly Muscle Volume

PR History

Pre-aggregations make charts fast & smooth

Frontend Implementation Requirements

Chart Component Abstraction

Unified wrapper for all charts (loading states, empty states, tooltips).

Pie Chart Improvements

Scrollable legend

Tappable muscle to highlight slice

Group small slices into “Other”

Bar Chart Improvements

Clear category labels

Optional comparison mode (premium)

Premium Gating

Locked overlays

Blurred previews

CTA to upgrade

Navigation Flow

Card → Category Screen → Drilldown

Performance Optimizations

Memoization for large datasets

Moving heavy calculations off main thread where needed

Guiding Principles

Simplify by default: fewer charts on dashboard, more depth inside category pages.

Progressive disclosure: free → preview → premium.

Hierarchy-based analytics: always respect high/mid/low tier relationships.

Mobile-first visuals: large tap targets, minimal text, intuitive gestures.

Iterate frequently: update this document as implementation evolves or user testing reveals better workflows.

Implementation Phases

PHASE 1: Foundation (COMPLETED ✓)

Goal: Establish reusable infrastructure before building features.

Tasks:
- [x] Create `src/types/analytics.ts` — Define types for chart data, tier levels, premium status
- [x] Create `src/hooks/useAnalyticsData.ts` — Centralized hook for muscle volume calculations
- [x] Create `src/hooks/usePremiumStatus.ts` — Hook for premium gating (stub initially)
- [x] Create `src/components/atoms/ChartWrapper.tsx` — Unified wrapper with loading/empty/error states
- [x] Create `src/components/atoms/PremiumLock.tsx` — Blurred overlay with CTA button
- [x] Create `src/components/atoms/AnalyticsCard.tsx` — Tappable card that navigates to category screens

Files Modified: None
New Files: 6
Supabase Changes: None

Testing Phase 1:
1. Import `useAnalyticsData` hook in any component and verify data calculations
2. Test `ChartWrapper` with different states: 'loading', 'empty', 'error', 'ready'
3. Test `PremiumLock` with `isLocked={true}` to see blur overlay
4. Test `AnalyticsCard` tap interaction and spring animation

PHASE 2: Dashboard Simplification (COMPLETED ✓)

Goal: Simplify the Performance screen to show only high-tier analytics with navigation cards.

Tasks:
- [x] Create `SimpleDistributionChart.tsx` — High-tier only donut (kept original for category screens)
- [x] Create `SimpleVolumeChart.tsx` — High-tier only bar chart (kept original for category screens)
- [x] Create `src/components/molecules/StreaksCard.tsx` — Workout streak + consistency overview
- [x] Wrap each section in `AnalyticsCard` for drill-down navigation
- [x] Update `app/(tabs)/profile.tsx` layout with new card structure
- [x] Create placeholder modal screens (`distribution-analytics.tsx`, `volume-analytics.tsx`)
- [x] Add `modals/_layout.tsx` and register in main layout

Files Modified: 2 (profile.tsx, _layout.tsx)
New Files: 6 (SimpleDistributionChart, SimpleVolumeChart, StreaksCard, modals/_layout, distribution-analytics, volume-analytics)
Supabase Changes: None

Testing Phase 2:
1. Navigate to Performance tab and verify simplified dashboard layout
2. Tap "Set Distribution" card → should navigate to distribution-analytics modal
3. Tap "Weekly Volume" card → should navigate to volume-analytics modal
4. Verify StreaksCard shows streak data (or empty state if no workouts)
5. Verify charts display high-tier data only (Upper/Lower/Core)

PHASE 3: Category Screens & Drill-Down (COMPLETED ✓)

Goal: Create dedicated screens for deep analytics with premium gating.

Tasks:
- [x] Enhance `app/modals/volume-analytics.tsx` — Volume category screen with tiered bar charts
- [x] Enhance `app/modals/distribution-analytics.tsx` — Set Distribution with tiered pie charts
- [x] Create `app/modals/muscle-detail.tsx` — Muscle drill-down with exercise contributions
- [x] Create `TieredPieChart.tsx` — Reusable pie chart with scrollable legend
- [x] Create `TieredBarChart.tsx` — Reusable bar chart for volume data
- [x] Implement `PremiumLock` overlay for mid/low-tier content
- [x] Add scrollable/interactive legends for pie charts
- [x] Implement "Other" grouping for small slices (<3%)

Files Modified: 2 (distribution-analytics.tsx, volume-analytics.tsx, modals/_layout.tsx)
New Files: 3 (TieredPieChart, TieredBarChart, muscle-detail.tsx)
Supabase Changes: None

Testing Phase 3:
1. Navigate to Performance → Set Distribution card → distribution-analytics modal
2. Verify 3 tier cards: Body Region (free chart), Muscle Groups (clean lock card), Specific Muscles (clean lock card)
3. Navigate to Performance → Weekly Volume card → volume-analytics modal
4. Verify 4 cards: Total (free chart), Upper/Lower/Core breakdowns (clean lock cards)
5. Tap any slice/bar → should navigate to muscle-detail screen
6. Verify muscle-detail shows stats, top exercises, and premium insights (lock card)
7. Verify pie chart legends wrap without horizontal scrolling

UX Fixes Applied:
- PremiumLock now shows clean white card with lock message (no blurred preview)
- Pie chart legends use flex-wrap to display all items without scrolling

PHASE 4: Premium Features (COMPLETED ✓)

Goal: Add advanced analytics exclusive to premium users.

Tasks:
- [x] Create `src/components/molecules/VolumeComparisonCard.tsx` — This week vs last week
- [x] Create `src/components/molecules/BalanceAssessment.tsx` — Push/pull symmetry analysis
- [x] Create `src/components/molecules/ExerciseInsights.tsx` — Most used, recently performed exercises
- [x] Add VolumeComparisonCard to volume-analytics modal (premium-gated)
- [x] Add BalanceAssessment to volume-analytics modal (premium-gated)
- [x] Add ExerciseInsights to distribution-analytics modal (premium-gated)
- [ ] TrendlineChart deferred — requires Supabase aggregation for performance
- [ ] Premium unlock flow deferred — requires payment integration

Files Modified: 2 (volume-analytics.tsx, distribution-analytics.tsx)
New Files: 3 (VolumeComparisonCard, BalanceAssessment, ExerciseInsights)
Supabase Changes: None yet (premium status uses stub hook)

Testing Phase 4:
1. Navigate to Volume Analytics → verify lock cards for Comparison and Balance features
2. Navigate to Distribution Analytics → verify lock card for Exercise Insights
3. Test usePremiumStatus hook with `mockPremium: true` to see unlocked premium content

PHASE 5: Polish & Performance (COMPLETED ✓)

Goal: Optimize performance and finalize UX.

Tasks:
- [x] Memoize heavy calculations with useMemo (already in useAnalyticsData hook)
- [x] Add haptic feedback to chart interactions (all charts)
- [x] AnalyticsCard already has haptic + spring animation
- [ ] Profile and optimize re-renders (deferred - needs device testing)
- [ ] Test on low-end Android devices (deferred - user testing)
- [ ] Empty state illustrations (deferred - design asset)

Files Modified: 4 (TieredPieChart, TieredBarChart, SimpleDistributionChart, SimpleVolumeChart)
New Files: None
Supabase Changes: None

Testing Phase 5:
1. Tap pie chart slices → should feel haptic feedback
2. Tap bar chart bars → should feel haptic feedback
3. Tap AnalyticsCard on dashboard → should feel haptic + spring animation

---

Current Status

Phase: COMPLETE ✓
All 5 phases implemented. Analytics overhaul finished.

Remaining items (deferred):
- TrendlineChart (requires Supabase aggregation)
- Premium payment integration
- Device performance profiling
- Empty state illustrations

---

To Be Updated During Development

This overview document should be treated as a living plan:

Revised whenever engineering conflicts arise

Updated when WindSurf suggests better structuring

Updated based on usability feedback you give during testing

Updated whenever new premium ideas emerge or some are dropped