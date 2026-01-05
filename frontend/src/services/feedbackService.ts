/**
 * Feedback service
 * Handles submission of user feedback to Supabase
 */

import { supabaseClient } from '@/lib/supabaseClient';
import Constants from 'expo-constants';

export interface FeedbackData {
  feedback: string;
  timestamp: string;
  userAgent?: string;
  app_version?: string;
  platform?: string;
  user_id?: string;
}

/**
 * Submit user feedback to Supabase
 */
export const submitFeedback = async (feedback: string, userId?: string): Promise<void> => {
  try {
    const feedbackData: Omit<FeedbackData, 'timestamp'> = {
      feedback,
      app_version: Constants.expoConfig?.version || 'unknown',
      platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'unknown',
      user_id: userId,
    };

    console.log('[FeedbackService] Submitting feedback to Supabase:', feedbackData);

    // Insert feedback into Supabase
    const { error } = await supabaseClient
      .from('feedback')
      .insert([feedbackData]);

    if (error) {
      console.error('[FeedbackService] Supabase error:', error);
      throw new Error(`Failed to save feedback: ${error.message}`);
    }

    console.log('[FeedbackService] Feedback saved successfully to Supabase');

  } catch (error) {
    console.error('[FeedbackService] Error submitting feedback:', error);
    throw new Error('Failed to submit feedback. Please try again later.');
  }
};
