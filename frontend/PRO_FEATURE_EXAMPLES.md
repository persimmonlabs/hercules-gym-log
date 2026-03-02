# Pro Feature Implementation Examples

This document provides code examples for implementing Pro feature gates throughout the Hercules app using RevenueCat.

## Pattern 1: Toggle with Pro Gate

Use this pattern for settings toggles that require Pro access.

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';

const MyComponent = () => {
  const router = useRouter();
  const { isProUser } = useSubscriptionStore();
  const [featureEnabled, setFeatureEnabled] = useState(false);

  const handleToggle = (value: boolean) => {
    // Check Pro status when enabling
    if (value && !isProUser) {
      triggerHaptic('warning');
      router.push('/modals/paywall' as any);
      return;
    }

    setFeatureEnabled(value);
    triggerHaptic('selection');
  };

  return (
    <Switch
      value={featureEnabled}
      onValueChange={handleToggle}
    />
  );
};
```

## Pattern 2: Button with Pro Gate

Use this pattern for buttons that trigger Pro features.

```typescript
import { useProFeature } from '@/hooks/useProFeature';

const MyComponent = () => {
  const { isProUser, requirePro } = useProFeature();

  const handleProFeature = () => {
    // Automatically shows paywall if not Pro
    if (!requirePro()) return;

    // Pro feature code here
    console.log('Executing Pro feature...');
  };

  return (
    <Button
      onPress={handleProFeature}
      title={isProUser ? "Advanced Analytics" : "Upgrade for Analytics"}
    />
  );
};
```

## Pattern 3: Conditional Rendering

Use this pattern to show/hide UI elements based on Pro status.

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

const MyComponent = () => {
  const { isProUser } = useSubscriptionStore();

  return (
    <View>
      {/* Always visible */}
      <BasicFeature />

      {/* Pro only */}
      {isProUser && <AdvancedFeature />}

      {/* Free users see upgrade CTA */}
      {!isProUser && (
        <UpgradeCard
          title="Unlock Advanced Features"
          onPress={() => router.push('/modals/paywall' as any)}
        />
      )}
    </View>
  );
};
```

## Pattern 4: Navigation Guard

Use this pattern to protect entire screens.

```typescript
import { useProFeature } from '@/hooks/useProFeature';
import { useEffect } from 'react';

const ProScreen = () => {
  const router = useRouter();
  const { isProUser, isLoading } = useProFeature();

  useEffect(() => {
    // Redirect to paywall if not Pro
    if (!isLoading && !isProUser) {
      router.replace('/modals/paywall' as any);
    }
  }, [isProUser, isLoading]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isProUser) {
    return null; // Will redirect
  }

  return (
    <View>
      <Text>Pro Feature Screen</Text>
    </View>
  );
};
```

## Pattern 5: Feature Limit

Use this pattern to limit features for free users.

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

const WorkoutList = () => {
  const { isProUser } = useSubscriptionStore();
  const workouts = useWorkouts();

  const FREE_LIMIT = 5;
  const displayedWorkouts = isProUser 
    ? workouts 
    : workouts.slice(0, FREE_LIMIT);

  const hasMoreWorkouts = workouts.length > FREE_LIMIT;

  return (
    <View>
      {displayedWorkouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}

      {!isProUser && hasMoreWorkouts && (
        <UpgradeCard
          title={`Unlock ${workouts.length - FREE_LIMIT} more workouts`}
          subtitle="Upgrade to Pro for unlimited workouts"
          onPress={() => router.push('/modals/paywall' as any)}
        />
      )}
    </View>
  );
};
```

## Pattern 6: Badge/Label

Use this pattern to mark Pro features visually.

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

const FeatureCard = ({ title, isPro }: { title: string; isPro: boolean }) => {
  const { isProUser } = useSubscriptionStore();
  const { theme } = useTheme();

  return (
    <View style={styles.card}>
      <Text>{title}</Text>
      
      {isPro && !isProUser && (
        <View style={[styles.proBadge, { backgroundColor: theme.accent.orange }]}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
```

## Pattern 7: Inline Upgrade Prompt

Use this pattern for contextual upgrade prompts.

```typescript
import { useProFeature } from '@/hooks/useProFeature';

const AnalyticsScreen = () => {
  const { isProUser } = useProFeature();

  return (
    <ScrollView>
      {/* Basic analytics - always visible */}
      <BasicStatsCard />

      {isProUser ? (
        <>
          {/* Advanced analytics - Pro only */}
          <AdvancedStatsCard />
          <TrendAnalysisCard />
          <PredictiveInsightsCard />
        </>
      ) : (
        <View style={styles.upgradePrompt}>
          <MaterialIcons name="lock" size={32} color="#FF6B35" />
          <Text variant="heading3">Unlock Advanced Analytics</Text>
          <Text variant="body" color="secondary">
            Get detailed insights, trend analysis, and predictive recommendations
          </Text>
          <Button
            title="Upgrade to Pro"
            onPress={() => router.push('/modals/paywall' as any)}
          />
        </View>
      )}
    </ScrollView>
  );
};
```

## Pattern 8: Trial Period

Use this pattern to offer limited-time Pro access.

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

const MyComponent = () => {
  const { isProUser, subscriptionTier, expirationDate } = useSubscriptionStore();
  const [isTrialActive, setIsTrialActive] = useState(false);

  useEffect(() => {
    // Check if user is in trial period
    if (subscriptionTier === 'free' && expirationDate) {
      const now = new Date();
      const expiry = new Date(expirationDate);
      setIsTrialActive(now < expiry);
    }
  }, [subscriptionTier, expirationDate]);

  const hasAccess = isProUser || isTrialActive;

  return (
    <View>
      {hasAccess ? (
        <ProFeature />
      ) : (
        <UpgradePrompt />
      )}

      {isTrialActive && (
        <Text variant="caption" color="secondary">
          Trial ends: {new Date(expirationDate!).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};
```

## Pattern 9: Subscription Status Display

Use this pattern to show subscription details.

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

const SubscriptionStatusCard = () => {
  const {
    isProUser,
    subscriptionTier,
    expirationDate,
    willRenew,
    isLifetime,
  } = useSubscriptionStore();

  if (!isProUser) {
    return (
      <Card>
        <Text>Free Plan</Text>
        <Button
          title="Upgrade to Pro"
          onPress={() => router.push('/modals/paywall' as any)}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="heading3">
        {isLifetime ? 'Lifetime Pro' : `${subscriptionTier} Subscription`}
      </Text>

      {!isLifetime && expirationDate && (
        <Text variant="body" color="secondary">
          {willRenew ? 'Renews' : 'Expires'} on{' '}
          {new Date(expirationDate).toLocaleDateString()}
        </Text>
      )}

      <Button
        title="Manage Subscription"
        onPress={() => router.push('/modals/customer-center' as any)}
      />
    </Card>
  );
};
```

## Pattern 10: Loading States

Use this pattern to handle loading states gracefully.

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

const MyComponent = () => {
  const { isProUser, isLoading } = useSubscriptionStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Checking subscription status...</Text>
      </View>
    );
  }

  return (
    <View>
      {isProUser ? <ProContent /> : <FreeContent />}
    </View>
  );
};
```

## Common Pro Features to Gate

Here are common features that should require Pro access:

### Analytics & Insights
- Advanced performance metrics
- Trend analysis charts
- Predictive recommendations
- Export data functionality

### Workouts & Programs
- Unlimited custom workouts (free: 5 limit)
- Unlimited programs (free: 2 limit)
- AI workout generation
- Advanced exercise filters

### Training Features
- Smart set suggestions
- Progressive overload tracking
- Deload week recommendations
- Volume landmarks

### Customization
- Custom exercises (free: 10 limit)
- Custom muscle group targeting
- Advanced scheduling options
- Multiple active schedules

### Data & History
- Unlimited workout history (free: 30 days)
- Personal records tracking
- Exercise history analysis
- Backup & restore

## Testing Pro Features

### Test as Free User
```typescript
// In dev tools or console
import { useSubscriptionStore } from '@/store/subscriptionStore';

// Force free status
useSubscriptionStore.setState({ isProUser: false });
```

### Test as Pro User
```typescript
// Force Pro status
useSubscriptionStore.setState({ 
  isProUser: true,
  subscriptionTier: 'yearly',
});
```

### Test Subscription Loading
```typescript
// Force loading state
useSubscriptionStore.setState({ isLoading: true });
```

## Best Practices

1. **Always check Pro status before executing Pro features**
   - Don't rely on UI hiding alone
   - Backend should also verify Pro status

2. **Provide clear upgrade paths**
   - Show what users get with Pro
   - Make upgrade buttons prominent
   - Use contextual upgrade prompts

3. **Handle loading states**
   - Show loading indicators during checks
   - Don't flash Pro content to free users

4. **Use consistent messaging**
   - "Upgrade to Pro" not "Go Premium"
   - Clear feature descriptions
   - Consistent badge styling

5. **Test both states**
   - Test as free user
   - Test as Pro user
   - Test loading states
   - Test error states

6. **Graceful degradation**
   - Free users should still have a great experience
   - Pro features should feel like bonuses, not necessities
   - Never break core functionality for free users
