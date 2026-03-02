import type { SupabaseClient } from '@supabase/supabase-js';

import { formatDuration, formatNumber, formatVolume, formatWeight } from './formatters.ts';
import { computeSetVolume } from './exerciseTypes.ts';

interface ExerciseSet {
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  assistanceWeight?: number;
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

export interface AppStats {
  totalVolume: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  muscleGroupVolume: Record<string, number>;
  weightUnit: string;
}

const parseExercises = (exercises: unknown): SessionExercise[] => {
  if (!Array.isArray(exercises)) return [];
  return exercises as SessionExercise[];
};

const fetchUserBodyWeight = async (
  supabase: SupabaseClient,
  userId: string
): Promise<number> => {
  const { data } = await supabase
    .from('profiles')
    .select('weight_lbs')
    .eq('id', userId)
    .maybeSingle();
  return data?.weight_lbs ?? 0;
};

const calculateSetVolume = (set: ExerciseSet, exerciseName: string, userBodyWeight: number): number => {
  return computeSetVolume(set, exerciseName, userBodyWeight);
};

const getExerciseName = (exercise: SessionExercise): string => {
  return exercise.name ?? exercise.exerciseName ?? exercise.exerciseId ?? 'Unknown';
};

/**
 * Converts a UTC ISO timestamp to a local YYYY-MM-DD date string in the given timezone.
 * Falls back to UTC date if timezone is invalid.
 */
const toLocalDateString = (isoTimestamp: string, timezone: string): string => {
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return isoTimestamp;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return new Date(isoTimestamp).toISOString().split('T')[0];
  }
};

/**
 * Returns UTC start/end ISO strings for a given local date in the user's timezone.
 * E.g., for '2026-02-21' in 'America/New_York':
 *   start = '2026-02-21T05:00:00.000Z'  (midnight EST = 5am UTC)
 *   end   = '2026-02-22T05:00:00.000Z'  (midnight next day EST)
 */
const getDateRangeForTimezone = (dateStr: string, timezone: string): { start: string; end: string } => {
  try {
    // Create a date at midnight UTC for the given date
    const baseDate = new Date(`${dateStr}T12:00:00Z`);
    if (isNaN(baseDate.getTime())) throw new Error('Invalid date');

    // Use Intl to find the UTC offset for this timezone on this date
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(baseDate);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? '0';

    const localYear = parseInt(getPart('year'));
    const localMonth = parseInt(getPart('month')) - 1;
    const localDay = parseInt(getPart('day'));
    const localHour = parseInt(getPart('hour'));
    const localMinute = parseInt(getPart('minute'));
    const localSecond = parseInt(getPart('second'));

    // Compute offset: UTC time - local time
    const utcMs = baseDate.getTime();
    const localAsUtc = Date.UTC(localYear, localMonth, localDay, localHour, localMinute, localSecond);
    const offsetMs = utcMs - localAsUtc;

    // Midnight local time on the target date = Date.UTC(year, month-1, day) + offset
    const [year, month, day] = dateStr.split('-').map(Number);
    const midnightLocalAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
    const startUtc = new Date(midnightLocalAsUtc + offsetMs);
    const endUtc = new Date(midnightLocalAsUtc + offsetMs + 24 * 60 * 60 * 1000);

    return {
      start: startUtc.toISOString(),
      end: endUtc.toISOString(),
    };
  } catch {
    // Fallback: treat date as UTC
    return {
      start: `${dateStr}T00:00:00.000Z`,
      end: new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
};

const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// ---------------------------------------------------------------------------
// Exercise synonym / alias system
// Each group contains alternate names, abbreviations, and common synonyms
// that users might use to refer to the same or a very similar exercise.
// All entries are lowercase for matching purposes.
// ---------------------------------------------------------------------------
const EXERCISE_SYNONYM_GROUPS: string[][] = [
  // Chest — fly / pec deck variants
  ['pec deck', 'pec fly', 'pec deck machine', 'butterfly machine', 'chest fly machine', 'machine fly'],
  ['dumbbell fly', 'dumbbell chest fly', 'db fly', 'db chest fly', 'flat dumbbell fly'],
  ['incline dumbbell fly', 'incline db fly'],
  ['cable crossover', 'cable fly', 'cable chest fly'],
  ['cable flat bench fly', 'flat cable fly'],
  ['incline cable fly', 'incline cable crossover'],
  ['seated cable fly', 'seated cable crossover'],
  // Chest — press variants
  ['barbell bench press', 'bench press', 'flat bench press', 'flat bench', 'bb bench press', 'barbell flat bench press', 'bench'],
  ['dumbbell bench press', 'db bench press', 'dumbbell flat bench press', 'db flat bench'],
  ['incline barbell bench press', 'incline bench press', 'incline bench', 'incline barbell bench'],
  ['incline dumbbell bench press', 'incline db bench press', 'incline dumbbell press', 'incline db press'],
  ['decline barbell bench press', 'decline bench press', 'decline bench', 'decline barbell bench'],
  ['decline dumbbell bench press', 'decline db bench press', 'decline dumbbell press'],
  ['chest press machine', 'machine chest press', 'chest press', 'seated chest press'],
  ['smith machine bench press', 'smith bench press', 'smith machine flat bench'],
  ['barbell floor press', 'floor press'],
  ['close grip barbell bench press', 'close grip bench press', 'close grip bench', 'cgbp'],
  // Back — rows
  ['barbell bent-over row', 'barbell row', 'bent over row', 'bb row', 'bent-over barbell row', 'bent over barbell row'],
  ['dumbbell row', 'db row', 'one arm dumbbell row', 'single arm dumbbell row', 'single-arm dumbbell row'],
  ['seated cable rows', 'seated cable row', 'cable row', 'seated row', 'low row'],
  ['seated row machine', 'machine row', 'seated row'],
  ['chest supported t-bar row', 't-bar row', 't bar row', 'tbar row'],
  ['smith machine bent over row', 'smith machine row', 'smith row'],
  ['reverse grip bent over barbell row', 'reverse grip row', 'underhand barbell row'],
  // Back — pulldowns / pull-ups
  ['wide grip lat pulldown', 'lat pulldown', 'pulldown', 'lat pull down', 'wide pulldown'],
  ['close grip lat pulldown', 'close grip pulldown', 'narrow grip pulldown', 'v-bar pulldown'],
  ['cable underhand pulldown', 'underhand pulldown', 'reverse grip pulldown'],
  ['pull-ups', 'pullup', 'pullups', 'pull up', 'pull ups'],
  ['chin-ups', 'chinup', 'chinups', 'chin up', 'chin ups'],
  ['assisted pull-ups', 'assisted pullup', 'assisted pull up', 'machine pull-ups'],
  ['assisted chin-ups', 'assisted chinup', 'assisted chin up'],
  // Back — deadlifts
  ['barbell deadlift', 'deadlift', 'conventional deadlift', 'bb deadlift'],
  ['dumbbell deadlifts', 'dumbbell deadlift', 'db deadlift', 'db deadlifts'],
  ['barbell romanian deadlift', 'romanian deadlift', 'rdl', 'barbell rdl', 'bb rdl', 'stiff leg deadlift'],
  ['dumbbell romanian deadlifts', 'dumbbell romanian deadlift', 'dumbbell rdl', 'db rdl', 'db romanian deadlift'],
  ['kettlebell romanian deadlift', 'kettlebell rdl', 'kb rdl'],
  // Shoulders
  ['dumbbell shoulder press', 'shoulder press', 'db shoulder press', 'dumbbell overhead press', 'db ohp'],
  ['seated barbell military press', 'military press', 'barbell military press', 'overhead press', 'ohp', 'barbell overhead press'],
  ['seated shoulder press machine', 'machine shoulder press', 'shoulder press machine'],
  ['arnold press', 'arnold dumbbell press'],
  ['lateral raises', 'lateral raise', 'side raises', 'side raise', 'dumbbell lateral raise', 'db lateral raise', 'side lateral raise'],
  ['lateral raise machine', 'machine lateral raise'],
  ['dumbbell front raises', 'front raise', 'front raises', 'db front raise'],
  ['rear delt machine', 'reverse fly machine', 'reverse pec deck', 'rear delt fly machine'],
  ['face pull', 'face pulls', 'cable face pull', 'cable face pulls'],
  ['band face pulls', 'band face pull', 'resistance band face pull'],
  ['barbell upright rows', 'upright row', 'upright rows', 'barbell upright row'],
  // Biceps
  ['barbell bicep curl', 'barbell curl', 'bb curl', 'standing barbell curl'],
  ['dumbbell bicep curls', 'dumbbell curl', 'dumbbell curls', 'db curl', 'db curls', 'db bicep curl'],
  ['dumbbell hammer curls', 'hammer curl', 'hammer curls', 'db hammer curl', 'db hammer curls'],
  ['cable bicep curl', 'cable curl', 'cable curls'],
  ['ez bar curls', 'ez curl', 'ez bar curl', 'ez curls', 'easy bar curl'],
  ['barbell preacher curl', 'preacher curl', 'preacher curls'],
  ['preacher curl machine', 'machine preacher curl'],
  ['bicep curl machine', 'machine curl', 'machine bicep curl'],
  ['dumbbell concentration curl', 'concentration curl', 'concentration curls'],
  // Triceps
  ['cable triceps pushdown', 'triceps pushdown', 'tricep pushdown', 'cable pushdown', 'pushdown', 'pushdowns', 'rope pushdown'],
  ['overhead cable triceps extension', 'overhead cable extension', 'cable overhead extension', 'overhead triceps extension'],
  ['skullcrusher', 'skull crusher', 'skull crushers', 'skullcrushers', 'lying triceps extension'],
  ['dips', 'parallel bar dips', 'chest dips', 'tricep dips'],
  ['assisted dips', 'machine dips', 'assisted parallel bar dips'],
  ['seated dumbbell triceps extension', 'dumbbell triceps extension', 'db triceps extension', 'overhead dumbbell extension'],
  ['triceps extension machine', 'machine triceps extension'],
  ['triceps kickback', 'dumbbell triceps kickback', 'kickback', 'kickbacks', 'db kickback'],
  // Quads
  ['barbell squat', 'squat', 'back squat', 'bb squat', 'barbell back squat'],
  ['barbell front squat', 'front squat'],
  ['dumbbell squats', 'dumbbell squat', 'db squat', 'db squats', 'goblet squat'],
  ['kettlebell goblet squat', 'goblet squat', 'kb goblet squat'],
  ['leg press', 'leg press machine', 'machine leg press', 'seated leg press'],
  ['leg extensions', 'leg extension', 'leg extension machine', 'quad extension'],
  ['hack squat machine', 'hack squat', 'machine hack squat'],
  ['dumbbell lunges', 'lunge', 'db lunges', 'walking lunges'],
  ['dumbbell bulgarian split squat', 'bulgarian split squat', 'split squat', 'bss', 'db split squat', 'dumbbell split squat'],
  ['bodyweight squats', 'air squats', 'air squat', 'bw squats', 'bodyweight squat'],
  ['bodyweight pistol squats', 'pistol squats', 'pistol squat', 'single leg squat'],
  // Hamstrings
  ['seated leg curl', 'leg curl', 'hamstring curl', 'leg curls', 'hamstring curls'],
  ['lying leg curl', 'prone leg curl', 'lying hamstring curl'],
  ['barbell good mornings', 'good morning', 'good mornings', 'barbell good morning'],
  // Glutes
  ['barbell hip thrust', 'hip thrust', 'hip thrusts', 'bb hip thrust', 'barbell hip thrusts'],
  ['hip thrust machine', 'machine hip thrust'],
  ['barbell glute bridge', 'glute bridge', 'bb glute bridge'],
  ['cable pull through', 'pull through', 'cable pull-through'],
  ['thigh abductor', 'hip abductor', 'abductor machine', 'abductor', 'hip abduction machine', 'cable hip abduction'],
  ['thigh adductor', 'hip adductor', 'adductor machine', 'adductor', 'hip adduction machine', 'cable hip adduction'],
  // Calves
  ['standing calf raise machine', 'calf raise', 'calf raises', 'standing calf raise'],
  ['seated calf raise machine', 'seated calf raise'],
  // Core
  ['cable crunch', 'cable crunches', 'kneeling cable crunch'],
  ['seated ab crunch machine', 'ab machine', 'ab crunch machine', 'crunch machine'],
  ['russian twist', 'russian twists'],
  ['hanging leg raise', 'leg raises', 'hanging leg raises'],
  // Traps
  ['barbell shrugs', 'shrugs', 'barbell shrug', 'bb shrugs'],
  ['dumbbell shrugs', 'db shrugs', 'dumbbell shrug'],
  // Misc
  ['hyperextensions', 'hyperextension', 'back extension', 'back extensions', 'roman chair'],
  ['seated back extension machine', 'back extension machine', 'machine back extension'],
  ['inverted rows', 'inverted row', 'body row', 'australian pull-up'],
];

// Build a fast lookup: normalized alias → list of canonical group entries
const _synonymLookup: Map<string, string[]> = new Map();
for (const group of EXERCISE_SYNONYM_GROUPS) {
  const normalized = group.map(s => s.toLowerCase());
  for (const alias of normalized) {
    _synonymLookup.set(alias, normalized);
  }
}

/**
 * Given a search term, returns all synonym aliases the user might have meant.
 * E.g., "pec deck" → ["pec deck", "butterfly machine", "pec fly", ...]
 */
const getSynonyms = (searchName: string): string[] => {
  const lower = searchName.toLowerCase().trim();
  // Direct lookup
  const group = _synonymLookup.get(lower);
  if (group) return group;
  // Try normalized (strip non-alphanum) lookup
  const norm = normalizeString(searchName);
  for (const [alias, grp] of _synonymLookup.entries()) {
    if (normalizeString(alias) === norm) return grp;
  }
  return [];
};

const fuzzyMatch = (query: string, target: string): boolean => {
  const normalizedQuery = normalizeString(query);
  const normalizedTarget = normalizeString(target);
  
  if (normalizedTarget === normalizedQuery) return true;
  if (normalizedTarget.includes(normalizedQuery)) return true;
  if (normalizedQuery.includes(normalizedTarget)) return true;
  
  const queryWords = query.toLowerCase().split(/\s+/);
  const targetWords = target.toLowerCase().split(/\s+/);

  // For single-word queries, require the word to appear as a substring in at least one target word
  // This prevents matching "squat" to "EZ Bar Curls" etc.
  if (queryWords.length === 1) {
    const qw = queryWords[0];
    return targetWords.some(tw => tw.includes(qw) || qw.includes(tw));
  }

  // For multi-word queries, require at least 60% of query words to match (rounded up)
  const matchedWords = queryWords.filter(qw => 
    targetWords.some(tw => tw.includes(qw) || qw.includes(tw))
  );
  return matchedWords.length >= Math.ceil(queryWords.length * 0.6);
};

const findMatchingExercises = (
  allExerciseNames: string[],
  searchName: string
): { exact: string | null; fuzzy: string[]; synonymMatch?: string } => {
  const normalizedSearch = normalizeString(searchName);
  
  // 1. Exact match (normalized)
  const exactMatch = allExerciseNames.find(
    name => normalizeString(name) === normalizedSearch
  );
  
  if (exactMatch) {
    return { exact: exactMatch, fuzzy: [] };
  }

  // 2. Synonym-aware match: expand the search term to all known aliases,
  //    then check if any user exercise name matches any alias
  const synonyms = getSynonyms(searchName);
  if (synonyms.length > 0) {
    for (const alias of synonyms) {
      const aliasNorm = normalizeString(alias);
      const match = allExerciseNames.find(name => normalizeString(name) === aliasNorm);
      if (match) {
        return { exact: match, fuzzy: [], synonymMatch: searchName };
      }
    }
    // Also try fuzzy matching each synonym against the user's exercises
    for (const alias of synonyms) {
      const matches = allExerciseNames.filter(name => fuzzyMatch(alias, name));
      if (matches.length > 0) {
        return { exact: null, fuzzy: matches, synonymMatch: searchName };
      }
    }
  }

  // 3. Standard fuzzy matching on the original search term
  const fuzzyMatches = allExerciseNames.filter(name => fuzzyMatch(searchName, name));
  if (fuzzyMatches.length > 0) {
    return { exact: null, fuzzy: fuzzyMatches };
  }

  // 4. Muscle-group-based similarity: if the search term looks like an exercise
  //    that targets a known muscle group, suggest user exercises for that muscle
  const searchMuscle = getMuscleGroupForExercise(searchName);
  if (searchMuscle !== 'Other') {
    const sameMuscleExercises = allExerciseNames.filter(name => {
      return getMuscleGroupForExercise(name) === searchMuscle;
    });
    if (sameMuscleExercises.length > 0) {
      return { exact: null, fuzzy: sameMuscleExercises };
    }
  }

  return { exact: null, fuzzy: [] };
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
  exerciseName?: string,
  appStats?: AppStats
): Promise<StatResult> => {
  const [sessions, userBW] = await Promise.all([
    fetchAllSessions(supabase, userId),
    fetchUserBodyWeight(supabase, userId),
  ]);
  const allExerciseNames = getAllExerciseNames(sessions);

  const volumeByExercise: Record<string, number> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;

      const sets = exercise.sets ?? [];
      for (const set of sets) {
        if (set.completed === true) {
          const volume = calculateSetVolume(set, name, userBW);
          volumeByExercise[name] = (volumeByExercise[name] ?? 0) + volume;
        }
      }
    }
  }

  if (exerciseName) {
    const { exact, fuzzy, synonymMatch } = findMatchingExercises(allExerciseNames, exerciseName);
    
    if (exact) {
      const total = volumeByExercise[exact] ?? 0;
      return {
        success: true,
        data: {
          exerciseName: exact,
          ...(synonymMatch ? { searchedFor: synonymMatch, resolvedViaSynonym: true } : {}),
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
          ...(synonymMatch ? { resolvedViaSynonym: true } : {}),
          similarExercises: results,
          suggestion: synonymMatch
            ? `No exact match for "${exerciseName}", but found similar exercises the user has performed: ${fuzzy.join(', ')}. Present data for these exercises since they are likely what the user meant.`
            : `No exact match for "${exerciseName}". Did you mean: ${fuzzy.join(', ')}?`,
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
        noDataForThisExercise: true,
        message: `The user has NEVER performed "${exerciseName}". There is zero data for this exercise. Do NOT use data from any other exercise. Tell the user you have no data for "${exerciseName}".`,
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

  const unit = appStats?.weightUnit ?? 'lbs';

  // When appStats are available, include the app's authoritative total volume
  // so the LLM doesn't sum the per-exercise values (which use different BW multipliers).
  const grandTotal = appStats?.totalVolume ?? sorted.reduce((s, e) => s + e.totalVolume, 0);

  return {
    success: true,
    data: {
      exercises: sorted,
      topExercise: sorted[0] ?? null,
      grandTotalVolume: grandTotal,
      grandTotalVolumeFormatted: formatVolume(grandTotal),
      unit,
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
        if (set.completed === true && set.weight) {
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
    const { exact, fuzzy, synonymMatch } = findMatchingExercises(allExerciseNames, exerciseName);
    
    if (exact) {
      const record = maxByExercise[exact] ?? null;
      const weight = record?.weight ?? 0;
      return {
        success: true,
        data: {
          exerciseName: exact,
          ...(synonymMatch ? { searchedFor: synonymMatch, resolvedViaSynonym: true } : {}),
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
          ...(synonymMatch ? { resolvedViaSynonym: true } : {}),
          similarExercises: results,
          suggestion: synonymMatch
            ? `No exact match for "${exerciseName}", but found similar exercises the user has performed: ${fuzzy.join(', ')}. Present data for these exercises since they are likely what the user meant.`
            : `No exact match for "${exerciseName}". Did you mean: ${fuzzy.join(', ')}?`,
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
        noDataForThisExercise: true,
        message: `The user has NEVER performed "${exerciseName}". There is zero data for this exercise. Do NOT use data from any other exercise. Tell the user you have no data for "${exerciseName}".`,
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
  userId: string,
  appStats?: AppStats
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

  for (const session of sessions) {
    totalDuration += session.duration ?? 0;

    for (const exercise of session.exercises) {
      const sets = exercise.sets ?? [];
      for (const set of sets) {
        if (set.completed === true) {
          totalSets++;
          totalReps += set.reps ?? 0;
        }
      }
    }
  }

  // Use pre-computed values from the app when available (ensures consistency
  // with the Performance page). Fall back to session counts when appStats
  // are not provided.
  const finalTotalVolume = appStats?.totalVolume ?? 0;
  const finalTotalWorkouts = appStats?.totalWorkouts ?? sessions.length;
  const finalTotalSets = appStats?.totalSets ?? totalSets;
  const finalTotalReps = appStats?.totalReps ?? totalReps;
  const unit = appStats?.weightUnit ?? 'lbs';

  const sortedByDate = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const avgDuration = Math.round(totalDuration / sessions.length);

  return {
    success: true,
    data: {
      totalWorkouts: finalTotalWorkouts,
      totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      averageDuration: avgDuration,
      averageDurationFormatted: formatDuration(avgDuration),
      totalSets: finalTotalSets,
      totalSetsFormatted: formatNumber(finalTotalSets),
      totalReps: finalTotalReps,
      totalRepsFormatted: formatNumber(finalTotalReps),
      totalVolume: finalTotalVolume,
      totalVolumeFormatted: formatVolume(finalTotalVolume),
      firstWorkoutDate: sortedByDate[0]?.date ?? null,
      lastWorkoutDate: sortedByDate[sortedByDate.length - 1]?.date ?? null,
      unit,
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

  const [sessions, userBW] = await Promise.all([
    fetchAllSessions(supabase, userId),
    fetchUserBodyWeight(supabase, userId),
  ]);
  const allExerciseNames = getAllExerciseNames(sessions);
  const { exact, fuzzy, synonymMatch } = findMatchingExercises(allExerciseNames, exerciseName);
  
  const targetName = exact ?? (fuzzy.length === 1 ? fuzzy[0] : null);
  
  if (!targetName && fuzzy.length > 1) {
    return {
      success: true,
      data: {
        searchedFor: exerciseName,
        exactMatchFound: false,
        ...(synonymMatch ? { resolvedViaSynonym: true } : {}),
        similarExercises: fuzzy,
        suggestion: synonymMatch
          ? `No exact match for "${exerciseName}", but found similar exercises the user has performed: ${fuzzy.join(', ')}. Present data for these exercises since they are likely what the user meant.`
          : `Multiple matches found for "${exerciseName}". Did you mean: ${fuzzy.join(', ')}?`,
      },
    };
  }
  
  if (!targetName) {
    return {
      success: true,
      data: {
        exerciseName,
        exactMatchFound: false,
        noDataForThisExercise: true,
        message: `The user has NEVER performed "${exerciseName}". There is zero data for this exercise. Do NOT use data from any other exercise. Tell the user you have no data for "${exerciseName}" and suggest they try it in a future workout.`,
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
        if (set.completed === true) {
          setCount++;
          totalVolume += calculateSetVolume(set, name, userBW);
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
      ...(synonymMatch ? { searchedFor: synonymMatch, resolvedViaSynonym: true } : {}),
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
  'bodyweight bulgarian split squats': 'Quads',
  'air squats': 'Quads',
  'kettlebell goblet squat': 'Quads',
  'kettlebell front squat': 'Quads',
  'barbell overhead squat': 'Quads',
  'dumbbell step-ups': 'Quads',
  'barbell step ups': 'Quads',
  'bodyweight pistol squats': 'Quads',
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
  userId: string,
  appStats?: AppStats
): Promise<StatResult> => {
  // When the app provides pre-computed muscle group volumes, use them directly.
  // These are computed by the frontend using the same weighted muscle distribution
  // and BW multipliers shown in the Performance page charts.
  if (appStats?.muscleGroupVolume && Object.keys(appStats.muscleGroupVolume).length > 0) {
    const unit = appStats.weightUnit ?? 'lbs';
    const sorted = Object.entries(appStats.muscleGroupVolume)
      .filter(([_, volume]) => volume > 0)
      .map(([muscleGroup, volume]) => ({
        muscleGroup,
        totalVolume: volume,
        totalVolumeFormatted: formatVolume(volume),
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume);

    return {
      success: true,
      data: {
        muscleGroups: sorted,
        mostTrainedMuscle: sorted[0]?.muscleGroup ?? null,
        leastTrainedMuscle: sorted[sorted.length - 1]?.muscleGroup ?? null,
        unit,
        source: 'app_precomputed',
      },
    };
  }

  // Fallback: compute from raw session data (less accurate — uses single primary muscle)
  const [sessions, userBW] = await Promise.all([
    fetchAllSessions(supabase, userId),
    fetchUserBodyWeight(supabase, userId),
  ]);

  const volumeByMuscleGroup: Record<string, number> = {};
  const exercisesByMuscleGroup: Record<string, Set<string>> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;
      
      const muscleGroup = getMuscleGroupForExercise(name);
      const sets = exercise.sets ?? [];

      for (const set of sets) {
        if (set.completed === true) {
          const volume = calculateSetVolume(set, name, userBW);
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

export const getSetsPerMuscleGroup = async (
  supabase: SupabaseClient,
  userId: string,
  days: number = 7
): Promise<StatResult> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, name, date, exercises')
    .eq('user_id', userId)
    .gte('date', cutoffStr)
    .order('date', { ascending: false });

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  const sessions = (data || []) as Array<{ id: string; name: string; date: string; exercises: unknown }>;

  const setsByMuscle: Record<string, number> = {};
  const exercisesByMuscle: Record<string, Set<string>> = {};
  let totalSets = 0;

  for (const session of sessions) {
    const exercises = parseExercises(session.exercises);
    for (const exercise of exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;

      const muscleGroup = getMuscleGroupForExercise(name);
      const sets = exercise.sets ?? [];
      let completedSets = 0;

      for (const set of sets) {
        if (set.completed === true) {
          completedSets++;
        }
      }

      if (completedSets > 0) {
        setsByMuscle[muscleGroup] = (setsByMuscle[muscleGroup] ?? 0) + completedSets;
        totalSets += completedSets;
        if (!exercisesByMuscle[muscleGroup]) {
          exercisesByMuscle[muscleGroup] = new Set();
        }
        exercisesByMuscle[muscleGroup].add(name);
      }
    }
  }

  const sorted = Object.entries(setsByMuscle)
    .map(([muscleGroup, sets]) => ({
      muscleGroup,
      totalSets: sets,
      exercises: Array.from(exercisesByMuscle[muscleGroup] || []),
    }))
    .sort((a, b) => b.totalSets - a.totalSets);

  // Compute weekly average if period > 7 days
  const weeks = Math.max(days / 7, 1);
  const weeklyAvg = sorted.map(item => ({
    ...item,
    avgSetsPerWeek: Math.round((item.totalSets / weeks) * 10) / 10,
  }));

  return {
    success: true,
    data: {
      periodDays: days,
      totalSessions: sessions.length,
      totalSets,
      muscleGroups: weeklyAvg,
      mostTrainedMuscle: weeklyAvg[0]?.muscleGroup ?? null,
      leastTrainedMuscle: weeklyAvg[weeklyAvg.length - 1]?.muscleGroup ?? null,
      summary: `Over the last ${days} days (${sessions.length} sessions), you completed ${totalSets} total sets across ${weeklyAvg.length} muscle groups.`,
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

  const weeks = Math.max(days / 7, 1);
  const avgPerWeek = Math.round((sessions.length / weeks) * 10) / 10;

  return {
    success: true,
    data: {
      periodDays: days,
      periodDescription: `over the last ${days} days`,
      totalWorkouts: sessions.length,
      uniqueDays,
      averagePerWeek: avgPerWeek,
      byDayOfWeek,
      summary: `${sessions.length} workouts over the last ${days} days (${avgPerWeek} per week on average).`,
    },
  };
};

export const getPersonalRecords = async (
  supabase: SupabaseClient,
  userId: string
): Promise<StatResult> => {
  const [sessions, userBW] = await Promise.all([
    fetchAllSessions(supabase, userId),
    fetchUserBodyWeight(supabase, userId),
  ]);

  const records: Record<string, { weight: number; reps: number; date: string; volume: number }> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const name = getExerciseName(exercise);
      if (name === 'Unknown') continue;
      
      const sets = exercise.sets ?? [];

      for (const set of sets) {
        if (set.completed === true && set.weight) {
          const current = records[name];
          if (!current || set.weight > current.weight) {
            records[name] = {
              weight: set.weight,
              reps: set.reps ?? 0,
              date: session.date,
              volume: calculateSetVolume(set, name, userBW),
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
  count: number = 5,
  timezone: string = 'UTC'
): Promise<StatResult> => {
  const [queryResult, userBW] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, name, date, duration, exercises')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(count),
    fetchUserBodyWeight(supabase, userId),
  ]);

  const { data, error } = queryResult;

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  // For small counts (1-2), include full exercise/set detail for a complete breakdown
  const includeDetail = count <= 2;

  const sessions = (data || []).map((row) => {
    const exercises = parseExercises(row.exercises);
    let totalSets = 0;
    let totalVolume = 0;

    const exerciseDetails: Array<{
      name: string;
      sets: Array<{ setNumber: number; weight?: number; reps?: number; duration?: number; distance?: number; completed: boolean }>;
      completedSets: number;
      volume: number;
    }> = [];

    for (const exercise of exercises) {
      const name = getExerciseName(exercise);
      const sets = exercise.sets ?? [];
      let exerciseVolume = 0;
      let exerciseCompletedSets = 0;
      const setDetails: Array<{ setNumber: number; weight?: number; reps?: number; duration?: number; distance?: number; completed: boolean }> = [];

      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        const completed = set.completed === true;
        if (completed) {
          totalSets++;
          exerciseCompletedSets++;
          const vol = calculateSetVolume(set, name, userBW);
          exerciseVolume += vol;
          totalVolume += vol;
        }
        if (includeDetail) {
          const detail: { setNumber: number; weight?: number; reps?: number; duration?: number; distance?: number; completed: boolean } = {
            setNumber: i + 1,
            completed,
          };
          if (set.weight != null) detail.weight = set.weight;
          if (set.reps != null) detail.reps = set.reps;
          if (set.duration != null) detail.duration = set.duration;
          if (set.distance != null) detail.distance = set.distance;
          setDetails.push(detail);
        }
      }

      if (includeDetail) {
        exerciseDetails.push({
          name,
          sets: setDetails,
          completedSets: exerciseCompletedSets,
          volume: exerciseVolume,
        });
      }
    }

    // Always collect exercise names for summary mode
    const exerciseNames = exercises
      .map(e => getExerciseName(e))
      .filter(n => n !== 'Unknown');

    const base: Record<string, unknown> = {
      id: row.id,
      name: row.name,
      date: toLocalDateString(row.date, timezone),
      duration: row.duration,
      durationFormatted: row.duration ? formatDuration(row.duration) : null,
      exerciseNames,
      exerciseCount: exercises.length,
      totalSets,
      totalVolume,
      totalVolumeFormatted: formatVolume(totalVolume),
    };

    if (includeDetail) {
      base.exercises = exerciseDetails;
    }

    return base;
  });

  return {
    success: true,
    data: {
      recentWorkouts: sessions,
      detailLevel: includeDetail ? 'full' : 'summary',
      note: includeDetail
        ? undefined
        : 'This is a SUMMARY view. Only exercise names, total sets, and total volume are available per workout. Do NOT report specific weights, reps, or set details — that data is not included here. Only mention the exercise names and summary stats shown.',
      unit: 'lbs',
    },
  };
};

export const getWorkoutsForDate = async (
  supabase: SupabaseClient,
  userId: string,
  date: string,
  timezone: string = 'UTC'
): Promise<StatResult> => {
  // The date column is timestamptz. A workout at 8pm EST on Feb 21 is stored as
  // Feb 22 01:00 UTC. We need a timezone-aware range query to find the right day.
  const range = getDateRangeForTimezone(date, timezone);

  const [queryResult, userBW] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, name, date, duration, exercises')
      .eq('user_id', userId)
      .gte('date', range.start)
      .lt('date', range.end)
      .order('date', { ascending: false }),
    fetchUserBodyWeight(supabase, userId),
  ]);

  const { data, error } = queryResult;

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
        if (set.completed === true) {
          totalSets++;
          totalVolume += calculateSetVolume(set, name, userBW);
        }
      }
    }

    return {
      id: row.id,
      name: row.name,
      date: toLocalDateString(row.date, timezone),
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

// AUTO-GENERATED from exercises.json — do not edit manually. Run the catalog generation script instead.
export const EXERCISE_CATALOG: Array<{ id: string; name: string; equipment: string[] }> = [
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
  { id: 'exercise_017', name: 'Hip Adductor', equipment: ['Machine'] },
  { id: 'exercise_018', name: 'Hip Abductor', equipment: ['Machine'] },
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
  { id: 'exercise_143', name: 'Dumbbell Overhead Tricep Extension', equipment: ['Dumbbell'] },
  { id: 'exercise_144', name: 'Dumbbell Hip Thrusts', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_145', name: 'Single-Arm Dumbbell Row', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_146', name: 'Single-Leg Romanian Deadlift', equipment: ['Dumbbell'] },
  { id: 'exercise_147', name: 'Straight-Arm Pulldown', equipment: ['Cable'] },
  { id: 'exercise_148', name: 'Rear Delt Fly Machine', equipment: ['Machine'] },
  { id: 'exercise_149', name: 'Glute Kickback Machine', equipment: ['Machine'] },
  { id: 'exercise_150', name: 'Weighted Pull-ups', equipment: ['Bodyweight'] },
  { id: 'exercise_151', name: 'Weighted Dips', equipment: ['Bodyweight', 'Dumbbell'] },
  { id: 'exercise_152', name: 'Medicine Ball Slams', equipment: ['Medicine Ball'] },
  { id: 'exercise_153', name: 'Dumbbell Goblet Squat', equipment: ['Dumbbell'] },
  { id: 'exercise_154', name: 'Dumbbell Calf Raises', equipment: ['Machine'] },
  { id: 'exercise_155', name: 'Barbell Overhead Press', equipment: ['Barbell'] },
  { id: 'exercise_156', name: 'Trap Bar Deadlift', equipment: ['Trap Bar'] },
  { id: 'exercise_157', name: 'Hex Bar Deadlift', equipment: ['Trap Bar'] },
  { id: 'exercise_158', name: 'Sumo Deadlift', equipment: ['Barbell'] },
  { id: 'exercise_159', name: "Farmer's Carry", equipment: ['Dumbbell'] },
  { id: 'exercise_160', name: 'Cable Glute Kickback', equipment: ['Cable'] },
  { id: 'exercise_161', name: 'Dumbbell Pullover', equipment: ['Dumbbell', 'Bench'] },
  { id: 'exercise_162', name: 'Wrist Curls', equipment: ['Dumbbell'] },
  { id: 'exercise_163', name: 'Cable Lateral Raise', equipment: ['Cable'] },
  { id: 'exercise_164', name: 'Hanging Leg Raise', equipment: ['Pull-up Bar'] },
  { id: 'exercise_165', name: 'T-Bar Row', equipment: ['Barbell', 'Landmine'] },
  { id: 'exercise_166', name: 'Cable Woodchop', equipment: ['Cable'] },
  { id: 'exercise_167', name: 'Incline Dumbbell Curl', equipment: ['Dumbbell', 'Bench'] },
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
  { id: 'bodyweight_008', name: 'Bodyweight Squats', equipment: ['Bodyweight'] },
  { id: 'bodyweight_009', name: 'Lunges', equipment: ['Bodyweight'] },
  { id: 'bodyweight_010', name: 'Mountain Climbers', equipment: ['Bodyweight'] },
  { id: 'bodyweight_011', name: 'Burpees', equipment: ['Bodyweight'] },
  { id: 'bodyweight_012', name: 'Inverted Rows', equipment: ['Bodyweight'] },
  { id: 'bodyweight_013', name: 'Bodyweight Pistol Squats', equipment: ['Bodyweight'] },
  { id: 'bodyweight_015', name: 'Handstand Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_016', name: 'Muscle-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_017', name: 'Jump Squats', equipment: ['Bodyweight'] },
  { id: 'bodyweight_018', name: 'Plyometric Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_019', name: 'High Knees', equipment: ['Bodyweight'] },
  { id: 'bodyweight_020', name: 'Plank to Push-up', equipment: ['Bodyweight'] },
  { id: 'bodyweight_021', name: 'Bodyweight Bulgarian Split Squats', equipment: ['Bodyweight'] },
  { id: 'bodyweight_022', name: 'One-Arm Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_023', name: 'Archer Pull-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_024', name: 'Dragon Flags', equipment: ['Bodyweight'] },
  { id: 'bodyweight_025', name: 'Russian Twist', equipment: ['Bodyweight'] },
  { id: 'bodyweight_026', name: 'Pike Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_027', name: 'Knee Push-ups', equipment: ['Bodyweight'] },
  { id: 'bodyweight_028', name: 'Jumping Jacks', equipment: ['Bodyweight'] },
  { id: 'bodyweight_029', name: 'Butt Kicks', equipment: ['Bodyweight'] },
  { id: 'bodyweight_030', name: 'Dead Bugs', equipment: ['Bodyweight'] },
  { id: 'bodyweight_031', name: 'Bird Dogs', equipment: ['Bodyweight'] },
  { id: 'bodyweight_032', name: 'Bicycle Crunches', equipment: ['Bodyweight'] },
  { id: 'bodyweight_033', name: 'Bodyweight Reverse Lunges', equipment: ['Bodyweight'] },
  { id: 'bodyweight_034', name: 'Bodyweight Walking Lunges', equipment: ['Bodyweight'] },
  { id: 'bodyweight_035', name: 'Jump Lunges', equipment: ['Bodyweight'] },
  { id: 'bodyweight_036', name: 'Plank Jacks', equipment: ['Bodyweight'] },
  { id: 'bodyweight_037', name: 'Bodyweight Glute Bridges', equipment: ['Bodyweight'] },
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

// AUTO-GENERATED muscle group mapping from exercises.json primary muscle weights
const EXERCISE_MUSCLE_GROUPS: Record<string, string[]> = {
  'back': [
    'Wide Grip Lat Pulldown', 'Seated Row Machine', 'Hyperextensions', 'Barbell Deadlift',
    'Barbell Shrugs', 'Barbell Bent-Over Row', 'Cable Underhand Pulldown',
    'Chest Supported T-Bar Row', 'Close Grip Lat Pulldown', 'Dumbbell Shrugs',
    'Dumbbell Upright Row', 'Face Pull', 'Kneeling Single Arm Lat Pulldown',
    'Reverse Grip Bent Over Barbell Row', 'Seated Back Extension Machine', 'Seated Cable Rows',
    'Smith Machine Bent Over Row', 'Pull-ups', 'Chin-ups', 'Inverted Rows',
    'Assisted Pull-ups', 'Assisted Chin-ups', 'Band Rows', 'Muscle-ups', 'Archer Pull-ups',
    'Bird Dogs', 'Single-Arm Dumbbell Row', 'Straight-Arm Pulldown', 'Weighted Pull-ups',
    'Dumbbell Pullover', 'T-Bar Row',
  ],
  'biceps': [
    'Bicep Curl Machine', 'Dumbbell Hammer Curls', 'EZ Bar Curls', 'Cable Bicep Curl',
    'Dumbbell Bicep Curls', 'Incline Dumbbell Bicep Curls', 'Barbell Bicep Curl',
    'Barbell Drag Curl', 'Barbell Preacher Curl', 'Cable Hammer Curl', 'Cable Preacher Curl',
    'Dumbbell Concentration Curl', 'Dumbbell Hammer Preacher Curls', 'Dumbbell Spider Curl',
    'Dumbbell Zottman Curls', 'Preacher Curl Machine', 'Reverse Dumbbell Bicep Curl',
    'Reverse EZ Bar Curl', 'Seated Dumbbell Bicep Curls', 'Band Bicep Curls',
    'Incline Dumbbell Curl',
  ],
  'calves': [
    'Standing Calf Raise Machine', 'Calf Press on a Leg Press Machine',
    'Seated Barbell Calf Raise', 'Seated Calf Raise Machine', 'Dumbbell Calf Raises',
  ],
  'chest': [
    'Barbell Bench Press', 'Chest Press Machine', 'Butterfly Machine', 'Cable Crossover',
    'Cable Flat Bench Fly', 'Decline Barbell Bench Press', 'Decline Chest Press Machine',
    'Decline Dumbbell Bench Press', 'Decline Dumbbell Fly', 'Dumbbell Bench Press',
    'Dumbbell Fly', 'Incline Barbell Bench Press', 'Incline Cable Fly',
    'Incline Chest Press Machine', 'Incline Dumbbell Bench Press', 'Incline Dumbbell Fly',
    'Lying Chest Press Machine', 'Seated Cable Fly', 'Smith Machine Bench Press',
    'Smith Machine Decline Bench Press', 'Smith Machine Incline Bench Press',
    'Push-ups', 'Plyometric Push-ups', 'One-Arm Push-ups', 'Knee Push-ups',
    'Barbell Floor Press', 'Close Grip Barbell Bench Press',
  ],
  'core': [
    'Cable Crunch', 'Decline Oblique Crunch', 'Decline Sit-ups', 'Kettlebell Russian Twist',
    'Seated Ab Crunch Machine', 'Crunches', 'Sit-ups', 'Leg Raises', 'Mountain Climbers',
    'Plank', 'Side Plank', 'Hollow Body Hold', 'L-Sit Hold', 'High Knees', 'Plank to Push-up',
    'Dragon Flags', 'Russian Twist', 'Dead Bugs', 'Bicycle Crunches', 'Plank Jacks',
    'Medicine Ball Slams', 'Hanging Leg Raise', 'Cable Woodchop',
  ],
  'forearms': [
    'Reverse Wrist Curls', 'Dead Hang', "Farmer's Carry", 'Wrist Curls',
  ],
  'glutes': [
    'Hip Adductor', 'Hip Abductor', 'Barbell Glute Bridge', 'Barbell Hip Thrust',
    'Barbell Step Ups', 'Cable Hip Abduction', 'Cable Hip Adduction', 'Cable Pull Through',
    'Hip Thrust Machine', 'Kettlebell Swing', 'Smith Machine Hip Thrust', 'Band Lateral Walks',
    'Glute Bridge Hold', 'Bodyweight Glute Bridges', 'Dumbbell Hip Thrusts',
    'Glute Kickback Machine', 'Sumo Deadlift', 'Cable Glute Kickback',
  ],
  'hamstrings': [
    'Seated Leg Curl', 'Lying Leg Curl', 'Barbell Good Mornings', 'Barbell Romanian Deadlift',
    'Dumbbell Deadlifts', 'Dumbbell Romanian Deadlifts', 'Kettlebell Romanian Deadlift',
    'Smith Machine Good Morning', 'Butt Kicks', 'Single-Leg Romanian Deadlift',
  ],
  'quads': [
    'Leg Press', 'Leg Extensions', 'Barbell Squat', 'Dumbbell Bulgarian Split Squat',
    'Barbell Bulgarian Split Squat', 'Barbell Clean', 'Barbell Clean and Jerk',
    'Barbell Front Squat', 'Barbell Hack Squat', 'Barbell Lunges', 'Barbell Overhead Squat',
    'Barbell Power Clean', 'Barbell Snatch', 'Dumbbell Bulgarian Split Squats',
    'Dumbbell Front Squat', 'Dumbbell Lunges', 'Dumbbell Reverse Lunges', 'Dumbbell Squats',
    'Dumbbell Step-Ups', 'Hack Squat Machine', 'Kettlebell Front Squat',
    'Kettlebell Goblet Squat', 'Smith Machine Bulgarian Split Squat', 'Smith Machine Deadlift',
    'Smith Machine Hack Squat', 'Dumbbell Goblet Squat', 'Bodyweight Squats', 'Lunges',
    'Burpees', 'Wall Sit', 'Bodyweight Pistol Squats', 'Jump Squats',
    'Bodyweight Bulgarian Split Squats', 'Bodyweight Reverse Lunges',
    'Bodyweight Walking Lunges', 'Jump Lunges', 'Trap Bar Deadlift', 'Hex Bar Deadlift',
  ],
  'shoulders': [
    'Lateral Raises', 'Dumbbell Shoulder Press', 'Seated Shoulder Press Machine',
    'Dumbbell Front Raises', 'Arnold Press', 'Barbell Front Raises', 'Barbell Upright Rows',
    'Cable Front Raises', 'Cable Upright Row', 'Dumbbell Cuban Press', 'Landmine Press',
    'Lateral Raise Machine', 'Rear Delt Machine', 'Seated Barbell Military Press',
    'Seated Bent Over Rear Delt Raise', 'Band Pull-aparts', 'Band Face Pulls',
    'Handstand Push-ups', 'Pike Push-ups', 'Rear Delt Fly Machine', 'Barbell Overhead Press',
    'Cable Lateral Raise',
  ],
  'triceps': [
    'Cable Triceps Pushdown', 'Seated Triceps Dip Machine', 'Triceps Extension Machine',
    'Triceps Kickback', 'Cable Incline Triceps Extension',
    'Dumbbell Triceps Kickback', 'EZ Bar Decline Triceps Extension',
    'Incline Barbell Triceps Extension', 'Incline Dumbbell Triceps Extension',
    'Kneeling Cable Triceps Extension', 'Skullcrusher', 'Overhead Cable Triceps Extension',
    'Seated Dumbbell Triceps Extension', 'Smith Machine Close Grip Bench Press',
    'Dips', 'Assisted Dips', 'Band Tricep Pushdowns', 'Dumbbell Overhead Tricep Extension',
    'Weighted Dips',
  ],
  'traps': [
    'Barbell Shrugs', 'Dumbbell Shrugs',
  ],
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
      message: 'Select exercises from these options. CRITICAL: Use the EXACT exercise names as shown here — do NOT rename, abbreviate, or paraphrase them. Copy names character-for-character into both the message and payload.',
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
  | 'getSetsPerMuscleGroup'
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
  params: Record<string, unknown>,
  timezone?: string,
  appStats?: AppStats
): Promise<StatResult> => {
  const tz = timezone || 'UTC';
  switch (functionName) {
    case 'getExerciseVolumeAllTime':
      return getExerciseVolumeAllTime(supabase, userId, params.exerciseName as string | undefined, appStats);
    case 'getExerciseMaxWeight':
      return getExerciseMaxWeight(supabase, userId, params.exerciseName as string | undefined);
    case 'getWorkoutStats':
      return getWorkoutStats(supabase, userId, appStats);
    case 'getExerciseProgress':
      return getExerciseProgress(supabase, userId, params.exerciseName as string);
    case 'getMuscleGroupVolume':
      return getMuscleGroupVolume(supabase, userId, appStats);
    case 'getSetsPerMuscleGroup':
      return getSetsPerMuscleGroup(supabase, userId, (params.days as number) ?? 7);
    case 'getWorkoutFrequency':
      return getWorkoutFrequency(supabase, userId, (params.days as number) ?? 30);
    case 'getPersonalRecords':
      return getPersonalRecords(supabase, userId);
    case 'getRecentWorkoutSummary':
      return getRecentWorkoutSummary(supabase, userId, (params.count as number) ?? 5, tz);
    case 'getWorkoutsForDate':
      return getWorkoutsForDate(supabase, userId, params.date as string, tz);
    case 'lookupExercises':
      return lookupExercises(params.exerciseNames as string);
    case 'getExercisesByMuscleGroup':
      return getExercisesByMuscleGroup(params.muscleGroups as string);
    default:
      return { success: false, data: null, error: `Unknown function: ${functionName}` };
  }
};
