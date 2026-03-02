# RevenueCat Integration Guide

## Overview

This document describes the RevenueCat SDK integration for subscription management in the Hercules app.

## Architecture

### Core Components

1. **RevenueCat Service** (`src/services/revenueCatService.ts`)
   - Singleton service wrapping RevenueCat SDK
   - Handles initialization, purchases, restores, and entitlement checks
   - Syncs subscription status with Supabase

2. **Subscription Store** (`src/store/subscriptionStore.ts`)
   - Zustand store managing subscription state
   - Tracks Pro status, subscription tier, expiration dates
   - Provides actions for purchases and restores

3. **Subscription Types** (`src/types/subscription.ts`)
   - TypeScript interfaces for subscription data
   - Product identifiers: `monthly`, `yearly`, `lifetime`
   - Entitlement ID: `Hercules - Gym & Fitness Tracker Pro`

4. **Pro Feature Hook** (`src/hooks/useProFeature.ts`)
   - Custom hook for checking Pro access
   - Handles paywall navigation automatically

### UI Components

1. **Paywall Modal** (`app/modals/paywall.tsx`)
   - Presents RevenueCat paywall UI
   - Handles purchase flow and success/error states

2. **Customer Center Modal** (`app/modals/customer-center.tsx`)
   - Presents RevenueCat customer center
   - Allows users to manage subscriptions

3. **Profile Screen** (`app/modals/profile.tsx`)
   - Shows subscription status
   - Links to paywall and customer center

## Configuration

### API Key

The RevenueCat API key is configured in `src/services/revenueCatService.ts`:

```typescript
const REVENUECAT_API_KEY = 'test_kSXnoWYIrGEFVoFLfEuXOyxMjeU';
```

**Note:** This is a test key. Replace with production key before release.

### Products

Configure products in RevenueCat dashboard:
- **Monthly**: `monthly` - Monthly subscription
- **Yearly**: `yearly` - Annual subscription  
- **Lifetime**: `lifetime` - One-time purchase

### Entitlement

Entitlement identifier: `Hercules - Gym & Fitness Tracker Pro`

This must be configured in RevenueCat dashboard and attached to all products.

## Usage

### Checking Pro Status

```typescript
import { useProFeature } from '@/hooks/useProFeature';

const MyComponent = () => {
  const { isProUser, requirePro } = useProFeature();

  const handleProFeature = () => {
    // Automatically shows paywall if not Pro
    if (!requirePro()) return;
    
    // Pro feature code here
    console.log('User has Pro access!');
  };

  return (
    <Button 
      onPress={handleProFeature}
      title={isProUser ? "Pro Feature" : "Upgrade to Pro"}
    />
  );
};
```

### Showing Paywall

```typescript
import { useRouter } from 'expo-router';

const MyComponent = () => {
  const router = useRouter();

  const showPaywall = () => {
    router.push('/modals/paywall' as any);
  };

  return <Button onPress={showPaywall} title="Upgrade to Pro" />;
};
```

### Showing Customer Center

```typescript
import { useRouter } from 'expo-router';

const MyComponent = () => {
  const router = useRouter();

  const showCustomerCenter = () => {
    router.push('/modals/customer-center' as any);
  };

  return <Button onPress={showCustomerCenter} title="Manage Subscription" />;
};
```

### Direct Store Access

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

const MyComponent = () => {
  const { 
    isProUser, 
    subscriptionTier, 
    expirationDate,
    willRenew,
    isLifetime,
    purchasePackage,
    restorePurchases 
  } = useSubscriptionStore();

  return (
    <View>
      <Text>Pro Status: {isProUser ? 'Active' : 'Inactive'}</Text>
      <Text>Tier: {subscriptionTier}</Text>
      {expirationDate && (
        <Text>Expires: {new Date(expirationDate).toLocaleDateString()}</Text>
      )}
    </View>
  );
};
```

## Initialization Flow

1. User logs in → `app/_layout.tsx` detects auth session
2. `initializeSubscription(userId)` called automatically
3. RevenueCat SDK configured with user ID
4. Customer info fetched and synced to Supabase
5. Subscription state updated in store

## Purchase Flow

1. User taps "Upgrade to Pro" → Paywall modal opens
2. RevenueCat UI presents available packages
3. User selects package and completes purchase
4. `purchasePackage()` called with selected package
5. Customer info refreshed
6. Pro status synced to Supabase `profiles.is_pro`
7. Success alert shown, modal dismissed

## Restore Flow

1. User taps "Restore Purchases" in Customer Center
2. `restorePurchases()` called
3. RevenueCat checks App Store/Play Store for purchases
4. Customer info refreshed
5. Pro status synced to Supabase
6. Success/failure alert shown

## Supabase Sync

Subscription status is synced to Supabase `profiles` table:

```sql
-- profiles table
is_pro BOOLEAN DEFAULT FALSE
```

This allows:
- Backend API to check Pro status
- Database queries to filter by Pro users
- Consistent state across devices

## Error Handling

### Purchase Errors

```typescript
const result = await purchasePackage(selectedPackage);

if (!result.success) {
  if (result.error === 'Purchase cancelled by user') {
    // User cancelled - no action needed
  } else {
    // Show error alert
    Alert.alert('Purchase Failed', result.error);
  }
}
```

### Network Errors

All RevenueCat operations have built-in error handling:
- Timeouts are handled gracefully
- Network failures show user-friendly errors
- Failed syncs are logged but don't block UI

## Testing

### Test Mode

The integration uses RevenueCat test API key by default. This allows:
- Testing purchases without real money
- Sandbox environment for App Store/Play Store
- Immediate purchase verification

### Testing Checklist

- [ ] Install app on device/simulator
- [ ] Navigate to Profile → Upgrade to Pro
- [ ] Complete test purchase
- [ ] Verify Pro status updates
- [ ] Check Supabase `profiles.is_pro` is `true`
- [ ] Test Pro features are unlocked
- [ ] Test Customer Center access
- [ ] Test restore purchases
- [ ] Test subscription expiration handling

## Production Deployment

### Before Release

1. **Update API Key**
   - Replace test key with production key in `revenueCatService.ts`
   - Get production key from RevenueCat dashboard

2. **Configure Products**
   - Create products in App Store Connect / Google Play Console
   - Link products in RevenueCat dashboard
   - Set pricing for each product

3. **Test on Production**
   - Use TestFlight (iOS) or Internal Testing (Android)
   - Complete real purchases with test accounts
   - Verify all flows work correctly

4. **Enable Webhooks** (Optional)
   - Configure RevenueCat webhooks to Supabase Edge Function
   - Handle subscription events server-side
   - Update Pro status on renewals/cancellations

## Troubleshooting

### "No products available"

- Check RevenueCat dashboard products are configured
- Verify entitlement is attached to products
- Ensure API key is correct

### "Purchase failed"

- Check App Store Connect / Play Console setup
- Verify test account is configured correctly
- Check RevenueCat logs for detailed error

### "Pro status not updating"

- Check Supabase connection
- Verify `profiles.is_pro` column exists
- Check console logs for sync errors

## Additional Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [React Native SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Paywalls](https://www.revenuecat.com/docs/tools/paywalls)
- [Customer Center](https://www.revenuecat.com/docs/tools/customer-center)
