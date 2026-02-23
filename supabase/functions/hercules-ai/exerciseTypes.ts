/**
 * Exercise type and bodyweight multiplier lookup for volume calculation.
 * Mirrors frontend/src/data/exercises.json exercise_type and effectiveBodyweightMultiplier.
 * Default (unlisted exercises): type = 'weight', bwMultiplier = 0.02
 */

export type ExerciseType = 'weight' | 'bodyweight' | 'assisted' | 'cardio' | 'duration' | 'reps_only';

// [exerciseType, effectiveBodyweightMultiplier]
// Only entries that differ from default ['weight', 0.02] are listed.
const EXERCISE_OVERRIDES: Record<string, [ExerciseType, number]> = {
  // --- Weight exercises with 0.03 multiplier ---
  'Barbell Bench Press': ['weight', 0.03],
  'Lateral Raises': ['weight', 0.03],
  'Dumbbell Shoulder Press': ['weight', 0.03],
  'Dumbbell Hammer Curls': ['weight', 0.03],
  'EZ Bar Curls': ['weight', 0.03],
  'Barbell Squat': ['weight', 0.03],
  'Barbell Deadlift': ['weight', 0.03],
  'Dumbbell Bulgarian Split Squat': ['weight', 0.03],
  'Dumbbell Bicep Curls': ['weight', 0.03],
  'Dumbbell Front Raises': ['weight', 0.03],
  'Incline Dumbbell Bicep Curls': ['weight', 0.03],
  'Arnold Press': ['weight', 0.03],
  'Barbell Bicep Curl': ['weight', 0.03],
  'Barbell Bulgarian Split Squat': ['weight', 0.03],
  'Barbell Clean': ['weight', 0.03],
  'Barbell Clean and Jerk': ['weight', 0.03],
  'Barbell Drag Curl': ['weight', 0.03],
  'Barbell Floor Press': ['weight', 0.03],
  'Barbell Front Raises': ['weight', 0.03],
  'Barbell Front Squat': ['weight', 0.03],
  'Barbell Glute Bridge': ['weight', 0.03],
  'Barbell Good Mornings': ['weight', 0.03],
  'Barbell Hack Squat': ['weight', 0.03],
  'Barbell Hip Thrust': ['weight', 0.03],
  'Barbell Lunges': ['weight', 0.03],
  'Barbell Overhead Squat': ['weight', 0.03],
  'Barbell Power Clean': ['weight', 0.03],
  'Barbell Preacher Curl': ['weight', 0.03],
  'Barbell Romanian Deadlift': ['weight', 0.03],
  'Barbell Shrugs': ['weight', 0.03],
  'Barbell Snatch': ['weight', 0.03],
  'Barbell Step Ups': ['weight', 0.03],
  'Barbell Upright Rows': ['weight', 0.03],
  'Barbell Bent-Over Row': ['weight', 0.03],
  'Triceps Kickback': ['weight', 0.03],
  'Chest Supported T-Bar Row': ['weight', 0.03],
  'Close Grip Barbell Bench Press': ['weight', 0.03],
  'Decline Barbell Bench Press': ['weight', 0.03],
  'Decline Dumbbell Bench Press': ['weight', 0.03],
  'Decline Dumbbell Fly': ['weight', 0.03],
  'Dumbbell Bench Press': ['weight', 0.03],
  'Dumbbell Bulgarian Split Squats': ['weight', 0.03],
  'Dumbbell Concentration Curl': ['weight', 0.03],
  'Dumbbell Cuban Press': ['weight', 0.03],
  'Dumbbell Deadlifts': ['weight', 0.03],
  'Dumbbell Fly': ['weight', 0.03],
  'Dumbbell Front Squat': ['weight', 0.03],
  'Dumbbell Hammer Preacher Curls': ['weight', 0.03],
  'Dumbbell Lunges': ['weight', 0.03],
  'Dumbbell Reverse Lunges': ['weight', 0.03],
  'Dumbbell Romanian Deadlifts': ['weight', 0.03],
  'Dumbbell Shrugs': ['weight', 0.03],
  'Dumbbell Spider Curl': ['weight', 0.03],
  'Dumbbell Squats': ['weight', 0.03],
  'Dumbbell Step-Ups': ['weight', 0.03],
  'Dumbbell Triceps Kickback': ['weight', 0.03],
  'Dumbbell Upright Row': ['weight', 0.03],
  'Dumbbell Zottman Curls': ['weight', 0.03],
  'EZ Bar Decline Triceps Extension': ['weight', 0.03],
  'Incline Barbell Bench Press': ['weight', 0.03],
  'Incline Barbell Triceps Extension': ['weight', 0.03],
  'Incline Dumbbell Bench Press': ['weight', 0.03],
  'Incline Dumbbell Fly': ['weight', 0.03],
  'Incline Dumbbell Triceps Extension': ['weight', 0.03],
  'Kettlebell Front Squat': ['weight', 0.03],
  'Kettlebell Goblet Squat': ['weight', 0.03],
  'Kettlebell Romanian Deadlift': ['weight', 0.03],
  'Kettlebell Russian Twist': ['weight', 0.03],
  'Kettlebell Swing': ['weight', 0.03],
  'Landmine Press': ['weight', 0.03],
  'Skullcrusher': ['weight', 0.03],
  'Reverse Wrist Curls': ['weight', 0.03],
  'Reverse Dumbbell Bicep Curl': ['weight', 0.03],
  'Reverse EZ Bar Curl': ['weight', 0.03],
  'Reverse Grip Bent Over Barbell Row': ['weight', 0.03],
  'Seated Barbell Calf Raise': ['weight', 0.03],
  'Seated Barbell Military Press': ['weight', 0.03],
  'Seated Bent Over Rear Delt Raise': ['weight', 0.03],
  'Seated Dumbbell Bicep Curls': ['weight', 0.03],
  'Seated Dumbbell Triceps Extension': ['weight', 0.03],
  'Dumbbell Goblet Squat': ['weight', 0.03],
  'Pistol Squats': ['weight', 0.03],
  'Dumbbell Overhead Tricep Extension': ['weight', 0.03],
  'Dumbbell Hip Thrusts': ['weight', 0.03],
  'Single-Arm Dumbbell Row': ['weight', 0.03],
  'Single-Leg Romanian Deadlift': ['weight', 0.03],
  'Weighted Pull-ups': ['weight', 0.03],
  'Weighted Dips': ['weight', 0.03],
  'Medicine Ball Slams': ['weight', 0.03],
  'Barbell Overhead Press': ['weight', 0.03],
  'Trap Bar Deadlift': ['weight', 0.03],
  'Hex Bar Deadlift': ['weight', 0.03],
  'Sumo Deadlift': ['weight', 0.03],
  "Farmer's Carry": ['weight', 0.03],
  'Dumbbell Pullover': ['weight', 0.03],
  'Wrist Curls': ['weight', 0.03],
  'T-Bar Row': ['weight', 0.03],
  'Incline Dumbbell Curl': ['weight', 0.03],
  // --- Cardio ---
  'Treadmill': ['cardio', 0],
  'Stationary Bike': ['cardio', 0],
  'Rowing Machine': ['cardio', 0],
  'Elliptical': ['cardio', 0],
  'Stair Climber': ['cardio', 0],
  'Outdoor Run': ['cardio', 0],
  'Outdoor Walk': ['cardio', 0],
  'Outdoor Cycling': ['cardio', 0],
  'Sprint Intervals': ['cardio', 0],
  // --- Bodyweight ---
  'Push-ups': ['bodyweight', 0.16],
  'Pull-ups': ['bodyweight', 0.22],
  'Chin-ups': ['bodyweight', 0.22],
  'Dips': ['bodyweight', 0.2],
  'Crunches': ['bodyweight', 0.05],
  'Sit-ups': ['bodyweight', 0.06],
  'Leg Raises': ['bodyweight', 0.06],
  'Bodyweight Squats': ['bodyweight', 0.1],
  'Lunges': ['bodyweight', 0.1],
  'Mountain Climbers': ['bodyweight', 0.05],
  'Burpees': ['bodyweight', 0.06],
  'Inverted Rows': ['bodyweight', 0.18],
  'Pistol Squats (Bodyweight)': ['bodyweight', 0.14],
  'Handstand Push-ups': ['bodyweight', 0.22],
  'Muscle-ups': ['bodyweight', 0.25],
  'Jump Squats': ['bodyweight', 0.12],
  'Plyometric Push-ups': ['bodyweight', 0.17],
  'High Knees': ['bodyweight', 0.04],
  'Plank to Push-up': ['bodyweight', 0.15],
  'Bulgarian Split Squats (Bodyweight)': ['bodyweight', 0.12],
  'One-Arm Push-ups': ['bodyweight', 0.2],
  'Archer Pull-ups': ['bodyweight', 0.25],
  'Dragon Flags': ['bodyweight', 0.1],
  'Russian Twist': ['bodyweight', 0.04],
  'Pike Push-ups': ['bodyweight', 0.18],
  'Knee Push-ups': ['bodyweight', 0.12],
  'Jumping Jacks': ['bodyweight', 0.03],
  'Butt Kicks': ['bodyweight', 0.03],
  'Dead Bugs': ['bodyweight', 0.04],
  'Bird Dogs': ['bodyweight', 0.04],
  'Bicycle Crunches': ['bodyweight', 0.05],
  'Bodyweight Reverse Lunges': ['bodyweight', 0.1],
  'Bodyweight Walking Lunges': ['bodyweight', 0.1],
  'Jump Lunges': ['bodyweight', 0.12],
  'Plank Jacks': ['bodyweight', 0.05],
  'Bodyweight Glute Bridges': ['bodyweight', 0.08],
  'Hanging Leg Raise': ['bodyweight', 0.07],
  // --- Assisted ---
  'Assisted Pull-ups': ['assisted', 0.02],
  'Assisted Dips': ['assisted', 0.02],
  'Assisted Chin-ups': ['assisted', 0.02],
  // --- Reps Only ---
  'Band Pull-aparts': ['reps_only', 0],
  'Band Rows': ['reps_only', 0],
  'Band Bicep Curls': ['reps_only', 0],
  'Band Tricep Pushdowns': ['reps_only', 0],
  'Band Face Pulls': ['reps_only', 0],
  'Band Lateral Walks': ['reps_only', 0],
  // --- Duration ---
  'Plank': ['duration', 0],
  'Side Plank': ['duration', 0],
  'Wall Sit': ['duration', 0],
  'Dead Hang': ['duration', 0],
  'Glute Bridge Hold': ['duration', 0],
  'Hollow Body Hold': ['duration', 0],
  'L-Sit Hold': ['duration', 0],
};

const DEFAULT_TYPE: ExerciseType = 'weight';
const DEFAULT_BW_MULT = 0.02;

export const getExerciseTypeInfo = (name: string): { type: ExerciseType; bwMult: number } => {
  const entry = EXERCISE_OVERRIDES[name];
  if (entry) {
    return { type: entry[0], bwMult: entry[1] };
  }
  return { type: DEFAULT_TYPE, bwMult: DEFAULT_BW_MULT };
};

/**
 * Computes the volume contribution of a single completed set.
 * Mirrors frontend/src/utils/volumeCalculation.ts computeSetVolume exactly.
 */
export const computeSetVolume = (
  set: { weight?: number; reps?: number; assistanceWeight?: number },
  exerciseName: string,
  userBodyWeight: number,
): number => {
  const { type, bwMult } = getExerciseTypeInfo(exerciseName);
  const reps = set.reps ?? 0;
  if (reps <= 0) return 0;

  const bw = userBodyWeight > 0 ? userBodyWeight : 0;
  const bwComponent = bw * bwMult;

  switch (type) {
    case 'bodyweight':
      return bwComponent > 0 ? bwComponent * reps : 0;
    case 'assisted': {
      if (bw <= 0) return 0;
      const assistance = set.assistanceWeight ?? 0;
      const effective = Math.max(0, bw - assistance);
      return effective > 0 ? effective * reps : 0;
    }
    case 'weight': {
      const w = set.weight ?? 0;
      const total = bwComponent + w;
      return total > 0 ? total * reps : 0;
    }
    case 'cardio':
    case 'duration':
    case 'reps_only':
    default:
      return 0;
  }
};
