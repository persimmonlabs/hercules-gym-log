import React from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { Text } from '@/components/atoms/Text';
import { MaterialIcons } from '@expo/vector-icons';

export default function PaywallModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isProUser, isLoading, refreshCustomerInfo } = useSubscriptionStore();

  const handleDismiss = () => {
    router.back();
  };

  const presentPaywall = async () => {
    try {
      const result = await RevenueCatUI.presentPaywall();
      
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          await refreshCustomerInfo();
          Alert.alert(
            'Success!',
            'Welcome to Hercules Pro! You now have access to all premium features.',
            [
              {
                text: 'OK',
                onPress: handleDismiss,
              },
            ]
          );
          break;
        case PAYWALL_RESULT.CANCELLED:
          handleDismiss();
          break;
        case PAYWALL_RESULT.ERROR:
          Alert.alert(
            'Error',
            'Something went wrong. Please try again.',
            [
              {
                text: 'OK',
              },
            ]
          );
          break;
      }
    } catch (error) {
      console.error('[Paywall] Error presenting paywall:', error);
      Alert.alert('Error', 'Failed to load paywall. Please try again.');
    }
  };

  React.useEffect(() => {
    if (!isLoading && !isProUser) {
      presentPaywall();
    }
  }, [isLoading, isProUser]);

  if (isProUser) {
    router.back();
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text variant="heading2" style={styles.headerTitle}>Upgrade to Pro</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.primary.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text variant="h2" style={styles.headerTitle}>Upgrade to Pro</Text>
        <View style={styles.placeholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
