/**
 * usePremiumStatus Hook
 * Manages premium subscription status for gating analytics features
 * 
 * Uses RevenueCat subscription store as primary source of truth,
 * with settingsStore.isPro as a fallback for backward compatibility
 * (e.g. promo codes or manual overrides in Supabase).
 */

import { useState, useEffect } from 'react';

import type { PremiumStatus } from '@/types/analytics';
import { useDevToolsStore } from '@/store/devToolsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';

// Default free tier status
const FREE_STATUS: PremiumStatus = {
  isPremium: false,
  expiresAt: null,
  tier: 'free',
};

// Mock premium status for development/testing
const MOCK_PREMIUM_STATUS: PremiumStatus = {
  isPremium: true,
  expiresAt: null,
  tier: 'lifetime',
};

interface UsePremiumStatusOptions {
  /** Enable mock premium for development testing */
  mockPremium?: boolean;
}

export const usePremiumStatus = (_options: UsePremiumStatusOptions = {}) => {
  const premiumOverride = useDevToolsStore((state) => state.premiumOverride);
  const isPro = useSettingsStore((state) => state.isPro);
  const {
    isProUser: rcIsProUser,
    subscriptionTier: rcTier,
    expirationDate: rcExpirationDate,
    isLoading: rcIsLoading,
  } = useSubscriptionStore();
  const [status, setStatus] = useState<PremiumStatus>(FREE_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let finalStatus: PremiumStatus;

    // Check dev tools override first (highest priority, dev-only)
    if (premiumOverride === 'premium') {
      finalStatus = MOCK_PREMIUM_STATUS;
    } else if (premiumOverride === 'free') {
      finalStatus = FREE_STATUS;
    } else if (rcIsProUser) {
      // RevenueCat says user has active entitlement
      finalStatus = {
        isPremium: true,
        expiresAt: rcExpirationDate,
        tier: rcTier === 'lifetime' ? 'lifetime' : 'pro',
      };
    } else if (isPro) {
      // Fallback: Supabase profiles.is_pro (promo codes, manual grants)
      finalStatus = {
        isPremium: true,
        expiresAt: null,
        tier: 'lifetime',
      };
    } else {
      // Default: free tier — all new users start here
      finalStatus = FREE_STATUS;
    }
    
    setStatus(finalStatus);
    setIsLoading(rcIsLoading);
  }, [premiumOverride, isPro, rcIsProUser, rcTier, rcExpirationDate, rcIsLoading]);

  // Helper functions for feature gating
  const canAccessMidTier = status.isPremium || status.tier === 'pro' || status.tier === 'lifetime';
  const canAccessLowTier = status.tier === 'pro' || status.tier === 'lifetime';
  const canAccessTrendlines = status.isPremium;
  const canAccessComparisons = status.isPremium;
  const canAccessBalanceAnalysis = status.isPremium;
  const canAccessExerciseInsights = status.isPremium;

  return {
    status,
    isLoading,
    
    // Convenience booleans
    isPremium: status.isPremium,
    isFree: !status.isPremium,
    tier: status.tier,
    
    // Feature access
    canAccessMidTier,
    canAccessLowTier,
    canAccessTrendlines,
    canAccessComparisons,
    canAccessBalanceAnalysis,
    canAccessExerciseInsights,
  };
};

export type { PremiumStatus };
