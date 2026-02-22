/**
 * useBirthdayWelcome
 * Custom hook that provides a birthday-aware welcome message for the dashboard.
 * Returns "Happy Birthday, Name!" on the user's birthday, otherwise "Welcome, Name!".
 */

import { useMemo } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import { isUserBirthday } from '@/utils/date';

interface UseBirthdayWelcomeReturn {
  /** The welcome message text */
  welcomeMessage: string;
  /** Whether today is the user's birthday */
  isBirthday: boolean;
}

export const useBirthdayWelcome = (): UseBirthdayWelcomeReturn => {
  const profile = useUserProfileStore((state) => state.profile);
  
  const { welcomeMessage, isBirthday } = useMemo(() => {
    const firstName = profile?.firstName || null;
    const dateOfBirth = profile?.dateOfBirth || null;
    
    // Check if today is the user's birthday
    const birthday = isUserBirthday(dateOfBirth);
    
    // Generate appropriate message
    const message = birthday && firstName 
      ? `Happy Birthday, ${firstName}!`
      : firstName 
        ? `Welcome, ${firstName}!`
        : 'Welcome!';
    
    return {
      welcomeMessage: message,
      isBirthday: birthday,
    };
  }, [profile?.firstName, profile?.dateOfBirth]);
  
  return { welcomeMessage, isBirthday };
};
