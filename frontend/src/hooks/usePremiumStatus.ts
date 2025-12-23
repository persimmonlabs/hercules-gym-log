/**
 * usePremiumStatus Hook
 * Manages premium subscription status for gating analytics features
 * 
 * STUB: Currently returns free tier for all users.
 * TODO: Connect to Supabase user profile or payment system.
 */

import { useState, useEffect } from 'react';

import type { PremiumStatus } from '@/types/analytics';
import { useDevToolsStore } from '@/store/devToolsStore';

// Default free tier status
const FREE_STATUS: PremiumStatus = {
  isPremium: false,
  expiresAt: null,
  tier: 'free',
};

// DEV MODE: Set to true to test premium features
const DEV_PREMIUM_ENABLED = __DEV__;

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
  const [status, setStatus] = useState<PremiumStatus>(FREE_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate async loading
    const loadStatus = async () => {
      setIsLoading(true);
      
      // TODO: Replace with actual Supabase query
      // const { data } = await supabaseClient
      //   .from('profiles')
      //   .select('premium_tier, premium_expires_at')
      //   .single();
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (__DEV__ && premiumOverride !== 'default') {
        if (premiumOverride === 'premium') {
          setStatus(MOCK_PREMIUM_STATUS);
        } else {
          setStatus(FREE_STATUS);
        }
      } else if (mockPremium || DEV_PREMIUM_ENABLED) {
        setStatus(MOCK_PREMIUM_STATUS);
      } else {
        setStatus(FREE_STATUS);
      }
      
      setIsLoading(false);
    };

    loadStatus();
  }, [mockPremium, premiumOverride]);

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
