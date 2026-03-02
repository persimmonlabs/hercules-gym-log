import React from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { Text } from '@/components/atoms/Text';
import { MaterialIcons } from '@expo/vector-icons';

export default function CustomerCenterModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isProUser, isLoading, refreshCustomerInfo } = useSubscriptionStore();

  const handleDismiss = () => {
    router.back();
  };

  const presentCustomerCenter = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
      
      // Refresh customer info after customer center is dismissed
      await refreshCustomerInfo();
      handleDismiss();
    } catch (error) {
      console.error('[CustomerCenter] Error presenting customer center:', error);
      Alert.alert('Error', 'Failed to load customer center. Please try again.');
      handleDismiss();
    }
  };

  React.useEffect(() => {
    if (!isLoading) {
      presentCustomerCenter();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text variant="heading2" style={styles.headerTitle}>Manage Subscription</Text>
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
        <Text variant="heading2" style={styles.headerTitle}>Manage Subscription</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
