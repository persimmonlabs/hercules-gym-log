/**
 * Navigation constants
 * Shared metadata for primary tab routes.
 */

import { Ionicons } from '@expo/vector-icons';

export const MAIN_TABS_ORDER = ['index', 'calendar', 'workout', 'plans', 'profile'] as const;

export type MainTabRoute = (typeof MAIN_TABS_ORDER)[number];

export interface TabMeta {
  route: MainTabRoute;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export const TAB_META: TabMeta[] = [
  { route: 'index', icon: 'home-outline', label: 'Home' },
  { route: 'calendar', icon: 'calendar-outline', label: 'Calendar' },
  { route: 'workout', icon: 'add-circle-outline', label: 'Add' },
  { route: 'plans', icon: 'document-text-outline', label: 'History' },
  { route: 'profile', icon: 'flash-outline', label: 'Stats' },
];

export const getTabMetaByRoute = (route: string): TabMeta | undefined =>
  TAB_META.find((meta) => meta.route === route);
