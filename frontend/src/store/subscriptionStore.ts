import { create } from 'zustand';
import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { revenueCatService } from '@/services/revenueCatService';
import { useUserProfileStore } from './userProfileStore';
import { supabaseClient } from '@/lib/supabaseClient';
import type { SubscriptionState, SubscriptionTier, PurchaseResult, RestoreResult } from '@/types/subscription';

interface SubscriptionStore extends SubscriptionState {
  initializeSubscription: (userId?: string) => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  loadAvailablePackages: () => Promise<void>;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<RestoreResult>;
  identifyUser: (userId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: SubscriptionState = {
  isProUser: false,
  subscriptionTier: 'free',
  expirationDate: null,
  willRenew: false,
  isLifetime: false,
  customerInfo: null,
  availablePackages: [],
  isLoading: false,
  error: null,
};

const getUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('[SubscriptionStore] Failed to get user ID:', error);
    return null;
  }
};

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  ...initialState,

  initializeSubscription: async (userId?: string) => {
    try {
      set({ isLoading: true, error: null });

      await revenueCatService.initialize(userId);

      const customerInfo = await revenueCatService.getCustomerInfo();
      const packages = await revenueCatService.getAvailablePackages();

      const isProUser = revenueCatService.checkProEntitlement(customerInfo);
      const subscriptionTier = revenueCatService.getSubscriptionTier(customerInfo);
      const expirationDate = revenueCatService.getExpirationDate(customerInfo);
      const willRenew = revenueCatService.getWillRenew(customerInfo);
      const isLifetime = revenueCatService.isLifetimeSubscription(customerInfo);

      set({
        customerInfo,
        availablePackages: packages,
        isProUser,
        subscriptionTier,
        expirationDate,
        willRenew,
        isLifetime,
        isLoading: false,
      });

      const currentUserId = userId || await getUserId();
      if (currentUserId) {
        const updateProfileField = useUserProfileStore.getState().updateProfileField;
        await revenueCatService.syncWithSupabase(currentUserId, customerInfo, updateProfileField);
      }
    } catch (error: any) {
      console.error('[SubscriptionStore] Initialization failed:', error);
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to initialize subscription' 
      });
    }
  },

  refreshCustomerInfo: async () => {
    try {
      set({ isLoading: true, error: null });

      const customerInfo = await revenueCatService.getCustomerInfo();

      const isProUser = revenueCatService.checkProEntitlement(customerInfo);
      const subscriptionTier = revenueCatService.getSubscriptionTier(customerInfo);
      const expirationDate = revenueCatService.getExpirationDate(customerInfo);
      const willRenew = revenueCatService.getWillRenew(customerInfo);
      const isLifetime = revenueCatService.isLifetimeSubscription(customerInfo);

      set({
        customerInfo,
        isProUser,
        subscriptionTier,
        expirationDate,
        willRenew,
        isLifetime,
        isLoading: false,
      });

      const currentUserId = await getUserId();
      if (currentUserId) {
        const updateProfileField = useUserProfileStore.getState().updateProfileField;
        await revenueCatService.syncWithSupabase(currentUserId, customerInfo, updateProfileField);
      }
    } catch (error: any) {
      console.error('[SubscriptionStore] Refresh failed:', error);
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to refresh customer info' 
      });
    }
  },

  loadAvailablePackages: async () => {
    try {
      const packages = await revenueCatService.getAvailablePackages();
      set({ availablePackages: packages });
    } catch (error: any) {
      console.error('[SubscriptionStore] Failed to load packages:', error);
      set({ error: error.message || 'Failed to load packages' });
    }
  },

  purchasePackage: async (packageToPurchase: PurchasesPackage): Promise<PurchaseResult> => {
    try {
      set({ isLoading: true, error: null });

      const result = await revenueCatService.purchasePackage(packageToPurchase);

      if (result.success && result.customerInfo) {
        const isProUser = revenueCatService.checkProEntitlement(result.customerInfo);
        const subscriptionTier = revenueCatService.getSubscriptionTier(result.customerInfo);
        const expirationDate = revenueCatService.getExpirationDate(result.customerInfo);
        const willRenew = revenueCatService.getWillRenew(result.customerInfo);
        const isLifetime = revenueCatService.isLifetimeSubscription(result.customerInfo);

        set({
          customerInfo: result.customerInfo,
          isProUser,
          subscriptionTier,
          expirationDate,
          willRenew,
          isLifetime,
          isLoading: false,
        });

        const currentUserId = await getUserId();
        if (currentUserId) {
          const updateProfileField = useUserProfileStore.getState().updateProfileField;
          await revenueCatService.syncWithSupabase(currentUserId, result.customerInfo, updateProfileField);
        }
      } else {
        set({ isLoading: false, error: result.error || null });
      }

      return result;
    } catch (error: any) {
      console.error('[SubscriptionStore] Purchase failed:', error);
      set({ 
        isLoading: false, 
        error: error.message || 'Purchase failed' 
      });
      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  },

  restorePurchases: async (): Promise<RestoreResult> => {
    try {
      set({ isLoading: true, error: null });

      const result = await revenueCatService.restorePurchases();

      if (result.success && result.customerInfo) {
        const isProUser = revenueCatService.checkProEntitlement(result.customerInfo);
        const subscriptionTier = revenueCatService.getSubscriptionTier(result.customerInfo);
        const expirationDate = revenueCatService.getExpirationDate(result.customerInfo);
        const willRenew = revenueCatService.getWillRenew(result.customerInfo);
        const isLifetime = revenueCatService.isLifetimeSubscription(result.customerInfo);

        set({
          customerInfo: result.customerInfo,
          isProUser,
          subscriptionTier,
          expirationDate,
          willRenew,
          isLifetime,
          isLoading: false,
        });

        const currentUserId = await getUserId();
        if (currentUserId) {
          const updateProfileField = useUserProfileStore.getState().updateProfileField;
          await revenueCatService.syncWithSupabase(currentUserId, result.customerInfo, updateProfileField);
        }
      } else {
        set({ isLoading: false, error: result.error || null });
      }

      return result;
    } catch (error: any) {
      console.error('[SubscriptionStore] Restore failed:', error);
      set({ 
        isLoading: false, 
        error: error.message || 'Restore failed' 
      });
      return {
        success: false,
        error: error.message || 'Restore failed',
      };
    }
  },

  identifyUser: async (userId: string) => {
    try {
      await revenueCatService.identifyUser(userId);
      await get().refreshCustomerInfo();
    } catch (error: any) {
      console.error('[SubscriptionStore] Failed to identify user:', error);
      set({ error: error.message || 'Failed to identify user' });
    }
  },

  logoutUser: async () => {
    try {
      await revenueCatService.logoutUser();
      set({ ...initialState });
    } catch (error: any) {
      console.error('[SubscriptionStore] Failed to logout user:', error);
      set({ error: error.message || 'Failed to logout user' });
    }
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  reset: () => set({ ...initialState }),
}));
