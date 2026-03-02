# RevenueCat Integration Testing Guide

## Pre-Testing Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create/select your project
3. Configure products:
   - **monthly**: Monthly subscription
   - **yearly**: Annual subscription
   - **lifetime**: One-time purchase
4. Create entitlement: `Hercules - Gym & Fitness Tracker Pro`
5. Attach entitlement to all products

### 3. Test Environment

Use the test API key already configured:
```
test_kSXnoWYIrGEFVoFLfEuXOyxMjeU
```

## Testing Checklist

### ✅ Installation & Initialization

- [ ] App builds successfully
- [ ] No TypeScript errors
- [ ] RevenueCat initializes on app launch
- [ ] User ID is passed to RevenueCat on login
- [ ] Customer info is fetched successfully

**How to verify:**
1. Run app: `npm start`
2. Check console logs for: `[RevenueCat] Initialized successfully`
3. Login with test account
4. Check logs for: `[RevenueCat] User identified: [user-id]`

### ✅ Subscription Store

- [ ] Store initializes with correct default state
- [ ] `isProUser` is false for new users
- [ ] `subscriptionTier` is 'free' for new users
- [ ] Store updates after purchase
- [ ] Store persists across app restarts

**How to verify:**
```typescript
// In React DevTools or console
import { useSubscriptionStore } from '@/store/subscriptionStore';

const state = useSubscriptionStore.getState();
console.log('Subscription State:', {
  isProUser: state.isProUser,
  subscriptionTier: state.subscriptionTier,
  expirationDate: state.expirationDate,
});
```

### ✅ Paywall Modal

- [ ] Modal opens from Profile → "Upgrade to Pro"
- [ ] RevenueCat paywall UI displays
- [ ] Products are loaded and shown
- [ ] Prices display correctly
- [ ] Close button works
- [ ] Purchase flow initiates

**How to verify:**
1. Navigate to Profile (Settings)
2. Tap "Upgrade to Pro"
3. Verify paywall appears
4. Check products are visible
5. Test close button

### ✅ Purchase Flow

- [ ] Selecting a product initiates purchase
- [ ] Test purchase completes successfully
- [ ] Success alert shows
- [ ] `isProUser` updates to `true`
- [ ] Supabase `profiles.is_pro` updates to `true`
- [ ] Modal dismisses after purchase
- [ ] Pro features unlock immediately

**How to verify:**
1. Complete test purchase in paywall
2. Check success alert appears
3. Go to Profile → verify shows "Subscription Status"
4. Check Supabase:
   ```sql
   SELECT id, is_pro FROM profiles WHERE id = '[user-id]';
   ```
5. Test Pro feature (e.g., Smart Set Suggestions)

### ✅ Customer Center

- [ ] Modal opens from Profile → "Subscription Status"
- [ ] RevenueCat customer center displays
- [ ] Subscription details shown
- [ ] "Restore Purchases" button works
- [ ] "Manage Subscription" links work
- [ ] Close button works

**How to verify:**
1. After purchasing, go to Profile
2. Tap "Subscription Status"
3. Verify customer center appears
4. Test restore purchases
5. Check subscription management options

### ✅ Restore Purchases

- [ ] Restore button in Customer Center works
- [ ] Previous purchases are detected
- [ ] `isProUser` updates correctly
- [ ] Success/failure alert shows
- [ ] Supabase syncs correctly

**How to verify:**
1. Delete and reinstall app (or clear data)
2. Login with same account
3. Go to Profile → "Upgrade to Pro"
4. Tap "Restore Purchases" (if available)
5. Verify Pro status restores

### ✅ Profile Screen Integration

- [ ] Shows "Upgrade to Pro" for free users
- [ ] Shows "Subscription Status" for Pro users
- [ ] Shows subscription tier correctly
- [ ] Shows expiration date (if not lifetime)
- [ ] Shows "Next Billing Date" for active subscriptions
- [ ] Shows "Expires On" for cancelled subscriptions
- [ ] Loading state displays during checks

**How to verify:**
1. Test as free user → verify "Upgrade to Pro" shows
2. Purchase subscription → verify status updates
3. Check subscription details display correctly
4. Verify dates format properly

### ✅ Pro Feature Gates

- [ ] Smart Set Suggestions requires Pro
- [ ] Paywall shows when toggling without Pro
- [ ] Feature enables after purchase
- [ ] Other Pro features are gated correctly

**How to verify:**
1. As free user, try to enable Smart Set Suggestions
2. Verify paywall appears
3. Purchase subscription
4. Verify feature can now be enabled

### ✅ Supabase Sync

- [ ] `profiles.is_pro` updates on purchase
- [ ] `profiles.is_pro` updates on restore
- [ ] Sync works across devices
- [ ] Sync handles network errors gracefully

**How to verify:**
```sql
-- Check Supabase profiles table
SELECT 
  id,
  first_name,
  last_name,
  is_pro,
  updated_at
FROM profiles
WHERE id = '[user-id]';
```

### ✅ Error Handling

- [ ] Network errors show user-friendly messages
- [ ] Purchase cancellation handled gracefully
- [ ] Invalid products handled correctly
- [ ] Timeout errors don't crash app
- [ ] Error logs are helpful for debugging

**How to verify:**
1. Test with airplane mode on
2. Cancel purchase mid-flow
3. Check console logs for errors
4. Verify app doesn't crash

### ✅ Edge Cases

- [ ] Works with new user accounts
- [ ] Works with existing user accounts
- [ ] Handles multiple devices
- [ ] Handles app reinstall
- [ ] Handles subscription expiration
- [ ] Handles subscription cancellation
- [ ] Handles refunds (test in sandbox)

## Manual Test Scenarios

### Scenario 1: New User Purchase Flow

1. Create new account
2. Navigate to Profile
3. Tap "Upgrade to Pro"
4. Select monthly subscription
5. Complete test purchase
6. Verify Pro status updates
7. Test Pro feature access

**Expected Result:** User becomes Pro, features unlock, Supabase updates.

### Scenario 2: Restore Purchases

1. Purchase subscription on Device A
2. Install app on Device B
3. Login with same account
4. Navigate to Customer Center
5. Tap "Restore Purchases"
6. Verify Pro status restores

**Expected Result:** Pro status restores on Device B.

### Scenario 3: Subscription Expiration

1. Purchase monthly subscription
2. Wait for expiration (or manually expire in RevenueCat)
3. Open app after expiration
4. Verify Pro status removed
5. Verify Pro features locked

**Expected Result:** User returns to free tier, features lock.

### Scenario 4: Upgrade from Monthly to Yearly

1. Purchase monthly subscription
2. Navigate to Customer Center
3. Select yearly subscription
4. Complete upgrade
5. Verify subscription tier updates

**Expected Result:** Subscription upgrades, tier updates in app.

### Scenario 5: Lifetime Purchase

1. Navigate to Paywall
2. Select lifetime option
3. Complete purchase
4. Verify shows "Lifetime Pro"
5. Verify no expiration date shown

**Expected Result:** Lifetime access granted, no renewal date.

## Automated Testing (Future)

### Unit Tests

```typescript
// subscriptionStore.test.ts
describe('Subscription Store', () => {
  it('initializes with free tier', () => {
    const state = useSubscriptionStore.getState();
    expect(state.isProUser).toBe(false);
    expect(state.subscriptionTier).toBe('free');
  });

  it('updates after purchase', async () => {
    const mockCustomerInfo = { /* ... */ };
    await useSubscriptionStore.getState().purchasePackage(mockPackage);
    expect(useSubscriptionStore.getState().isProUser).toBe(true);
  });
});
```

### Integration Tests

```typescript
// paywall.test.tsx
describe('Paywall Modal', () => {
  it('opens from profile screen', () => {
    render(<ProfileModal />);
    fireEvent.press(screen.getByText('Upgrade to Pro'));
    expect(screen.getByText('Upgrade to Pro')).toBeVisible();
  });

  it('closes after successful purchase', async () => {
    // Test purchase flow
  });
});
```

## Performance Testing

### Metrics to Monitor

- [ ] Time to initialize RevenueCat: < 1s
- [ ] Time to fetch customer info: < 2s
- [ ] Time to load products: < 3s
- [ ] Time to complete purchase: < 10s
- [ ] Memory usage: < 50MB increase
- [ ] No memory leaks after multiple purchases

## Production Readiness Checklist

Before releasing to production:

- [ ] Replace test API key with production key
- [ ] Configure production products in App Store/Play Store
- [ ] Test with real money (small amounts)
- [ ] Verify webhooks are configured (if using)
- [ ] Test on multiple devices
- [ ] Test on multiple OS versions
- [ ] Verify analytics tracking
- [ ] Document support procedures
- [ ] Train support team on subscription issues
- [ ] Set up monitoring/alerts

## Common Issues & Solutions

### Issue: "No products available"

**Solution:**
1. Check RevenueCat dashboard products
2. Verify entitlement is attached
3. Ensure API key is correct
4. Check App Store Connect/Play Console setup

### Issue: "Purchase failed"

**Solution:**
1. Verify test account is configured
2. Check sandbox environment
3. Review RevenueCat logs
4. Ensure products are approved

### Issue: "Pro status not updating"

**Solution:**
1. Check Supabase connection
2. Verify `profiles.is_pro` column exists
3. Check console logs for sync errors
4. Manually refresh customer info

### Issue: "Restore not working"

**Solution:**
1. Verify same Apple ID/Google account
2. Check RevenueCat dashboard for user
3. Ensure purchases are in sandbox
4. Try logging out and back in

## Support & Debugging

### Enable Debug Logging

```typescript
// In revenueCatService.ts
if (__DEV__) {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE); // More detailed logs
}
```

### Check RevenueCat Dashboard

1. Go to RevenueCat Dashboard
2. Navigate to Customers
3. Search for user by ID or email
4. View purchase history and entitlements

### Check Supabase

```sql
-- View user subscription status
SELECT 
  p.id,
  p.email,
  p.is_pro,
  p.updated_at
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = '[user-email]';
```

### Export Logs

```typescript
// Add to app for debugging
const exportLogs = () => {
  const state = useSubscriptionStore.getState();
  console.log('=== SUBSCRIPTION DEBUG ===');
  console.log('isProUser:', state.isProUser);
  console.log('subscriptionTier:', state.subscriptionTier);
  console.log('expirationDate:', state.expirationDate);
  console.log('customerInfo:', state.customerInfo);
  console.log('========================');
};
```

## Contact & Resources

- **RevenueCat Support:** support@revenuecat.com
- **Documentation:** https://www.revenuecat.com/docs
- **Community:** https://community.revenuecat.com
- **Status Page:** https://status.revenuecat.com
