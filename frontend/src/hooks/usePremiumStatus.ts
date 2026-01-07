/**
 * usePremiumStatus Hook
 * Manages premium subscription status for gating analytics features
 * 
 * Now connected to settingsStore for real Pro status management
 */

import { useState, useEffect } from 'react';

import type { PremiumStatus } from '@/types/analytics';
import { useDevToolsStore } from '@/store/devToolsStore';
import { useSettingsStore } from '@/store/settingsStore';

// Default free tier status
const FREE_STATUS: PremiumStatus = {
  isPremium: false,
  expiresAt: null,
  tier: 'free',
};

// DEV MODE: Set to false to test free tier by default
// Use the dev toggle in Profile settings to switch between free/premium
const DEV_PREMIUM_ENABLED = false;

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

export const usePremiumStatus = (options: UsePremiumStatusOptions = {}) => {
  const { mockPremium = false } = options;
  const premiumOverride = useDevToolsStore((state) => state.premiumOverride);
  const isPro = useSettingsStore((state) => state.isPro);
  const [status, setStatus] = useState<PremiumStatus>(FREE_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate async loading
    const loadStatus = async () => {
      setIsLoading(true);
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      let finalStatus: PremiumStatus;

      // Check dev tools override first (highest priority)
      if (premiumOverride === 'premium') {
        finalStatus = MOCK_PREMIUM_STATUS;
      } else if (premiumOverride === 'free') {
        finalStatus = FREE_STATUS;
      } else if (isPro) {
        // User has Pro status from promo code or purchase
        finalStatus = {
          isPremium: true,
          expiresAt: null,
          tier: 'lifetime',
        };
      } else if (mockPremium || DEV_PREMIUM_ENABLED) {
        // Default behavior when no override is set
        finalStatus = MOCK_PREMIUM_STATUS;
      } else {
        finalStatus = FREE_STATUS;
      }
      
      setStatus(finalStatus);
      setIsLoading(false);
    };

    loadStatus();
  }, [mockPremium, premiumOverride, isPro]);

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
