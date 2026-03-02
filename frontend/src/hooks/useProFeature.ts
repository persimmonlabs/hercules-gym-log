import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { triggerHaptic } from '@/utils/haptics';

/**
 * Hook to check if user has Pro access and handle paywall navigation
 * 
 * @returns Object with isProUser status and requirePro function
 * 
 * @example
 * const { isProUser, requirePro } = useProFeature();
 * 
 * const handleProFeature = () => {
 *   if (!requirePro()) return;
 *   // Pro feature code here
 * };
 */
export const useProFeature = () => {
  const router = useRouter();
  const { isProUser, isLoading } = useSubscriptionStore();

  /**
   * Check if user has Pro access. If not, show paywall.
   * @returns true if user has Pro access, false otherwise
   */
  const requirePro = (): boolean => {
    if (isProUser) {
      return true;
    }

    triggerHaptic('warning');
    router.push('/modals/paywall' as any);
    return false;
  };

  /**
   * Check if user has Pro access without showing paywall
   * @returns true if user has Pro access, false otherwise
   */
  const checkPro = (): boolean => {
    return isProUser;
  };

  return {
    isProUser,
    isLoading,
    requirePro,
    checkPro,
  };
};
