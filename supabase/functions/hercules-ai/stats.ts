import type { SupabaseClient } from '@supabase/supabase-js';

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
          unit: 'lbs',
        },
      };
    }
    
    if (fuzzy.length > 0) {
      const results = fuzzy.map(name => ({
        exerciseName: name,
        totalVolume: volumeByExercise[name] ?? 0,
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
        totalVolume: 0,
        exactMatchFound: false,
        availableExercises: allExerciseNames.slice(0, 20),
        message: `No exercise found matching "${exerciseName}". Here are your available exercises.`,
        unit: 'lbs',
      },
    };
  }

  const sorted = Object.entries(volumeByExercise)
    .map(([name, volume]) => ({ exerciseName: name, totalVolume: volume }))
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
      return {
        success: true,
        data: {
          exerciseName: exact,
          maxWeight: record?.weight ?? 0,
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

  return {
    success: true,
    data: {
      totalWorkouts: sessions.length,
      totalDuration,
      averageDuration: Math.round(totalDuration / sessions.length),
      totalSets,
      totalReps,
      totalVolume,
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

export const getMuscleGroupVolume = async (
  supabase: SupabaseClient,
  userId: string
): Promise<StatResult> => {
  const sessions = await fetchAllSessions(supabase, userId);

  const volumeByExercise: Record<string, number> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;
      
      const sets = exercise.sets ?? [];

      for (const set of sets) {
        if (set.completed !== false) {
          volumeByExercise[name] = (volumeByExercise[name] ?? 0) + calculateSetVolume(set);
        }
      }
    }
  }

  const sorted = Object.entries(volumeByExercise)
    .map(([name, volume]) => ({ exerciseName: name, totalVolume: volume }))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  return {
    success: true,
    data: {
      exercisesByVolume: sorted,
      mostTrainedExercise: sorted[0] ?? null,
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
      ...record,
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
      exerciseCount: exercises.length,
      totalSets,
      totalVolume,
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
      exerciseNames,
      exerciseCount: exercises.length,
      totalSets,
      totalVolume,
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

export type StatFunction =
  | 'getExerciseVolumeAllTime'
  | 'getExerciseMaxWeight'
  | 'getWorkoutStats'
  | 'getExerciseProgress'
  | 'getMuscleGroupVolume'
  | 'getWorkoutFrequency'
  | 'getPersonalRecords'
  | 'getRecentWorkoutSummary'
  | 'getWorkoutsForDate';

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
    default:
      return { success: false, data: null, error: `Unknown function: ${functionName}` };
  }
};
