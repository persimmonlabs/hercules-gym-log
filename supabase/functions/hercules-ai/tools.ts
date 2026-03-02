export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

export const STAT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'getExerciseVolumeAllTime',
      description:
        'Calculate total volume (weight × reps) for exercises across all workout history. If no exerciseName is provided, returns volume for ALL exercises sorted by highest volume. Use this to find which exercise has the most volume lifted.',
      parameters: {
        type: 'object',
        properties: {
          exerciseName: {
            type: 'string',
            description:
              'Optional. The exact name of the exercise to get volume for. If omitted, returns all exercises.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getExerciseMaxWeight',
      description:
        'Get the maximum weight lifted for exercises (personal records). If no exerciseName is provided, returns max weight for ALL exercises.',
      parameters: {
        type: 'object',
        properties: {
          exerciseName: {
            type: 'string',
            description:
              'Optional. The exact name of the exercise. If omitted, returns PRs for all exercises.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWorkoutStats',
      description:
        'Get overall workout statistics including total workouts, total duration, average duration, total sets, total reps, total volume, and date range.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getExerciseProgress',
      description:
        'Get progress over time for a specific exercise, showing how weight and volume changed across workouts.',
      parameters: {
        type: 'object',
        properties: {
          exerciseName: {
            type: 'string',
            description: 'The exact name of the exercise to track progress for.',
          },
        },
        required: ['exerciseName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMuscleGroupVolume',
      description:
        'Get volume breakdown by MUSCLE GROUP (Chest, Back, Shoulders, etc.), showing total volume per muscle group and which exercises contributed. Use this for muscle balance analysis.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSetsPerMuscleGroup',
      description:
        'Get the number of completed SETS per muscle group over a time period. Use this to answer questions like "how many sets per muscle group per week" or "am I doing enough sets for chest". Returns set counts broken down by muscle group with weekly averages. Default period is 7 days (1 week). Use days=30 for monthly analysis.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to analyze. Default is 7 (one week). Use 30 for monthly, 14 for biweekly.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getExercisesByMuscleGroup',
      description:
        'REQUIRED: Call this FIRST when creating a workout to discover available exercises. Returns all exercises for specified muscle groups with their IDs. Use this to pick NEW exercises - do NOT copy exercises from user\'s existing workouts in context. IMPORTANT: When creating a PROGRAM with multiple workouts, make a SEPARATE call for EACH workout with ONLY that workout\'s target muscle groups. Push Day = chest,shoulders,triceps ONLY. Pull Day = back,biceps ONLY. Leg Day = quads,hamstrings,glutes,calves ONLY. NEVER mix muscle groups across workouts.',
      parameters: {
        type: 'object',
        properties: {
          muscleGroups: {
            type: 'string',
            description: 'Comma-separated muscle groups. For push day use "chest,shoulders,triceps". For pull day use "back,biceps". For leg day use "quads,hamstrings,glutes,calves". Available: chest, shoulders, triceps, back, biceps, quads, hamstrings, glutes, calves, core.',
          },
        },
        required: ['muscleGroups'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookupExercises',
      description:
        'Validate exercise names and get their IDs. Use this AFTER selecting exercises from getExercisesByMuscleGroup to confirm they exist. Returns exercise ID, name, and equipment for each match.',
      parameters: {
        type: 'object',
        properties: {
          exerciseNames: {
            type: 'string',
            description: 'Comma-separated list of exercise names to look up (e.g., "Barbell Bench Press, Lateral Raises, Dips").',
          },
        },
        required: ['exerciseNames'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWorkoutFrequency',
      description:
        'Get workout frequency statistics for a given period, including workouts per week and breakdown by day of week. IMPORTANT: Always tell the user what time period was analyzed (e.g., "over the last 30 days"). Use days=9999 for all-time stats. If the user asks about a specific period, convert it to days (e.g., "this month" ≈ 30, "all time" = 9999, "last 2 weeks" = 14).',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to analyze. Default is 30. Use 7 for weekly, 14 for biweekly, 30 for monthly, 9999 for all-time.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPersonalRecords',
      description:
        'Get all personal records (heaviest weight lifted) for each exercise the user has performed.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRecentWorkoutSummary',
      description:
        'Get a summary of recent workouts. When count is 1 or 2, returns FULL exercise-by-exercise breakdown with every set (weight, reps, duration, distance). When count is 3+, returns a compact summary per workout. Use count=1 when user asks "what did I do last workout" or "show me my last session". Use count=5 when user asks "show me my last 5 workouts".',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of recent workouts to return. Default is 5. Use 1 for detailed single-workout breakdown.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWorkoutsForDate',
      description:
        'Check if the user worked out on a specific date and get details of those workouts. Use this for questions like "did I work out today" or "what did I do yesterday". The date should be in YYYY-MM-DD format.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date to check in YYYY-MM-DD format (e.g., "2026-01-16").',
          },
        },
        required: ['date'],
      },
    },
  },
];

export const getToolByName = (name: string): ToolDefinition | undefined => {
  return STAT_TOOLS.find((tool) => tool.function.name === name);
};
