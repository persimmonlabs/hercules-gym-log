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
      name: 'getExercisesByMuscleGroup',
      description:
        'REQUIRED: Call this FIRST when creating a workout to discover available exercises. Returns all exercises for specified muscle groups with their IDs. Use this to pick NEW exercises - do NOT copy exercises from user\'s existing workouts in context.',
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
        'Get workout frequency statistics for a given period, including workouts per week and breakdown by day of week.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to analyze. Default is 30.',
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
        'Get a summary of recent workouts including exercise count, sets, and volume for each.',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of recent workouts to return. Default is 5.',
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
