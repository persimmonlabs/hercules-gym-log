import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
  PurchasesOfferings,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { ENTITLEMENT_ID, type PurchaseResult, type RestoreResult } from '@/types/subscription';

const REVENUECAT_API_KEY = 'test_kSXnoWYIrGEFVoFLfEuXOyxMjeU';

class RevenueCatService {
  private initialized = false;

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) {
      console.log('[RevenueCat] Already initialized');
      return;
    }

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: userId,
      });

      this.initialized = true;
      console.log('[RevenueCat] Initialized successfully', userId ? `with user: ${userId}` : '');

      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log('[RevenueCat] Customer info updated:', {
          entitlements: Object.keys(customerInfo.entitlements.active),
          isProUser: this.checkProEntitlement(customerInfo),
        });
      });
    } catch (error) {
      console.error('[RevenueCat] Initialization failed:', error);
      throw error;
    }
  }

  async identifyUser(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
      console.log('[RevenueCat] User identified:', userId);
    } catch (error) {
      console.error('[RevenueCat] Failed to identify user:', error);
      throw error;
    }
  }

  async logoutUser(): Promise<void> {
    try {
      await Purchases.logOut();
      console.log('[RevenueCat] User logged out');
    } catch (error) {
      console.error('[RevenueCat] Failed to logout user:', error);
      throw error;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Failed to get customer info:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOfferings> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch (error) {
      console.error('[RevenueCat] Failed to get offerings:', error);
      throw error;
    }
  }

  async getAvailablePackages(): Promise<PurchasesPackage[]> {
    try {
      const offerings = await this.getOfferings();
      
      if (!offerings.current) {
        console.warn('[RevenueCat] No current offering available');
        return [];
      }

      const packages = offerings.current.availablePackages;
      console.log('[RevenueCat] Available packages:', packages.map(p => ({
        identifier: p.identifier,
        product: p.product.identifier,
        price: p.product.priceString,
      })));

      return packages;
    } catch (error) {
      console.error('[RevenueCat] Failed to get available packages:', error);
      return [];
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<PurchaseResult> {
    try {
      console.log('[RevenueCat] Attempting purchase:', packageToPurchase.identifier);
      
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      const isProUser = this.checkProEntitlement(customerInfo);
      
      console.log('[RevenueCat] Purchase successful:', {
        package: packageToPurchase.identifier,
        isProUser,
      });

      return {
        success: true,
        customerInfo,
      };
    } catch (error: any) {
      console.error('[RevenueCat] Purchase failed:', error);
      
      if (error.userCancelled) {
        return {
          success: false,
          error: 'Purchase cancelled by user',
        };
      }

      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  async restorePurchases(): Promise<RestoreResult> {
    try {
      console.log('[RevenueCat] Restoring purchases...');
      
      const customerInfo = await Purchases.restorePurchases();
      
      const isProUser = this.checkProEntitlement(customerInfo);
      
      console.log('[RevenueCat] Restore successful:', {
        isProUser,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });

      return {
        success: true,
        customerInfo,
      };
    } catch (error: any) {
      console.error('[RevenueCat] Restore failed:', error);
      return {
        success: false,
        error: error.message || 'Restore failed',
      };
    }
  }

  checkProEntitlement(customerInfo: CustomerInfo): boolean {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    return entitlement !== undefined && entitlement !== null;
  }

  getSubscriptionTier(customerInfo: CustomerInfo): 'free' | 'monthly' | 'yearly' | 'lifetime' {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (!entitlement) {
      return 'free';
    }

    const productIdentifier = entitlement.productIdentifier.toLowerCase();

    if (productIdentifier.includes('lifetime')) {
      return 'lifetime';
    } else if (productIdentifier.includes('year')) {
      return 'yearly';
    } else if (productIdentifier.includes('month')) {
      return 'monthly';
    }

    return 'free';
  }

  getExpirationDate(customerInfo: CustomerInfo): string | null {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (!entitlement) {
      return null;
    }

    return entitlement.expirationDate;
  }

  getWillRenew(customerInfo: CustomerInfo): boolean {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (!entitlement) {
      return false;
    }

    return entitlement.willRenew;
  }

  isLifetimeSubscription(customerInfo: CustomerInfo): boolean {
    return this.getSubscriptionTier(customerInfo) === 'lifetime';
  }

  async syncWithSupabase(
    userId: string,
    customerInfo: CustomerInfo,
    updateProfileField: (field: string, value: any) => Promise<void>
  ): Promise<void> {
    try {
      const isProUser = this.checkProEntitlement(customerInfo);
      
      await updateProfileField('is_pro', isProUser);
      
      console.log('[RevenueCat] Synced with Supabase:', { userId, isProUser });
    } catch (error) {
      console.error('[RevenueCat] Failed to sync with Supabase:', error);
    }
  }
}

export const revenueCatService = new RevenueCatService();
