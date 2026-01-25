import type { SupabaseClient } from '@supabase/supabase-js';

import { formatDuration, formatNumber, formatVolume, formatWeight } from './formatters.ts';

interface ExerciseSet {
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  completed?: boolean;
}

interface SessionExercise {
  name?: string;
  exerciseId?: string;
  exerciseName?: string;
  sets?: ExerciseSet[];
}

interface WorkoutSession {
  id: string;
  name: string;
  date: string;
  duration?: number;
  exercises: SessionExercise[];
}

export interface StatResult {
  success: boolean;
  data: Record<string, unknown> | null;
  error?: string;
}

const parseExercises = (exercises: unknown): SessionExercise[] => {
  if (!Array.isArray(exercises)) return [];
  return exercises as SessionExercise[];
};

const calculateSetVolume = (set: ExerciseSet): number => {
  const weight = set.weight ?? 0;
  const reps = set.reps ?? 0;
  return weight * reps;
};

const getExerciseName = (exercise: SessionExercise): string => {
  return exercise.name ?? exercise.exerciseName ?? exercise.exerciseId ?? 'Unknown';
};

const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const fuzzyMatch = (query: string, target: string): boolean => {
  const normalizedQuery = normalizeString(query);
  const normalizedTarget = normalizeString(target);
  
  if (normalizedTarget === normalizedQuery) return true;
  if (normalizedTarget.includes(normalizedQuery)) return true;
  if (normalizedQuery.includes(normalizedTarget)) return true;
  
  const queryWords = query.toLowerCase().split(/\s+/);
  const targetWords = target.toLowerCase().split(/\s+/);
  const matchedWords = queryWords.filter(qw => 
    targetWords.some(tw => tw.includes(qw) || qw.includes(tw))
  );
  return matchedWords.length >= Math.ceil(queryWords.length * 0.5);
};

const findMatchingExercises = (
  allExerciseNames: string[],
  searchName: string
): { exact: string | null; fuzzy: string[] } => {
  const normalizedSearch = normalizeString(searchName);
  
  const exactMatch = allExerciseNames.find(
    name => normalizeString(name) === normalizedSearch
  );
  
  if (exactMatch) {
    return { exact: exactMatch, fuzzy: [] };
  }
  
  const fuzzyMatches = allExerciseNames.filter(name => fuzzyMatch(searchName, name));
  return { exact: null, fuzzy: fuzzyMatches };
};

const fetchAllSessions = async (
  supabase: SupabaseClient,
  userId: string
): Promise<WorkoutSession[]> => {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, name, date, duration, exercises')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.warn('[HerculesAI] Stats: Failed to fetch sessions', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    duration: row.duration,
    exercises: parseExercises(row.exercises),
  }));
};

const getAllExerciseNames = (sessions: WorkoutSession[]): string[] => {
  const names = new Set<string>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name !== 'Unknown') {
        names.add(name);
      }
    }
  }
  return Array.from(names);
};

export const getExerciseVolumeAllTime = async (
  supabase: SupabaseClient,
  userId: string,
  exerciseName?: string
): Promise<StatResult> => {
  const sessions = await fetchAllSessions(supabase, userId);
  const allExerciseNames = getAllExerciseNames(sessions);

  const volumeByExercise: Record<string, number> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;

      const sets = exercise.sets ?? [];
      for (const set of sets) {
        if (set.completed !== false) {
          const volume = calculateSetVolume(set);
          volumeByExercise[name] = (volumeByExercise[name] ?? 0) + volume;
        }
      }
    }
  }

  if (exerciseName) {
    const { exact, fuzzy } = findMatchingExercises(allExerciseNames, exerciseName);
    
    if (exact) {
      const total = volumeByExercise[exact] ?? 0;
      return {
        success: true,
        data: {
          exerciseName: exact,
          totalVolume: total,
          totalVolumeFormatted: formatVolume(total),
          unit: 'lbs',
        },
      };
    }
    
    if (fuzzy.length > 0) {
      const results = fuzzy.map(name => {
        const vol = volumeByExercise[name] ?? 0;
        return {
          exerciseName: name,
          totalVolume: vol,
          totalVolumeFormatted: formatVolume(vol),
        };
      });
      return {
        success: true,
        data: {
          searchedFor: exerciseName,
          exactMatchFound: false,
          similarExercises: results,
          suggestion: `No exact match for "${exerciseName}". Did you mean: ${fuzzy.join(', ')}?`,
          unit: 'lbs',
        },
      };
    }
    
    return {
      success: true,
      data: {
        exerciseName,
        totalVolume: 0,
        exactMatchFound: false,
        availableExercises: allExerciseNames.slice(0, 20),
        message: `No exercise found matching "${exerciseName}". Here are your available exercises.`,
        unit: 'lbs',
      },
    };
  }

  const sorted = Object.entries(volumeByExercise)
    .map(([name, volume]) => ({
      exerciseName: name,
      totalVolume: volume,
      totalVolumeFormatted: formatVolume(volume),
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  return {
    success: true,
    data: {
      exercises: sorted,
      topExercise: sorted[0] ?? null,
      unit: 'lbs',
    },
  };
};

export const getExerciseMaxWeight = async (
  supabase: SupabaseClient,
  userId: string,
  exerciseName?: string
): Promise<StatResult> => {
  const sessions = await fetchAllSessions(supabase, userId);
  const allExerciseNames = getAllExerciseNames(sessions);

  const maxByExercise: Record<string, { weight: number; reps: number; date: string }> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;

      const sets = exercise.sets ?? [];
      for (const set of sets) {
        if (set.completed !== false && set.weight) {
          const current = maxByExercise[name];
          if (!current || set.weight > current.weight) {
            maxByExercise[name] = {
              weight: set.weight,
              reps: set.reps ?? 0,
              date: session.date,
            };
          }
        }
      }
    }
  }

  if (exerciseName) {
    const { exact, fuzzy } = findMatchingExercises(allExerciseNames, exerciseName);
    
    if (exact) {
      const record = maxByExercise[exact] ?? null;
      const weight = record?.weight ?? 0;
      return {
        success: true,
        data: {
          exerciseName: exact,
          maxWeight: weight,
          maxWeightFormatted: formatWeight(weight),
          repsAtMax: record?.reps ?? 0,
          date: record?.date ?? null,
          unit: 'lbs',
        },
      };
    }
    
    if (fuzzy.length > 0) {
      const results = fuzzy.map(name => ({
        exerciseName: name,
        ...(maxByExercise[name] ?? { weight: 0, reps: 0, date: null }),
      }));
      return {
        success: true,
        data: {
          searchedFor: exerciseName,
          exactMatchFound: false,
          similarExercises: results,
          suggestion: `No exact match for "${exerciseName}". Did you mean: ${fuzzy.join(', ')}?`,
          unit: 'lbs',
        },
      };
    }
    
    return {
      success: true,
      data: {
        exerciseName,
        maxWeight: 0,
        exactMatchFound: false,
        availableExercises: allExerciseNames.slice(0, 20),
        message: `No exercise found matching "${exerciseName}".`,
        unit: 'lbs',
      },
    };
  }

  const sorted = Object.entries(maxByExercise)
    .map(([name, record]) => ({
      exerciseName: name,
      maxWeight: record.weight,
      maxWeightFormatted: formatWeight(record.weight),
      repsAtMax: record.reps,
      date: record.date,
    }))
    .sort((a, b) => b.maxWeight - a.maxWeight);

  return {
    success: true,
    data: {
      exercises: sorted,
      unit: 'lbs',
    },
  };
};

export const getWorkoutStats = async (
  supabase: SupabaseClient,
  userId: string
): Promise<StatResult> => {
  const sessions = await fetchAllSessions(supabase, userId);

  if (sessions.length === 0) {
    return {
      success: true,
      data: {
        totalWorkouts: 0,
        totalDuration: 0,
        averageDuration: 0,
        totalSets: 0,
        totalReps: 0,
        totalVolume: 0,
        firstWorkoutDate: null,
        lastWorkoutDate: null,
      },
    };
  }

  let totalDuration = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;

  for (const session of sessions) {
    totalDuration += session.duration ?? 0;

    for (const exercise of session.exercises) {
      const sets = exercise.sets ?? [];
      for (const set of sets) {
        if (set.completed !== false) {
          totalSets++;
          totalReps += set.reps ?? 0;
          totalVolume += calculateSetVolume(set);
        }
      }
    }
  }

  const sortedByDate = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const avgDuration = Math.round(totalDuration / sessions.length);

  return {
    success: true,
    data: {
      totalWorkouts: sessions.length,
      totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      averageDuration: avgDuration,
      averageDurationFormatted: formatDuration(avgDuration),
      totalSets,
      totalSetsFormatted: formatNumber(totalSets),
      totalReps,
      totalRepsFormatted: formatNumber(totalReps),
      totalVolume,
      totalVolumeFormatted: formatVolume(totalVolume),
      firstWorkoutDate: sortedByDate[0]?.date ?? null,
      lastWorkoutDate: sortedByDate[sortedByDate.length - 1]?.date ?? null,
      unit: 'lbs',
    },
  };
};

export const getExerciseProgress = async (
  supabase: SupabaseClient,
  userId: string,
  exerciseName: string
): Promise<StatResult> => {
  if (!exerciseName) {
    return { success: false, data: null, error: 'exerciseName is required' };
  }

  const sessions = await fetchAllSessions(supabase, userId);
  const allExerciseNames = getAllExerciseNames(sessions);
  const { exact, fuzzy } = findMatchingExercises(allExerciseNames, exerciseName);
  
  const targetName = exact ?? (fuzzy.length === 1 ? fuzzy[0] : null);
  
  if (!targetName && fuzzy.length > 1) {
    return {
      success: true,
      data: {
        searchedFor: exerciseName,
        exactMatchFound: false,
        similarExercises: fuzzy,
        suggestion: `Multiple matches found for "${exerciseName}". Did you mean: ${fuzzy.join(', ')}?`,
      },
    };
  }
  
  if (!targetName) {
    return {
      success: true,
      data: {
        exerciseName,
        exactMatchFound: false,
        availableExercises: allExerciseNames.slice(0, 20),
        message: `No exercise found matching "${exerciseName}".`,
      },
    };
  }

  const progressData: { date: string; maxWeight: number; totalVolume: number; sets: number }[] = [];

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (normalizeString(name) !== normalizeString(targetName)) {
        continue;
      }

      const sets = exercise.sets ?? [];
      let maxWeight = 0;
      let totalVolume = 0;
      let setCount = 0;

      for (const set of sets) {
        if (set.completed !== false) {
          setCount++;
          totalVolume += calculateSetVolume(set);
          if (set.weight && set.weight > maxWeight) {
            maxWeight = set.weight;
          }
        }
      }

      if (setCount > 0) {
        progressData.push({
          date: session.date,
          maxWeight,
          totalVolume,
          sets: setCount,
        });
      }
    }
  }

  const sorted = progressData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const weightChange = first && last ? last.maxWeight - first.maxWeight : 0;

  return {
    success: true,
    data: {
      exerciseName: targetName,
      sessions: sorted,
      totalSessions: sorted.length,
      weightChangeOverTime: weightChange,
      unit: 'lbs',
    },
  };
};

const EXERCISE_PRIMARY_MUSCLE: Record<string, string> = {
  // Chest exercises
  'barbell bench press': 'Chest',
  'dumbbell bench press': 'Chest',
  'incline barbell bench press': 'Chest',
  'incline dumbbell bench press': 'Chest',
  'decline barbell bench press': 'Chest',
  'decline dumbbell bench press': 'Chest',
  'chest press machine': 'Chest',
  'incline chest press machine': 'Chest',
  'decline chest press machine': 'Chest',
  'cable crossover': 'Chest',
  'cable flat bench fly': 'Chest',
  'incline cable fly': 'Chest',
  'seated cable fly': 'Chest',
  'dumbbell fly': 'Chest',
  'incline dumbbell fly': 'Chest',
  'decline dumbbell fly': 'Chest',
  'push-ups': 'Chest',
  'butterfly machine': 'Chest',
  'smith machine bench press': 'Chest',
  'smith machine incline bench press': 'Chest',
  'smith machine decline bench press': 'Chest',
  'barbell floor press': 'Chest',
  // Back exercises
  'barbell bent-over row': 'Back',
  'dumbbell row': 'Back',
  'seated cable rows': 'Back',
  'seated row machine': 'Back',
  'wide grip lat pulldown': 'Back',
  'close grip lat pulldown': 'Back',
  'cable underhand pulldown': 'Back',
  'pull-ups': 'Back',
  'chin-ups': 'Back',
  'chest supported t-bar row': 'Back',
  'barbell deadlift': 'Back',
  'dumbbell deadlifts': 'Back',
  'face pull': 'Back',
  'hyperextensions': 'Back',
  'smith machine bent over row': 'Back',
  'smith machine deadlift': 'Back',
  'inverted rows': 'Back',
  'kneeling single arm lat pulldown': 'Back',
  'reverse grip bent over barbell row': 'Back',
  // Shoulder exercises
  'dumbbell shoulder press': 'Shoulders',
  'seated shoulder press machine': 'Shoulders',
  'seated barbell military press': 'Shoulders',
  'arnold press': 'Shoulders',
  'lateral raises': 'Shoulders',
  'lateral raise machine': 'Shoulders',
  'dumbbell front raises': 'Shoulders',
  'barbell front raises': 'Shoulders',
  'cable front raises': 'Shoulders',
  'rear delt machine': 'Shoulders',
  'seated bent over rear delt raise': 'Shoulders',
  'barbell upright rows': 'Shoulders',
  'dumbbell upright row': 'Shoulders',
  'cable upright row': 'Shoulders',
  'landmine press': 'Shoulders',
  'dumbbell cuban press': 'Shoulders',
  'band face pulls': 'Shoulders',
  // Biceps exercises
  'barbell bicep curl': 'Biceps',
  'dumbbell bicep curls': 'Biceps',
  'dumbbell hammer curls': 'Biceps',
  'cable bicep curl': 'Biceps',
  'cable hammer curl': 'Biceps',
  'ez bar curls': 'Biceps',
  'barbell preacher curl': 'Biceps',
  'cable preacher curl': 'Biceps',
  'preacher curl machine': 'Biceps',
  'dumbbell concentration curl': 'Biceps',
  'incline dumbbell bicep curls': 'Biceps',
  'seated dumbbell bicep curls': 'Biceps',
  'dumbbell hammer preacher curls': 'Biceps',
  'dumbbell spider curl': 'Biceps',
  'dumbbell zottman curls': 'Biceps',
  'barbell drag curl': 'Biceps',
  'reverse dumbbell bicep curl': 'Biceps',
  'reverse ez bar curl': 'Biceps',
  'bicep curl machine': 'Biceps',
  'band bicep curls': 'Biceps',
  // Triceps exercises
  'cable triceps pushdown': 'Triceps',
  'triceps extension machine': 'Triceps',
  'seated triceps dip machine': 'Triceps',
  'skullcrusher': 'Triceps',
  'close grip barbell bench press': 'Triceps',
  'smith machine close grip bench press': 'Triceps',
  'dips': 'Triceps',
  'assisted dips': 'Triceps',
  'overhead cable triceps extension': 'Triceps',
  'kneeling cable triceps extension': 'Triceps',
  'cable incline triceps extension': 'Triceps',
  'seated dumbbell triceps extension': 'Triceps',
  'incline dumbbell triceps extension': 'Triceps',
  'incline barbell triceps extension': 'Triceps',
  'ez bar decline triceps extension': 'Triceps',
  'triceps kickback': 'Triceps',
  'dumbbell triceps kickback': 'Triceps',
  'band tricep pushdowns': 'Triceps',
  // Quads exercises
  'barbell squat': 'Quads',
  'barbell front squat': 'Quads',
  'dumbbell squats': 'Quads',
  'dumbbell front squat': 'Quads',
  'leg press': 'Quads',
  'leg extensions': 'Quads',
  'hack squat machine': 'Quads',
  'barbell hack squat': 'Quads',
  'smith machine hack squat': 'Quads',
  'dumbbell lunges': 'Quads',
  'barbell lunges': 'Quads',
  'lunges': 'Quads',
  'dumbbell reverse lunges': 'Quads',
  'dumbbell bulgarian split squat': 'Quads',
  'dumbbell bulgarian split squats': 'Quads',
  'barbell bulgarian split squat': 'Quads',
  'smith machine bulgarian split squat': 'Quads',
  'bulgarian split squats (bodyweight)': 'Quads',
  'air squats': 'Quads',
  'kettlebell goblet squat': 'Quads',
  'kettlebell front squat': 'Quads',
  'barbell overhead squat': 'Quads',
  'dumbbell step-ups': 'Quads',
  'barbell step ups': 'Quads',
  'pistol squats': 'Quads',
  'jump squats': 'Quads',
  // Hamstrings exercises
  'barbell romanian deadlift': 'Hamstrings',
  'dumbbell romanian deadlifts': 'Hamstrings',
  'kettlebell romanian deadlift': 'Hamstrings',
  'seated leg curl': 'Hamstrings',
  'lying leg curl': 'Hamstrings',
  'barbell good mornings': 'Hamstrings',
  'smith machine good morning': 'Hamstrings',
  // Glutes exercises
  'barbell hip thrust': 'Glutes',
  'hip thrust machine': 'Glutes',
  'smith machine hip thrust': 'Glutes',
  'barbell glute bridge': 'Glutes',
  'glute bridge hold': 'Glutes',
  'cable pull through': 'Glutes',
  'cable hip abduction': 'Glutes',
  'cable hip adduction': 'Glutes',
  'thigh abductor': 'Glutes',
  'thigh adductor': 'Glutes',
  'kettlebell swing': 'Glutes',
  // Calves exercises
  'standing calf raise machine': 'Calves',
  'seated calf raise machine': 'Calves',
  'seated barbell calf raise': 'Calves',
  'calf press on a leg press machine': 'Calves',
  // Core exercises
  'plank': 'Core',
  'side plank': 'Core',
  'crunches': 'Core',
  'sit-ups': 'Core',
  'decline sit-ups': 'Core',
  'leg raises': 'Core',
  'cable crunch': 'Core',
  'seated ab crunch machine': 'Core',
  'russian twist': 'Core',
  'kettlebell russian twist': 'Core',
  'decline oblique crunch': 'Core',
  'hollow body hold': 'Core',
  'l-sit hold': 'Core',
  'dragon flags': 'Core',
  'plank to push-up': 'Core',
  'mountain climbers': 'Core',
  // Traps exercises
  'barbell shrugs': 'Traps',
  'dumbbell shrugs': 'Traps',
  // Forearms exercises
  'reverse wrist curls': 'Forearms',
  'dead hang': 'Forearms',
  // Other/Full body
  'burpees': 'Core',
  'high knees': 'Core',
  'barbell clean': 'Back',
  'barbell clean and jerk': 'Shoulders',
  'barbell power clean': 'Back',
  'barbell snatch': 'Shoulders',
  'muscle-ups': 'Back',
  'assisted pull-ups': 'Back',
  'assisted chin-ups': 'Back',
  'archer pull-ups': 'Back',
  'handstand push-ups': 'Shoulders',
  'one-arm push-ups': 'Chest',
  'plyometric push-ups': 'Chest',
  'band pull-aparts': 'Back',
  'band rows': 'Back',
  'band lateral walks': 'Glutes',
  'wall sit': 'Quads',
  'seated back extension machine': 'Back',
};

const getMuscleGroupForExercise = (exerciseName: string): string => {
  const normalized = exerciseName.toLowerCase().trim();
  
  if (EXERCISE_PRIMARY_MUSCLE[normalized]) {
    return EXERCISE_PRIMARY_MUSCLE[normalized];
  }
  
  for (const [pattern, muscle] of Object.entries(EXERCISE_PRIMARY_MUSCLE)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return muscle;
    }
  }
  
  const keywords: Record<string, string> = {
    'chest': 'Chest', 'bench': 'Chest', 'fly': 'Chest', 'push': 'Chest',
    'back': 'Back', 'row': 'Back', 'pull': 'Back', 'lat': 'Back',
    'shoulder': 'Shoulders', 'delt': 'Shoulders', 'press': 'Shoulders',
    'bicep': 'Biceps', 'curl': 'Biceps',
    'tricep': 'Triceps', 'pushdown': 'Triceps', 'extension': 'Triceps',
    'squat': 'Quads', 'leg press': 'Quads', 'lunge': 'Quads',
    'hamstring': 'Hamstrings', 'leg curl': 'Hamstrings',
    'glute': 'Glutes', 'hip': 'Glutes',
    'calf': 'Calves',
    'ab': 'Core', 'core': 'Core', 'crunch': 'Core', 'plank': 'Core',
    'forearm': 'Forearms', 'wrist': 'Forearms', 'grip': 'Forearms',
    'trap': 'Traps', 'shrug': 'Traps',
  };
  
  for (const [keyword, muscle] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) {
      return muscle;
    }
  }
  
  return 'Other';
};

export const getMuscleGroupVolume = async (
  supabase: SupabaseClient,
  userId: string
): Promise<StatResult> => {
  const sessions = await fetchAllSessions(supabase, userId);

  const volumeByMuscleGroup: Record<string, number> = {};
  const exercisesByMuscleGroup: Record<string, Set<string>> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;
      
      const muscleGroup = getMuscleGroupForExercise(name);
      const sets = exercise.sets ?? [];

      for (const set of sets) {
        if (set.completed !== false) {
          const volume = calculateSetVolume(set);
          if (volume > 0) {
            volumeByMuscleGroup[muscleGroup] = (volumeByMuscleGroup[muscleGroup] ?? 0) + volume;
            if (!exercisesByMuscleGroup[muscleGroup]) {
              exercisesByMuscleGroup[muscleGroup] = new Set();
            }
            exercisesByMuscleGroup[muscleGroup].add(name);
          }
        }
      }
    }
  }

  const sorted = Object.entries(volumeByMuscleGroup)
    .filter(([_, volume]) => volume > 0)
    .map(([muscleGroup, volume]) => ({
      muscleGroup,
      totalVolume: volume,
      totalVolumeFormatted: formatVolume(volume),
      exercises: Array.from(exercisesByMuscleGroup[muscleGroup] || []),
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  return {
    success: true,
    data: {
      muscleGroups: sorted,
      mostTrainedMuscle: sorted[0]?.muscleGroup ?? null,
      leastTrainedMuscle: sorted[sorted.length - 1]?.muscleGroup ?? null,
      unit: 'lbs',
    },
  };
};

export const getWorkoutFrequency = async (
  supabase: SupabaseClient,
  userId: string,
  days: number = 30
): Promise<StatResult> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, date')
    .eq('user_id', userId)
    .gte('date', cutoffStr)
    .order('date', { ascending: true });

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  const sessions = data || [];
  const workoutDates = sessions.map((s) => s.date);
  const uniqueDays = new Set(workoutDates).size;

  const byDayOfWeek: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const dateStr of workoutDates) {
    const dayIndex = new Date(dateStr).getDay();
    byDayOfWeek[dayNames[dayIndex]]++;
  }

  const avgPerWeek = (sessions.length / days) * 7;

  return {
    success: true,
    data: {
      periodDays: days,
      totalWorkouts: sessions.length,
      uniqueDays,
      averagePerWeek: Math.round(avgPerWeek * 10) / 10,
      byDayOfWeek,
    },
  };
};

export const getPersonalRecords = async (
  supabase: SupabaseClient,
  userId: string
): Promise<StatResult> => {
  const sessions = await fetchAllSessions(supabase, userId);

  const records: Record<string, { weight: number; reps: number; date: string; volume: number }> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;
      
      const sets = exercise.sets ?? [];

      for (const set of sets) {
        if (set.completed !== false && set.weight) {
          const current = records[name];
          if (!current || set.weight > current.weight) {
            records[name] = {
              weight: set.weight,
              reps: set.reps ?? 0,
              date: session.date,
              volume: calculateSetVolume(set),
            };
          }
        }
      }
    }
  }

  const sorted = Object.entries(records)
    .map(([exerciseName, record]) => ({
      exerciseName,
      weight: record.weight,
      weightFormatted: formatWeight(record.weight),
      reps: record.reps,
      date: record.date,
      volume: record.volume,
      volumeFormatted: formatVolume(record.volume),
    }))
    .sort((a, b) => b.weight - a.weight);

  return {
    success: true,
    data: {
      personalRecords: sorted,
      totalExercisesWithPRs: sorted.length,
      unit: 'lbs',
    },
  };
};

export const getRecentWorkoutSummary = async (
  supabase: SupabaseClient,
  userId: string,
  count: number = 5
): Promise<StatResult> => {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, name, date, duration, exercises')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(count);

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  const sessions = (data || []).map((row) => {
    const exercises = parseExercises(row.exercises);
    let totalSets = 0;
    let totalVolume = 0;

    for (const exercise of exercises) {
      const sets = exercise.sets ?? [];
      for (const set of sets) {
        if (set.completed !== false) {
          totalSets++;
          totalVolume += calculateSetVolume(set);
        }
      }
    }

    return {
      id: row.id,
      name: row.name,
      date: row.date,
      duration: row.duration,
      durationFormatted: row.duration ? formatDuration(row.duration) : null,
      exerciseCount: exercises.length,
      totalSets,
      totalVolume,
      totalVolumeFormatted: formatVolume(totalVolume),
    };
  });

  return {
    success: true,
    data: {
      recentWorkouts: sessions,
      unit: 'lbs',
    },
  };
};

export const getWorkoutsForDate = async (
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<StatResult> => {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, name, date, duration, exercises')
    .eq('user_id', userId)
    .eq('date', date)
    .order('date', { ascending: false });

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  const sessions = (data || []).map((row) => {
    const exercises = parseExercises(row.exercises);
    let totalSets = 0;
    let totalVolume = 0;
    const exerciseNames: string[] = [];

    for (const exercise of exercises) {
      const name = getExerciseName(exercise);
      if (name !== 'Unknown') exerciseNames.push(name);
      
      const sets = exercise.sets ?? [];
      for (const set of sets) {
        if (set.completed !== false) {
          totalSets++;
          totalVolume += calculateSetVolume(set);
        }
      }
    }

    return {
      id: row.id,
      name: row.name,
      date: row.date,
      duration: row.duration,
      durationFormatted: row.duration ? formatDuration(row.duration) : null,
      exerciseNames,
      exerciseCount: exercises.length,
      totalSets,
      totalVolume,
      totalVolumeFormatted: formatVolume(totalVolume),
    };
  });

  const workedOut = sessions.length > 0;

  return {
    success: true,
    data: {
      date,
      workedOut,
      workoutCount: sessions.length,
      workouts: sessions,
      summary: workedOut 
        ? `Yes, you worked out on ${date}. You completed ${sessions.length} workout(s).`
        : `No workouts recorded for ${date}.`,
      unit: 'lbs',
    },
  };
};

const EXERCISE_CATALOG: Array<{ id: string; name: string; equipment: string[] }> = [
  // Weight exercises
  { id: 'exercise_001', name: 'Barbell Bench Press', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_002', name: 'Chest Press Machine', equipment: ['Machine'] },
  { id: 'exercise_003', name: 'Butterfly Machine', equipment: ['Machine'] },
  { id: 'exercise_004', name: 'Lateral Raises', equipment: ['Dumbbell'] },
  { id: 'exercise_005', name: 'Dumbbell Shoulder Press', equipment: ['Dumbbell'] },
  { id: 'exercise_006', name: 'Cable Triceps Pushdown', equipment: ['Cable'] },
  { id: 'exercise_007', name: 'Seated Triceps Dip Machine', equipment: ['Machine'] },
  { id: 'exercise_008', name: 'Wide Grip Lat Pulldown', equipment: ['Cable'] },
  { id: 'exercise_009', name: 'Bicep Curl Machine', equipment: ['Machine'] },
  { id: 'exercise_010', name: 'Seated Row Machine', equipment: ['Machine'] },
  { id: 'exercise_011', name: 'Dumbbell Hammer Curls', equipment: ['Dumbbell'] },
  { id: 'exercise_012', name: 'EZ Bar Curls', equipment: ['Barbell'] },
  { id: 'exercise_013', name: 'Hyperextensions', equipment: ['Bench'] },
  { id: 'exercise_014', name: 'Leg Press', equipment: ['Machine'] },
  { id: 'exercise_015', name: 'Leg Extensions', equipment: ['Machine'] },
  { id: 'exercise_016', name: 'Seated Leg Curl', equipment: ['Machine'] },
  { id: 'exercise_017', name: 'Thigh Adductor', equipment: ['Machine'] },
  { id: 'exercise_018', name: 'Thigh Abductor', equipment: ['Machine'] },
  { id: 'exercise_019', name: 'Barbell Squat', equipment: ['Barbell', 'Rack'] },
  { id: 'exercise_020', name: 'Barbell Deadlift', equipment: ['Barbell'] },
  { id: 'exercise_021', name: 'Cable Bicep Curl', equipment: ['Cable'] },
  { id: 'exercise_022', name: 'Seated Shoulder Press Machine', equipment: ['Machine'] },
  { id: 'exercise_023', name: 'Dumbbell Bulgarian Split Squat', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_024', name: 'Standing Calf Raise Machine', equipment: ['Machine'] },
  { id: 'exercise_025', name: 'Lying Leg Curl', equipment: ['Machine'] },
  { id: 'exercise_026', name: 'Triceps Extension Machine', equipment: ['Machine'] },
  { id: 'exercise_027', name: 'Dumbbell Bicep Curls', equipment: ['Dumbbell'] },
  { id: 'exercise_028', name: 'Dumbbell Front Raises', equipment: ['Dumbbell'] },
  { id: 'exercise_029', name: 'Incline Dumbbell Bicep Curls', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_030', name: 'Arnold Press', equipment: ['Dumbbell'] },
  { id: 'exercise_031', name: 'Barbell Bicep Curl', equipment: ['Barbell'] },
  { id: 'exercise_032', name: 'Barbell Bulgarian Split Squat', equipment: ['Barbell', 'Rack'] },
  { id: 'exercise_033', name: 'Barbell Clean', equipment: ['Barbell'] },
  { id: 'exercise_034', name: 'Barbell Clean and Jerk', equipment: ['Barbell'] },
  { id: 'exercise_035', name: 'Barbell Drag Curl', equipment: ['Barbell'] },
  { id: 'exercise_036', name: 'Barbell Floor Press', equipment: ['Barbell', 'Floor'] },
  { id: 'exercise_037', name: 'Barbell Front Raises', equipment: ['Barbell'] },
  { id: 'exercise_038', name: 'Barbell Front Squat', equipment: ['Barbell', 'Rack'] },
  { id: 'exercise_039', name: 'Barbell Glute Bridge', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_040', name: 'Barbell Good Mornings', equipment: ['Barbell', 'Rack'] },
  { id: 'exercise_041', name: 'Barbell Hack Squat', equipment: ['Barbell'] },
  { id: 'exercise_042', name: 'Barbell Hip Thrust', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_043', name: 'Barbell Lunges', equipment: ['Barbell', 'Rack'] },
  { id: 'exercise_044', name: 'Barbell Overhead Squat', equipment: ['Barbell', 'Rack'] },
  { id: 'exercise_045', name: 'Barbell Power Clean', equipment: ['Barbell'] },
  { id: 'exercise_046', name: 'Barbell Preacher Curl', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_047', name: 'Barbell Romanian Deadlift', equipment: ['Barbell'] },
  { id: 'exercise_048', name: 'Barbell Shrugs', equipment: ['Barbell'] },
  { id: 'exercise_049', name: 'Barbell Snatch', equipment: ['Barbell'] },
  { id: 'exercise_050', name: 'Barbell Step Ups', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_051', name: 'Barbell Upright Rows', equipment: ['Barbell'] },
  { id: 'exercise_052', name: 'Barbell Bent-Over Row', equipment: ['Barbell'] },
  { id: 'exercise_053', name: 'Triceps Kickback', equipment: ['Dumbbell'] },
  { id: 'exercise_054', name: 'Cable Crossover', equipment: ['Cable'] },
  { id: 'exercise_055', name: 'Cable Flat Bench Fly', equipment: ['Cable', 'Bench'] },
  { id: 'exercise_056', name: 'Cable Front Raises', equipment: ['Cable'] },
  { id: 'exercise_057', name: 'Cable Hammer Curl', equipment: ['Cable'] },
  { id: 'exercise_058', name: 'Cable Hip Abduction', equipment: ['Cable'] },
  { id: 'exercise_059', name: 'Cable Hip Adduction', equipment: ['Cable'] },
  { id: 'exercise_060', name: 'Cable Incline Triceps Extension', equipment: ['Cable', 'Bench'] },
  { id: 'exercise_061', name: 'Cable Preacher Curl', equipment: ['Cable', 'Bench'] },
  { id: 'exercise_062', name: 'Cable Pull Through', equipment: ['Cable'] },
  { id: 'exercise_063', name: 'Cable Crunch', equipment: ['Cable'] },
  { id: 'exercise_064', name: 'Cable Underhand Pulldown', equipment: ['Cable'] },
  { id: 'exercise_065', name: 'Cable Upright Row', equipment: ['Cable'] },
  { id: 'exercise_066', name: 'Calf Press on a Leg Press Machine', equipment: ['Machine'] },
  { id: 'exercise_067', name: 'Chest Supported T-Bar Row', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_068', name: 'Close Grip Barbell Bench Press', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_069', name: 'Close Grip Lat Pulldown', equipment: ['Cable'] },
  { id: 'exercise_070', name: 'Decline Barbell Bench Press', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_071', name: 'Decline Chest Press Machine', equipment: ['Machine'] },
  { id: 'exercise_072', name: 'Decline Dumbbell Bench Press', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_073', name: 'Decline Dumbbell Fly', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_074', name: 'Decline Oblique Crunch', equipment: ['Bench'] },
  { id: 'exercise_075', name: 'Decline Sit-ups', equipment: ['Bench'] },
  { id: 'exercise_076', name: 'Dumbbell Bench Press', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_077', name: 'Dumbbell Bulgarian Split Squats', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_078', name: 'Dumbbell Concentration Curl', equipment: ['Dumbbell'] },
  { id: 'exercise_079', name: 'Dumbbell Cuban Press', equipment: ['Dumbbell'] },
  { id: 'exercise_080', name: 'Dumbbell Deadlifts', equipment: ['Dumbbell'] },
  { id: 'exercise_081', name: 'Dumbbell Fly', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_082', name: 'Dumbbell Front Squat', equipment: ['Dumbbell'] },
  { id: 'exercise_083', name: 'Dumbbell Hammer Preacher Curls', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_084', name: 'Dumbbell Lunges', equipment: ['Dumbbell'] },
  { id: 'exercise_085', name: 'Dumbbell Reverse Lunges', equipment: ['Dumbbell'] },
  { id: 'exercise_086', name: 'Dumbbell Romanian Deadlifts', equipment: ['Dumbbell'] },
  { id: 'exercise_087', name: 'Dumbbell Shrugs', equipment: ['Dumbbell'] },
  { id: 'exercise_088', name: 'Dumbbell Spider Curl', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_089', name: 'Dumbbell Squats', equipment: ['Dumbbell'] },
  { id: 'exercise_090', name: 'Dumbbell Step-Ups', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_091', name: 'Dumbbell Triceps Kickback', equipment: ['Dumbbell'] },
  { id: 'exercise_092', name: 'Dumbbell Upright Row', equipment: ['Dumbbell'] },
  { id: 'exercise_093', name: 'Dumbbell Zottman Curls', equipment: ['Dumbbell'] },
  { id: 'exercise_094', name: 'EZ Bar Decline Triceps Extension', equipment: ['Barbell'] },
  { id: 'exercise_095', name: 'Face Pull', equipment: ['Cable'] },
  { id: 'exercise_096', name: 'Hack Squat Machine', equipment: ['Machine'] },
  { id: 'exercise_097', name: 'Hip Thrust Machine', equipment: ['Machine'] },
  { id: 'exercise_098', name: 'Incline Barbell Bench Press', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_099', name: 'Incline Barbell Triceps Extension', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_100', name: 'Incline Cable Fly', equipment: ['Cable', 'Bench'] },
  { id: 'exercise_101', name: 'Incline Chest Press Machine', equipment: ['Machine'] },
  { id: 'exercise_102', name: 'Incline Dumbbell Bench Press', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_103', name: 'Incline Dumbbell Fly', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_104', name: 'Incline Dumbbell Triceps Extension', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_105', name: 'Kettlebell Front Squat', equipment: ['Kettlebell'] },
  { id: 'exercise_106', name: 'Kettlebell Goblet Squat', equipment: ['Kettlebell'] },
  { id: 'exercise_107', name: 'Kettlebell Romanian Deadlift', equipment: ['Kettlebell'] },
  { id: 'exercise_108', name: 'Kettlebell Russian Twist', equipment: ['Kettlebell'] },
  { id: 'exercise_109', name: 'Kettlebell Swing', equipment: ['Kettlebell'] },
  { id: 'exercise_110', name: 'Kneeling Cable Triceps Extension', equipment: ['Cable'] },
  { id: 'exercise_111', name: 'Kneeling Single Arm Lat Pulldown', equipment: ['Cable'] },
  { id: 'exercise_112', name: 'Landmine Press', equipment: ['Barbell'] },
  { id: 'exercise_113', name: 'Lateral Raise Machine', equipment: ['Machine'] },
  { id: 'exercise_114', name: 'Skullcrusher', equipment: ['Barbell'] },
  { id: 'exercise_115', name: 'Lying Chest Press Machine', equipment: ['Machine'] },
  { id: 'exercise_116', name: 'Overhead Cable Triceps Extension', equipment: ['Cable'] },
  { id: 'exercise_117', name: 'Reverse Wrist Curls', equipment: ['Barbell'] },
  { id: 'exercise_118', name: 'Preacher Curl Machine', equipment: ['Machine'] },
  { id: 'exercise_119', name: 'Reverse Dumbbell Bicep Curl', equipment: ['Dumbbell'] },
  { id: 'exercise_120', name: 'Reverse EZ Bar Curl', equipment: ['Barbell'] },
  { id: 'exercise_121', name: 'Rear Delt Machine', equipment: ['Machine'] },
  { id: 'exercise_122', name: 'Reverse Grip Bent Over Barbell Row', equipment: ['Barbell'] },
  { id: 'exercise_123', name: 'Seated Ab Crunch Machine', equipment: ['Machine'] },
  { id: 'exercise_124', name: 'Seated Back Extension Machine', equipment: ['Machine'] },
  { id: 'exercise_125', name: 'Seated Barbell Calf Raise', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_126', name: 'Seated Barbell Military Press', equipment: ['Barbell', 'Bench'] },
  { id: 'exercise_127', name: 'Seated Bent Over Rear Delt Raise', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_128', name: 'Seated Cable Fly', equipment: ['Cable'] },
  { id: 'exercise_129', name: 'Seated Cable Rows', equipment: ['Cable'] },
  { id: 'exercise_130', name: 'Seated Calf Raise Machine', equipment: ['Machine'] },
  { id: 'exercise_131', name: 'Seated Dumbbell Bicep Curls', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_132', name: 'Seated Dumbbell Triceps Extension', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_133', name: 'Smith Machine Bench Press', equipment: ['Machine'] },
  { id: 'exercise_134', name: 'Smith Machine Bent Over Row', equipment: ['Machine'] },
  { id: 'exercise_135', name: 'Smith Machine Bulgarian Split Squat', equipment: ['Machine', 'Bench'] },
  { id: 'exercise_136', name: 'Smith Machine Close Grip Bench Press', equipment: ['Machine'] },
  { id: 'exercise_137', name: 'Smith Machine Deadlift', equipment: ['Machine'] },
  { id: 'exercise_138', name: 'Smith Machine Decline Bench Press', equipment: ['Machine', 'Bench'] },
  { id: 'exercise_139', name: 'Smith Machine Good Morning', equipment: ['Machine'] },
  { id: 'exercise_140', name: 'Smith Machine Hack Squat', equipment: ['Machine'] },
  { id: 'exercise_141', name: 'Smith Machine Hip Thrust', equipment: ['Machine', 'Bench'] },
  { id: 'exercise_142', name: 'Smith Machine Incline Bench Press', equipment: ['Machine', 'Bench'] },
  // Cardio exercises
  { id: 'cardio_001', name: 'Treadmill', equipment: ['Cardio Machine'] },
  { id: 'cardio_002', name: 'Stationary Bike', equipment: ['Cardio Machine'] },
  { id: 'cardio_003', name: 'Rowing Machine', equipment: ['Cardio Machine'] },
  { id: 'cardio_004', name: 'Elliptical', equipment: ['Cardio Machine'] },
  { id: 'cardio_005', name: 'Stair Climber', equipment: ['Cardio Machine'] },
  { id: 'cardio_006', name: 'Outdoor Run', equipment: ['Bodyweight'] },
  { id: 'cardio_007', name: 'Outdoor Walk', equipment: ['Bodyweight'] },
  { id: 'cardio_008', name: 'Outdoor Cycling', equipment: ['Bodyweight'] },
  { id: 'cardio_009', name: 'Sprint Intervals', equipment: ['Bodyweight'] },
  // Bodyweight exercises
  { id: 'bodyweight_001', name: 'Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_002', name: 'Pull-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_003', name: 'Chin-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_004', name: 'Dips', equipment: ['Bodyweight'] },
  { id: 'bodyweight_005', name: 'Crunches', equipment: ['Bodyweight'] },
  { id: 'bodyweight_006', name: 'Sit-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_007', name: 'Leg Raises', equipment: ['Bodyweight'] },
  { id: 'bodyweight_008', name: 'Air Squats', equipment: ['Bodyweight'] },
  { id: 'bodyweight_009', name: 'Lunges', equipment: ['Bodyweight'] },
  { id: 'bodyweight_010', name: 'Mountain Climbers', equipment: ['Bodyweight'] },
  { id: 'bodyweight_011', name: 'Burpees', equipment: ['Bodyweight'] },
  { id: 'bodyweight_012', name: 'Inverted Rows', equipment: ['Bodyweight'] },
  { id: 'bodyweight_013', name: 'Pistol Squats', equipment: ['Bodyweight'] },
  { id: 'bodyweight_015', name: 'Handstand Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_016', name: 'Muscle-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_017', name: 'Jump Squats', equipment: ['Bodyweight'] },
  { id: 'bodyweight_018', name: 'Plyometric Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_019', name: 'High Knees', equipment: ['Bodyweight'] },
  { id: 'bodyweight_020', name: 'Plank to Push-up', equipment: ['Bodyweight'] },
  { id: 'bodyweight_021', name: 'Bulgarian Split Squats (Bodyweight)', equipment: ['Bodyweight'] },
  { id: 'bodyweight_022', name: 'One-Arm Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_023', name: 'Archer Pull-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_024', name: 'Dragon Flags', equipment: ['Bodyweight'] },
  { id: 'bodyweight_025', name: 'Russian Twist', equipment: ['Bodyweight'] },
  // Assisted exercises
  { id: 'assisted_001', name: 'Assisted Pull-ups', equipment: ['Machine'] },
  { id: 'assisted_002', name: 'Assisted Dips', equipment: ['Machine'] },
  { id: 'assisted_003', name: 'Assisted Chin-ups', equipment: ['Machine'] },
  // Band exercises
  { id: 'band_001', name: 'Band Pull-aparts', equipment: ['Bands'] },
  { id: 'band_002', name: 'Band Rows', equipment: ['Bands'] },
  { id: 'band_003', name: 'Band Bicep Curls', equipment: ['Bands'] },
  { id: 'band_004', name: 'Band Tricep Pushdowns', equipment: ['Bands'] },
  { id: 'band_005', name: 'Band Face Pulls', equipment: ['Bands'] },
  { id: 'band_006', name: 'Band Lateral Walks', equipment: ['Bands'] },
  // Duration/isometric exercises
  { id: 'duration_001', name: 'Plank', equipment: ['Bodyweight'] },
  { id: 'duration_002', name: 'Side Plank', equipment: ['Bodyweight'] },
  { id: 'duration_003', name: 'Wall Sit', equipment: ['Bodyweight'] },
  { id: 'duration_004', name: 'Dead Hang', equipment: ['Bodyweight'] },
  { id: 'duration_005', name: 'Glute Bridge Hold', equipment: ['Bodyweight'] },
  { id: 'duration_006', name: 'Hollow Body Hold', equipment: ['Bodyweight'] },
  { id: 'duration_007', name: 'L-Sit Hold', equipment: ['Bodyweight'] },
];

// Muscle group mapping for exercise discovery
const EXERCISE_MUSCLE_GROUPS: Record<string, string[]> = {
  'chest': [
    'Barbell Bench Press', 'Dumbbell Bench Press', 'Incline Barbell Bench Press', 
    'Incline Dumbbell Bench Press', 'Decline Barbell Bench Press', 'Chest Press Machine',
    'Incline Chest Press Machine', 'Cable Crossover', 'Dumbbell Fly', 'Incline Dumbbell Fly',
    'Push-ups', 'Butterfly Machine', 'Smith Machine Bench Press', 'Cable Flat Bench Fly'
  ],
  'shoulders': [
    'Dumbbell Shoulder Press', 'Seated Shoulder Press Machine', 'Seated Barbell Military Press',
    'Arnold Press', 'Lateral Raises', 'Lateral Raise Machine', 'Dumbbell Front Raises',
    'Cable Front Raises', 'Rear Delt Machine', 'Seated Bent Over Rear Delt Raise',
    'Barbell Upright Rows', 'Dumbbell Upright Row', 'Landmine Press', 'Face Pull'
  ],
  'triceps': [
    'Cable Triceps Pushdown', 'Triceps Extension Machine', 'Seated Triceps Dip Machine',
    'Skullcrusher', 'Close Grip Barbell Bench Press', 'Dips', 'Assisted Dips',
    'Overhead Cable Triceps Extension', 'Seated Dumbbell Triceps Extension',
    'Triceps Kickback', 'Dumbbell Triceps Kickback'
  ],
  'back': [
    'Barbell Bent-Over Row', 'Dumbbell Row', 'Seated Cable Rows', 'Seated Row Machine',
    'Wide Grip Lat Pulldown', 'Close Grip Lat Pulldown', 'Pull-ups', 'Chin-ups',
    'Chest Supported T-Bar Row', 'Barbell Deadlift', 'Hyperextensions', 'Inverted Rows'
  ],
  'biceps': [
    'Barbell Bicep Curl', 'Dumbbell Bicep Curls', 'Dumbbell Hammer Curls', 'Cable Bicep Curl',
    'EZ Bar Curls', 'Barbell Preacher Curl', 'Preacher Curl Machine', 'Dumbbell Concentration Curl',
    'Incline Dumbbell Bicep Curls', 'Bicep Curl Machine'
  ],
  'quads': [
    'Barbell Squat', 'Barbell Front Squat', 'Dumbbell Squats', 'Leg Press', 'Leg Extensions',
    'Hack Squat Machine', 'Dumbbell Lunges', 'Barbell Lunges', 'Dumbbell Bulgarian Split Squat',
    'Air Squats', 'Kettlebell Goblet Squat'
  ],
  'hamstrings': [
    'Barbell Romanian Deadlift', 'Dumbbell Romanian Deadlifts', 'Seated Leg Curl',
    'Lying Leg Curl', 'Barbell Good Mornings'
  ],
  'glutes': [
    'Barbell Hip Thrust', 'Hip Thrust Machine', 'Barbell Glute Bridge', 'Cable Pull Through',
    'Thigh Abductor', 'Kettlebell Swing'
  ],
  'calves': [
    'Standing Calf Raise Machine', 'Seated Calf Raise Machine', 'Calf Press on a Leg Press Machine'
  ],
  'core': [
    'Plank', 'Side Plank', 'Crunches', 'Sit-ups', 'Leg Raises', 'Cable Crunch',
    'Russian Twist', 'Mountain Climbers', 'Hollow Body Hold'
  ]
};

export const getExercisesByMuscleGroup = (muscleGroups: string): StatResult => {
  const groups = muscleGroups.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
  
  const results: Record<string, Array<{ id: string; name: string; equipment: string[] }>> = {};
  
  for (const group of groups) {
    const exerciseNames = EXERCISE_MUSCLE_GROUPS[group] || [];
    const exercises: Array<{ id: string; name: string; equipment: string[] }> = [];
    
    for (const name of exerciseNames) {
      const catalogEntry = EXERCISE_CATALOG.find(e => e.name === name);
      if (catalogEntry) {
        exercises.push({
          id: catalogEntry.id,
          name: catalogEntry.name,
          equipment: catalogEntry.equipment,
        });
      }
    }
    
    results[group] = exercises;
  }
  
  return {
    success: true,
    data: {
      muscleGroups: results,
      availableGroups: Object.keys(EXERCISE_MUSCLE_GROUPS),
      message: 'Select exercises from these options to create a varied workout. Pick different exercises than the user already has.',
    },
  };
};

export const lookupExercises = (exerciseNamesStr: string): StatResult => {
  const names = exerciseNamesStr.split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
  
  const results: Array<{ searchedName: string; found: boolean; id?: string; name?: string; equipment?: string[] }> = [];
  
  for (const searchName of names) {
    const exactMatch = EXERCISE_CATALOG.find(
      e => e.name.toLowerCase() === searchName
    );
    
    if (exactMatch) {
      results.push({
        searchedName: searchName,
        found: true,
        id: exactMatch.id,
        name: exactMatch.name,
        equipment: exactMatch.equipment,
      });
      continue;
    }
    
    const fuzzyMatch = EXERCISE_CATALOG.find(e => {
      const catalogName = e.name.toLowerCase();
      return catalogName.includes(searchName) || searchName.includes(catalogName);
    });
    
    if (fuzzyMatch) {
      results.push({
        searchedName: searchName,
        found: true,
        id: fuzzyMatch.id,
        name: fuzzyMatch.name,
        equipment: fuzzyMatch.equipment,
      });
      continue;
    }
    
    const partialMatches = EXERCISE_CATALOG.filter(e => {
      const words = searchName.split(/\s+/);
      return words.some(word => e.name.toLowerCase().includes(word));
    }).slice(0, 3);
    
    if (partialMatches.length > 0) {
      results.push({
        searchedName: searchName,
        found: false,
        suggestions: partialMatches.map(e => e.name),
      } as any);
    } else {
      results.push({
        searchedName: searchName,
        found: false,
      });
    }
  }
  
  return {
    success: true,
    data: {
      exercises: results,
      allFound: results.every(r => r.found),
      message: results.every(r => r.found)
        ? 'All exercises found. NOW OUTPUT type: "action" with the full payload to create the workout.'
        : 'Some exercises were not found. Please check the suggestions or try different names.',
    },
  };
};

export type StatFunction =
  | 'getExerciseVolumeAllTime'
  | 'getExerciseMaxWeight'
  | 'getWorkoutStats'
  | 'getExerciseProgress'
  | 'getMuscleGroupVolume'
  | 'getWorkoutFrequency'
  | 'getPersonalRecords'
  | 'getRecentWorkoutSummary'
  | 'getWorkoutsForDate'
  | 'lookupExercises'
  | 'getExercisesByMuscleGroup';

export const executeStatFunction = async (
  supabase: SupabaseClient,
  userId: string,
  functionName: StatFunction,
  params: Record<string, unknown>
): Promise<StatResult> => {
  switch (functionName) {
    case 'getExerciseVolumeAllTime':
      return getExerciseVolumeAllTime(supabase, userId, params.exerciseName as string | undefined);
    case 'getExerciseMaxWeight':
      return getExerciseMaxWeight(supabase, userId, params.exerciseName as string | undefined);
    case 'getWorkoutStats':
      return getWorkoutStats(supabase, userId);
    case 'getExerciseProgress':
      return getExerciseProgress(supabase, userId, params.exerciseName as string);
    case 'getMuscleGroupVolume':
      return getMuscleGroupVolume(supabase, userId);
    case 'getWorkoutFrequency':
      return getWorkoutFrequency(supabase, userId, (params.days as number) ?? 30);
    case 'getPersonalRecords':
      return getPersonalRecords(supabase, userId);
    case 'getRecentWorkoutSummary':
      return getRecentWorkoutSummary(supabase, userId, (params.count as number) ?? 5);
    case 'getWorkoutsForDate':
      return getWorkoutsForDate(supabase, userId, params.date as string);
    case 'lookupExercises':
      return lookupExercises(params.exerciseNames as string);
    case 'getExercisesByMuscleGroup':
      return getExercisesByMuscleGroup(params.muscleGroups as string);
    default:
      return { success: false, data: null, error: `Unknown function: ${functionName}` };
  }
};
