import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export type SubscriptionTier = 'free' | 'monthly' | 'yearly' | 'lifetime';

export type ProductIdentifier = 'monthly' | 'yearly' | 'lifetime';

export const ENTITLEMENT_ID = 'Hercules - Gym & Fitness Tracker Pro';

export interface SubscriptionState {
  isProUser: boolean;
  subscriptionTier: SubscriptionTier;
  expirationDate: string | null;
  willRenew: boolean;
  isLifetime: boolean;
  customerInfo: CustomerInfo | null;
  availablePackages: PurchasesPackage[];
  isLoading: boolean;
  error: string | null;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}
