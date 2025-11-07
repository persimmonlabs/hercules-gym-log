/**
 * Animation Presets for Hercules
 * Central repository for all Reanimated animation configurations
 * 
 * Usage: Import these presets and use them with Reanimated's withSpring or withTiming
 * Never hardcode animation durations or damping values—always use these presets.
 */

import {
  WithSpringConfig,
  WithTimingConfig,
} from 'react-native-reanimated';

// ============================================================================
// SPRING ANIMATIONS (Natural, bouncy motion)
// ============================================================================

/**
 * Bouncy spring animation
 * Use for: Playful button presses, celebratory feedback, energetic transitions
 * Duration: ~600ms
 */
export const springBouncy: WithSpringConfig = {
  damping: 8,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
};

/**
 * Gentle spring animation
 * Use for: Smooth transitions, card reveals, modal appearances
 * Duration: ~1000ms
 */
export const springGentle: WithSpringConfig = {
  damping: 15,
  mass: 1.2,
  stiffness: 80,
  overshootClamping: false,
};

/**
 * Tight spring animation
 * Use for: Quick, precise feedback, scale adjustments
 * Duration: ~400ms
 */
export const springTight: WithSpringConfig = {
  damping: 12,
  mass: 0.9,
  stiffness: 120,
  overshootClamping: false,
};

/**
 * Smooth spring animation
 * Use for: Draggable elements, list item movements
 * Duration: ~800ms
 */
export const springSmooth: WithSpringConfig = {
  damping: 10,
  mass: 1.1,
  stiffness: 90,
  overshootClamping: false,
};

// ============================================================================
// TIMING ANIMATIONS (Linear, predictable motion)
// ============================================================================

/**
 * Fast timing animation
 * Use for: Quick feedback, button press responses, haptic feedback timing
 * Duration: 150ms
 */
export const timingFast: WithTimingConfig = {
  duration: 150,
};

/**
 * Medium timing animation
 * Use for: Standard transitions, page navigation, modal fade-ins
 * Duration: 300ms
 */
export const timingMedium: WithTimingConfig = {
  duration: 300,
};

/**
 * Slow timing animation
 * Use for: Deliberate, dramatic transitions, loading states
 * Duration: 500ms
 */
export const timingSlow: WithTimingConfig = {
  duration: 500,
};

/**
 * Very slow timing animation
 * Use for: Long, flowing transitions, hero animations
 * Duration: 800ms
 */
export const timingVerySlow: WithTimingConfig = {
  duration: 800,
};

// ============================================================================
// EASING FUNCTIONS (For timing animations)
// ============================================================================

export const easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

// ============================================================================
// ANIMATION COMBINATIONS (Ready-to-use patterns)
// ============================================================================

/**
 * Button press animation preset
 * Combines scale-down spring with haptic feedback timing
 */
export const buttonPressAnimation = {
  scaleDown: springBouncy,
  duration: 100, // Haptic timing before action fires
};

/**
 * Text fade-in on first load
 * Smooth opacity transition as text appears
 */
export const textFadeInAnimation = {
  opacity: timingMedium,
  duration: 400,
};

/**
 * Card slide-in from bottom
 * Entrance animation for workout cards
 */
export const cardSlideInAnimation = {
  translateY: springGentle,
  opacity: timingMedium,
  initialY: 40,
};

/**
 * Number count-up animation
 * Numbers animate from 0 to final value smoothly
 */
export const numberCountUpAnimation = {
  duration: 600,
  easing: easing.easeOut,
};

/**
 * Scale pop-in animation
 * Objects grow from small to full size with energy
 */
export const scalePopInAnimation = {
  scale: springBouncy,
  initialScale: 0.85,
  duration: 500,
};

/**
 * Swipe-to-delete animation preset
 * Quick, satisfying slide-out effect
 */
export const swipeDeleteAnimation = {
  slide: timingFast,
  fade: timingMedium,
};

/**
 * Set completion animation preset
 * Celebratory checkmark appearance
 */
export const setCompletionAnimation = {
  scale: springBouncy,
  duration: 600,
};

/**
 * Loading spinner animation preset
 * Continuous smooth rotation
 */
export const loadingSpinnerAnimation = {
  duration: 1000,
  loop: true,
};