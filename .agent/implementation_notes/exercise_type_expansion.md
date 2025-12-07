# Exercise Type Expansion - Implementation Plan

## Overview

**Goal:** Add support for Cardio, Bodyweight, Assisted, Resistance Band, and Duration exercises alongside existing Weight exercises.

**Key Design Decisions:**
- All exercise types use the "sets" pattern (cardio users can log intervals)
- No redundant fields (no speed - calculate from distance/time)
- Cardio can be mixed with weights in the same workout
- User's body weight (from profile) used for bodyweight/assisted volume calculations
- All exercises appear as one unified collection (no visual distinction by type)
- Exercise type filter added for users who want to narrow selection

---

## Exercise Type Definitions

| Type | `exercise_type` | Input Fields | Volume Calculation | Examples |
|------|-----------------|--------------|-------------------|----------|
| **Weight** | `weight` | Weight (lbs) + Reps | weight × reps | Bench Press, Squat, Deadlift |
| **Cardio** | `cardio` | Duration (min) + Distance | N/A (separate stats) | Treadmill, Bike, Rowing |
| **Bodyweight** | `bodyweight` | Reps only | bodyWeight × reps | Push-ups, Pull-ups, Crunches |
| **Assisted** | `assisted` | Assistance (lbs) + Reps | (bodyWeight - assistance) × reps | Assisted Pull-up Machine |
| **Reps Only** | `reps_only` | Reps only | N/A (variable resistance) | Resistance Band exercises |
| **Duration** | `duration` | Time (seconds) | N/A | Plank, Wall Sit, Dead Hang |

### Field Details

**Weight:** `weight` (lbs, ±2.5), `reps` (±1)
**Cardio:** `duration` (minutes, ±1), `distance` (miles/meters based on exercise, ±0.1 or ±100)
**Bodyweight:** `reps` (±1)
**Assisted:** `assistanceWeight` (lbs, ±5), `reps` (±1)
**Reps Only:** `reps` (±1)
**Duration:** `duration` (seconds, ±5, displayed as mm:ss)

---

## Status Tracker

### Phase 1: Type System ✅ COMPLETE
- [x] 1.1 Update `src/types/exercise.ts` - Add ExerciseType
- [x] 1.2 Update `src/types/workout.ts` - Update SetLog
- [x] 1.3 Update `src/constants/exercises.ts` - Parse new fields
- [x] 1.4 Update `src/utils/exerciseFilters.ts` - Add type filter
- [x] 1.5 Update `src/types/analytics.ts` - Add CardioStats
- [x] **CHECKPOINT 1:** App compiles ✓ (TypeScript passes)

### Phase 2: User Profile ✅ COMPLETE
- [x] 2.1 Update `src/store/userProfileStore.ts` - Add height/weight
- [x] 2.2 Create `src/components/molecules/BodyMetricsModal.tsx`
- [x] 2.3 Update `app/modals/profile.tsx` - Add Body Metrics option
- [x] **CHECKPOINT 2:** TypeScript compiles ✓

### Phase 3: Exercise Data ✅ COMPLETE
- [x] 3.1 Existing exercises default to 'weight' (no changes needed - handled in code)
- [x] 3.2 Add Cardio exercises (8 new)
- [x] 3.3 Add Bodyweight exercises (12 new)
- [x] 3.4 Add Assisted exercises (3 new)
- [x] 3.5 Add Resistance Band exercises (6 new)
- [x] 3.6 Add Duration exercises (6 new)
- [x] **CHECKPOINT 3:** TypeScript compiles ✓

### Phase 4: UI Components ✅ COMPLETE
- [x] 4.1 Added type-specific inputs directly in ExerciseSetEditor (not separate components)
- [x] 4.2 Update `ExerciseSetEditor.tsx` - Switch inputs by type
- [x] 4.3 Update `app/workout-session.tsx` - Pass exercise type + type-aware defaults
- [x] 4.4 Update `FilterBottomSheet.tsx` - Add type filter chips
- [x] **CHECKPOINT 4:** TypeScript compiles ✓ - READY FOR USER TESTING

### Phase 5: Analytics ✅ COMPLETE
- [x] 5.1 Update `useAnalyticsData.ts` - Add cardio stats calculation
- [x] 5.2 Update `useAnalyticsData.ts` - Fix volume for bodyweight/assisted
- [x] 5.3 Create `src/components/molecules/CardioStatsCard.tsx`
- [x] 5.4 Update `app/(tabs)/profile.tsx` - Add CardioStatsCard
- [x] **CHECKPOINT 5:** TypeScript compiles ✓

### Phase 6: Premade Content ✅ COMPLETE
- [x] 6.1 Added "Cardio + Strength Combo" and "Endurance Builder" workouts
- [x] 6.2 Added "Bodyweight Basics", "Core Crusher", "Resistance Band Full Body" workouts
- [x] 6.3 Added "Beginner Pull Training" with assisted exercises
- [x] 6.4 Added "HIIT Cardio Blast" mixed workout
- [x] **CHECKPOINT 6:** TypeScript compiles ✓ - ALL PHASES COMPLETE

---

## Phase 1: Type System Updates

### 1.1 Update `src/types/exercise.ts`

**Add after line 76 (after DifficultyLevel):**
```typescript
// Exercise input types
export type ExerciseType = 'weight' | 'cardio' | 'bodyweight' | 'assisted' | 'reps_only' | 'duration';

export const EXERCISE_TYPES: ExerciseType[] = [
  'weight',
  'cardio',
  'bodyweight',
  'assisted',
  'reps_only',
  'duration',
];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  weight: 'Weight',
  cardio: 'Cardio',
  bodyweight: 'Bodyweight',
  assisted: 'Assisted',
  reps_only: 'Resistance Band',
  duration: 'Timed',
};
```

**Update Exercise interface (around line 109) - add these fields:**
```typescript
exerciseType: ExerciseType;
distanceUnit?: 'miles' | 'meters';  // For cardio exercises
```

**Update ExerciseFilters interface (around line 127) - add:**
```typescript
exerciseTypes: ExerciseType[];
```

### 1.2 Update `src/types/workout.ts`

**Replace SetLog interface:**
```typescript
export interface SetLog {
  completed: boolean;
  // Weight exercises
  weight?: number;
  reps?: number;
  // Cardio exercises
  duration?: number;      // stored as seconds for cardio, displayed as minutes
  distance?: number;      // miles or meters based on exercise
  // Assisted exercises
  assistanceWeight?: number;
}
```

### 1.3 Update `src/constants/exercises.ts`

**Update RawExercise interface (around line 21):**
```typescript
interface RawExercise {
  id: string;
  name: string;
  muscles: Record<string, number>;
  equipment: EquipmentType[];
  movement_pattern: MovementPattern;
  difficulty: DifficultyLevel;
  is_compound: boolean;
  exercise_type?: ExerciseType;      // NEW - defaults to 'weight'
  distance_unit?: 'miles' | 'meters'; // NEW - for cardio
}
```

**Update toExercise function return object (around line 179) - add:**
```typescript
exerciseType: exercise.exercise_type || 'weight',
distanceUnit: exercise.distance_unit,
```

**Update buildSearchIndex (around line 120) - add exercise type to search:**
```typescript
if (exercise.exercise_type) {
  parts.push(exercise.exercise_type);
}
```

### 1.4 Update `src/utils/exerciseFilters.ts`

**Update createDefaultExerciseFilters:**
```typescript
export const createDefaultExerciseFilters = (): ExerciseFilters => ({
  muscleGroups: [],
  specificMuscles: [],
  equipment: [],
  difficulty: [],
  bodyweightOnly: false,
  compoundOnly: false,
  exerciseTypes: [],  // NEW
});
```

**Add new filter function (before matchesExerciseFilters):**
```typescript
const matchesExerciseType = (exercise: Exercise, selected: ExerciseType[]): boolean => {
  if (selected.length === 0) return true;
  return selected.includes(exercise.exerciseType);
};
```

**Add to matchesExerciseFilters function (around line 120):**
```typescript
if (!matchesExerciseType(exercise, filters.exerciseTypes)) {
  return false;
}
```

**Update countActiveFilters:**
```typescript
count += filters.exerciseTypes.length;
```

### 1.5 Update `src/types/analytics.ts`

**Add after StreakData interface (around line 118):**
```typescript
// Cardio statistics
export interface CardioStats {
  totalDuration: number;  // Total seconds across all cardio
  totalDistanceByType: Record<string, number>;  // exerciseName -> total distance
  sessionCount: number;   // Number of workouts containing cardio
}
```

---

## Phase 2: User Profile (Height/Weight)

### 2.1 Update `src/store/userProfileStore.ts`

**Update UserProfile interface (line 10):**
```typescript
interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  // Body metrics for analytics
  heightFeet?: number;
  heightInches?: number;
  weightLbs?: number;
}
```

**Update UserProfileState interface - add:**
```typescript
updateBodyMetrics: (heightFeet: number, heightInches: number, weightLbs: number) => Promise<void>;
getBodyWeightLbs: () => number | null;
```

**Update fetchProfile select query (line 41):**
```typescript
.select('first_name, last_name, full_name, height_feet, height_inches, weight_lbs')
```

**Update the data mapping in fetchProfile:**
```typescript
set({
  profile: {
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    fullName: data.full_name || '',
    heightFeet: data.height_feet,
    heightInches: data.height_inches,
    weightLbs: data.weight_lbs,
  },
  isLoading: false,
});
```

**Add new functions to the store:**
```typescript
updateBodyMetrics: async (heightFeet: number, heightInches: number, weightLbs: number) => {
  const currentProfile = get().profile;
  set({
    profile: {
      firstName: currentProfile?.firstName || '',
      lastName: currentProfile?.lastName || '',
      fullName: currentProfile?.fullName || '',
      heightFeet,
      heightInches,
      weightLbs,
    },
  });
  // Persist to Supabase
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      await supabaseClient.from('profiles').update({
        height_feet: heightFeet,
        height_inches: heightInches,
        weight_lbs: weightLbs,
      }).eq('id', user.id);
    }
  } catch (error) {
    console.error('[UserProfileStore] Error updating body metrics:', error);
  }
},

getBodyWeightLbs: () => {
  const { profile } = get();
  return profile?.weightLbs ?? null;
},
```

### 2.2 Create `src/components/molecules/BodyMetricsModal.tsx`

**Purpose:** Modal for editing height (ft/in) and weight (lbs)

**Props:**
```typescript
interface BodyMetricsModalProps {
  visible: boolean;
  heightFeet: number;
  heightInches: number;
  weightLbs: number;
  onClose: () => void;
  onSave: (heightFeet: number, heightInches: number, weightLbs: number) => void;
}
```

**Features:**
- Height: Two side-by-side pickers (feet 4-7, inches 0-11)
- Weight: Numeric TextInput with lbs label
- Save and Cancel buttons
- Follows existing modal patterns (see NameEditModal.tsx)

### 2.3 Update `app/modals/profile.tsx`

**Add import:**
```typescript
import { BodyMetricsModal } from '@/components/molecules/BodyMetricsModal';
```

**Add state:**
```typescript
const [isBodyMetricsModalVisible, setIsBodyMetricsModalVisible] = useState(false);
```

**Add helper function:**
```typescript
const getBodyMetricsSubtitle = () => {
  if (profile?.heightFeet && profile?.weightLbs) {
    return `${profile.heightFeet}'${profile.heightInches || 0}" • ${profile.weightLbs} lbs`;
  }
  return 'Set height and weight for accurate stats';
};
```

**Add PreferenceItem after "Units of Measurement" (around line 248):**
```typescript
<PreferenceItem
  icon="straighten"
  title="Body Metrics"
  subtitle={getBodyMetricsSubtitle()}
  onPress={() => {
    void Haptics.selectionAsync();
    setIsBodyMetricsModalVisible(true);
  }}
/>
```

**Add modal at end of component (before closing SafeAreaView):**
```typescript
<BodyMetricsModal
  visible={isBodyMetricsModalVisible}
  heightFeet={profile?.heightFeet || 5}
  heightInches={profile?.heightInches || 9}
  weightLbs={profile?.weightLbs || 150}
  onClose={() => setIsBodyMetricsModalVisible(false)}
  onSave={(ft, inches, lbs) => {
    updateBodyMetrics(ft, inches, lbs);
    setIsBodyMetricsModalVisible(false);
  }}
/>
```

---

## Phase 3: Exercise Data

### 3.1 Add exercise_type to existing exercises

Add `"exercise_type": "weight"` to every existing exercise object in `src/data/exercises.json`.

Example transformation:
```json
// BEFORE
{
  "id": "exercise_001",
  "name": "Barbell Bench Press",
  "muscles": { ... },
  ...
}

// AFTER
{
  "id": "exercise_001",
  "name": "Barbell Bench Press",
  "exercise_type": "weight",
  "muscles": { ... },
  ...
}
```

### 3.2 New Cardio Exercises

```json
{
  "id": "cardio_001",
  "name": "Treadmill",
  "exercise_type": "cardio",
  "distance_unit": "miles",
  "muscles": {},
  "equipment": ["Cardio Machine"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "cardio_002",
  "name": "Stationary Bike",
  "exercise_type": "cardio",
  "distance_unit": "miles",
  "muscles": {},
  "equipment": ["Cardio Machine"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "cardio_003",
  "name": "Rowing Machine",
  "exercise_type": "cardio",
  "distance_unit": "meters",
  "muscles": {
    "Lats": 0.25, "Mid Back": 0.20, "Biceps": 0.15,
    "Quads": 0.15, "Glutes": 0.10, "Hamstrings": 0.10, "Lower Back": 0.05
  },
  "equipment": ["Cardio Machine"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "cardio_004",
  "name": "Elliptical",
  "exercise_type": "cardio",
  "distance_unit": "miles",
  "muscles": {},
  "equipment": ["Cardio Machine"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "cardio_005",
  "name": "Stair Climber",
  "exercise_type": "cardio",
  "distance_unit": "floors",
  "muscles": {
    "Quads": 0.35, "Glutes": 0.35, "Hamstrings": 0.20, "Calves": 0.10
  },
  "equipment": ["Cardio Machine"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "cardio_006",
  "name": "Outdoor Run",
  "exercise_type": "cardio",
  "distance_unit": "miles",
  "muscles": {},
  "equipment": ["Bodyweight"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "cardio_007",
  "name": "Outdoor Walk",
  "exercise_type": "cardio",
  "distance_unit": "miles",
  "muscles": {},
  "equipment": ["Bodyweight"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "cardio_008",
  "name": "Sprint Intervals",
  "exercise_type": "cardio",
  "distance_unit": "meters",
  "muscles": {
    "Quads": 0.30, "Hamstrings": 0.25, "Glutes": 0.25, "Calves": 0.20
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Cardio",
  "difficulty": "Intermediate",
  "is_compound": true
}
```

### 3.3 New Bodyweight Exercises

```json
{
  "id": "bodyweight_001",
  "name": "Push-ups",
  "exercise_type": "bodyweight",
  "muscles": {
    "Mid Chest": 0.30, "Upper Chest": 0.20, "Front Delts": 0.20,
    "Triceps": 0.25, "Upper Abs": 0.05
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Horizontal Push",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "bodyweight_002",
  "name": "Pull-ups",
  "exercise_type": "bodyweight",
  "muscles": {
    "Lats": 0.40, "Biceps": 0.25, "Mid Back": 0.15,
    "Rear Delts": 0.10, "Forearms": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Vertical Pull",
  "difficulty": "Intermediate",
  "is_compound": true
},
{
  "id": "bodyweight_003",
  "name": "Chin-ups",
  "exercise_type": "bodyweight",
  "muscles": {
    "Biceps": 0.35, "Lats": 0.35, "Mid Back": 0.15,
    "Rear Delts": 0.10, "Forearms": 0.05
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Vertical Pull",
  "difficulty": "Intermediate",
  "is_compound": true
},
{
  "id": "bodyweight_004",
  "name": "Dips",
  "exercise_type": "bodyweight",
  "muscles": {
    "Triceps": 0.40, "Lower Chest": 0.25, "Mid Chest": 0.15, "Front Delts": 0.20
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Vertical Push",
  "difficulty": "Intermediate",
  "is_compound": true
},
{
  "id": "bodyweight_005",
  "name": "Crunches",
  "exercise_type": "bodyweight",
  "muscles": {
    "Upper Abs": 0.60, "Lower Abs": 0.30, "Obliques": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Flexion",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "bodyweight_006",
  "name": "Sit-ups",
  "exercise_type": "bodyweight",
  "muscles": {
    "Upper Abs": 0.45, "Lower Abs": 0.35, "Obliques": 0.10, "Quads": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Flexion",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "bodyweight_007",
  "name": "Leg Raises",
  "exercise_type": "bodyweight",
  "muscles": {
    "Lower Abs": 0.60, "Upper Abs": 0.25, "Quads": 0.15
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Flexion",
  "difficulty": "Intermediate",
  "is_compound": false
},
{
  "id": "bodyweight_008",
  "name": "Air Squats",
  "exercise_type": "bodyweight",
  "muscles": {
    "Quads": 0.40, "Glutes": 0.35, "Hamstrings": 0.15,
    "Calves": 0.05, "Lower Back": 0.05
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Squat",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "bodyweight_009",
  "name": "Lunges",
  "exercise_type": "bodyweight",
  "muscles": {
    "Quads": 0.35, "Glutes": 0.35, "Hamstrings": 0.20, "Calves": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Lunge",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "bodyweight_010",
  "name": "Mountain Climbers",
  "exercise_type": "bodyweight",
  "muscles": {
    "Upper Abs": 0.25, "Lower Abs": 0.25, "Quads": 0.20,
    "Front Delts": 0.15, "Triceps": 0.15
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Cardio",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "bodyweight_011",
  "name": "Burpees",
  "exercise_type": "bodyweight",
  "muscles": {
    "Quads": 0.20, "Glutes": 0.15, "Mid Chest": 0.15, "Triceps": 0.15,
    "Front Delts": 0.15, "Upper Abs": 0.10, "Lower Abs": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Cardio",
  "difficulty": "Intermediate",
  "is_compound": true
},
{
  "id": "bodyweight_012",
  "name": "Inverted Rows",
  "exercise_type": "bodyweight",
  "muscles": {
    "Mid Back": 0.35, "Lats": 0.25, "Biceps": 0.20,
    "Rear Delts": 0.15, "Forearms": 0.05
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Horizontal Pull",
  "difficulty": "Beginner",
  "is_compound": true
}
```

### 3.4 New Assisted Exercises

```json
{
  "id": "assisted_001",
  "name": "Assisted Pull-ups",
  "exercise_type": "assisted",
  "muscles": {
    "Lats": 0.40, "Biceps": 0.25, "Mid Back": 0.15,
    "Rear Delts": 0.10, "Forearms": 0.10
  },
  "equipment": ["Machine"],
  "movement_pattern": "Vertical Pull",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "assisted_002",
  "name": "Assisted Dips",
  "exercise_type": "assisted",
  "muscles": {
    "Triceps": 0.40, "Lower Chest": 0.25, "Mid Chest": 0.15, "Front Delts": 0.20
  },
  "equipment": ["Machine"],
  "movement_pattern": "Vertical Push",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "assisted_003",
  "name": "Assisted Chin-ups",
  "exercise_type": "assisted",
  "muscles": {
    "Biceps": 0.35, "Lats": 0.35, "Mid Back": 0.15,
    "Rear Delts": 0.10, "Forearms": 0.05
  },
  "equipment": ["Machine"],
  "movement_pattern": "Vertical Pull",
  "difficulty": "Beginner",
  "is_compound": true
}
```

### 3.5 New Resistance Band Exercises

```json
{
  "id": "band_001",
  "name": "Band Pull-aparts",
  "exercise_type": "reps_only",
  "muscles": {
    "Rear Delts": 0.50, "Mid Back": 0.30, "Traps": 0.20
  },
  "equipment": ["Bands"],
  "movement_pattern": "Horizontal Pull",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "band_002",
  "name": "Band Rows",
  "exercise_type": "reps_only",
  "muscles": {
    "Mid Back": 0.40, "Lats": 0.25, "Biceps": 0.20, "Rear Delts": 0.15
  },
  "equipment": ["Bands"],
  "movement_pattern": "Horizontal Pull",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "band_003",
  "name": "Band Bicep Curls",
  "exercise_type": "reps_only",
  "muscles": {
    "Biceps": 0.85, "Forearms": 0.15
  },
  "equipment": ["Bands"],
  "movement_pattern": "Vertical Pull",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "band_004",
  "name": "Band Tricep Pushdowns",
  "exercise_type": "reps_only",
  "muscles": {
    "Triceps": 0.90, "Forearms": 0.10
  },
  "equipment": ["Bands"],
  "movement_pattern": "Vertical Push",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "band_005",
  "name": "Band Face Pulls",
  "exercise_type": "reps_only",
  "muscles": {
    "Rear Delts": 0.40, "Mid Back": 0.30, "Traps": 0.20, "Biceps": 0.10
  },
  "equipment": ["Bands"],
  "movement_pattern": "Horizontal Pull",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "band_006",
  "name": "Band Lateral Walks",
  "exercise_type": "reps_only",
  "muscles": {
    "Abductors": 0.50, "Glutes": 0.40, "Quads": 0.10
  },
  "equipment": ["Bands"],
  "movement_pattern": "Lateral",
  "difficulty": "Beginner",
  "is_compound": false
}
```

### 3.6 New Duration Exercises

```json
{
  "id": "duration_001",
  "name": "Plank",
  "exercise_type": "duration",
  "muscles": {
    "Upper Abs": 0.35, "Lower Abs": 0.30, "Obliques": 0.20,
    "Lower Back": 0.10, "Front Delts": 0.05
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Isometric",
  "difficulty": "Beginner",
  "is_compound": true
},
{
  "id": "duration_002",
  "name": "Side Plank",
  "exercise_type": "duration",
  "muscles": {
    "Obliques": 0.60, "Upper Abs": 0.20, "Lower Abs": 0.10, "Glutes": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Isometric",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "duration_003",
  "name": "Wall Sit",
  "exercise_type": "duration",
  "muscles": {
    "Quads": 0.70, "Glutes": 0.20, "Calves": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Isometric",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "duration_004",
  "name": "Dead Hang",
  "exercise_type": "duration",
  "muscles": {
    "Forearms": 0.50, "Lats": 0.25, "Biceps": 0.15, "Rear Delts": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Isometric",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "duration_005",
  "name": "Glute Bridge Hold",
  "exercise_type": "duration",
  "muscles": {
    "Glutes": 0.60, "Hamstrings": 0.25, "Lower Back": 0.15
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Isometric",
  "difficulty": "Beginner",
  "is_compound": false
},
{
  "id": "duration_006",
  "name": "Hollow Body Hold",
  "exercise_type": "duration",
  "muscles": {
    "Upper Abs": 0.40, "Lower Abs": 0.40, "Obliques": 0.10, "Quads": 0.10
  },
  "equipment": ["Bodyweight"],
  "movement_pattern": "Isometric",
  "difficulty": "Intermediate",
  "is_compound": true
}
```

---

## Phase 4: UI Components

### 4.1 Type-Specific Set Input Components

Create these files in `src/components/molecules/`:

**WeightSetInputs.tsx** - Extract current weight/reps inputs from ExerciseSetEditor
**CardioSetInputs.tsx** - Duration (min) + Distance inputs
**RepsOnlySetInputs.tsx** - Reps input only (for bodyweight + reps_only)
**AssistedSetInputs.tsx** - Assistance weight + Reps inputs
**DurationSetInputs.tsx** - Time input displayed as mm:ss

Each should:
- Accept set data and onChange callback
- Include +/- adjustment buttons
- Include "Complete set" button
- Follow existing styling patterns

### 4.2 Update `ExerciseSetEditor.tsx`

**Add props:**
```typescript
interface ExerciseSetEditorProps {
  // ... existing props ...
  exerciseType: ExerciseType;
  distanceUnit?: 'miles' | 'meters';
}
```

**Add type switching logic:**
```typescript
const renderSetInputs = (set: SetDraft, index: number) => {
  switch (exerciseType) {
    case 'cardio':
      return (
        <CardioSetInputs
          set={set}
          index={index}
          distanceUnit={distanceUnit}
          onDurationChange={handleDurationInput}
          onDistanceChange={handleDistanceInput}
          onAdjustDuration={adjustDuration}
          onAdjustDistance={adjustDistance}
          onComplete={handleCompleteSetPress}
        />
      );
    case 'bodyweight':
    case 'reps_only':
      return (
        <RepsOnlySetInputs
          set={set}
          index={index}
          onRepsChange={handleRepsInput}
          onAdjustReps={adjustReps}
          onComplete={handleCompleteSetPress}
        />
      );
    case 'assisted':
      return (
        <AssistedSetInputs
          set={set}
          index={index}
          onAssistanceChange={handleAssistanceInput}
          onRepsChange={handleRepsInput}
          onAdjustAssistance={adjustAssistance}
          onAdjustReps={adjustReps}
          onComplete={handleCompleteSetPress}
        />
      );
    case 'duration':
      return (
        <DurationSetInputs
          set={set}
          index={index}
          onDurationChange={handleDurationSecondsInput}
          onAdjustDuration={adjustDurationSeconds}
          onComplete={handleCompleteSetPress}
        />
      );
    case 'weight':
    default:
      // Current implementation
      return <WeightSetInputs ... />;
  }
};
```

### 4.3 Update `app/workout-session.tsx`

**Add helper functions:**
```typescript
const getExerciseType = (name: string): ExerciseType => {
  const exercise = exerciseCatalog.find(e => e.name === name);
  return exercise?.exerciseType || 'weight';
};

const getDistanceUnit = (name: string): 'miles' | 'meters' | undefined => {
  const exercise = exerciseCatalog.find(e => e.name === name);
  return exercise?.distanceUnit;
};
```

**Update createDefaultSetLogs:**
```typescript
const createDefaultSetLogs = (exerciseName: string, allWorkouts: any[]): SetLog[] => {
  const exercise = exerciseCatalog.find(e => e.name === exerciseName);
  const exerciseType = exercise?.exerciseType || 'weight';
  
  // Check history first
  const lastSets = getLastCompletedSetsForExercise(exerciseName, allWorkouts);
  if (lastSets && lastSets.length > 0) {
    return lastSets.map(set => ({ ...set, completed: false }));
  }
  
  // Type-appropriate defaults
  switch (exerciseType) {
    case 'cardio':
      return [{ duration: 0, distance: 0, completed: false }];
    case 'bodyweight':
    case 'reps_only':
      return Array.from({ length: 3 }, () => ({ reps: 10, completed: false }));
    case 'assisted':
      return Array.from({ length: 3 }, () => ({ assistanceWeight: 0, reps: 8, completed: false }));
    case 'duration':
      return [{ duration: 30, completed: false }];
    case 'weight':
    default:
      return Array.from({ length: 3 }, () => ({ reps: 8, weight: 0, completed: false }));
  }
};
```

**Pass props to ExerciseSetEditor:**
```typescript
<ExerciseSetEditor
  // ... existing props ...
  exerciseType={getExerciseType(exercise.name)}
  distanceUnit={getDistanceUnit(exercise.name)}
/>
```

### 4.4 Update `FilterBottomSheet.tsx`

**Add imports:**
```typescript
import { EXERCISE_TYPES, EXERCISE_TYPE_LABELS, ExerciseType } from '@/types/exercise';
```

**Add exercise type filter section (after existing filter sections):**
```typescript
{/* Exercise Type Filter */}
<View style={styles.filterSection}>
  <Text variant="bodySemibold" color="primary" style={styles.filterLabel}>
    Exercise Type
  </Text>
  <View style={styles.chipContainer}>
    {EXERCISE_TYPES.map(type => (
      <FilterChip
        key={type}
        label={EXERCISE_TYPE_LABELS[type]}
        selected={filters.exerciseTypes.includes(type)}
        onPress={() => onFiltersChange({
          ...filters,
          exerciseTypes: filters.exerciseTypes.includes(type)
            ? filters.exerciseTypes.filter(t => t !== type)
            : [...filters.exerciseTypes, type]
        })}
      />
    ))}
  </View>
</View>
```

---

## Phase 5: Analytics Updates

### 5.1-5.2 Update `useAnalyticsData.ts`

**Add imports:**
```typescript
import { useUserProfileStore } from '@/store/userProfileStore';
import type { CardioStats } from '@/types/analytics';
```

**Add cardio stats calculation:**
```typescript
const cardioStats = useMemo((): CardioStats => {
  const stats: CardioStats = {
    totalDuration: 0,
    totalDistanceByType: {},
    sessionCount: 0,
  };
  
  const workoutsWithCardio = new Set<string>();
  
  filteredWorkouts.forEach(workout => {
    workout.exercises.forEach((exercise: any) => {
      const exerciseData = exercisesData.find((e: any) => e.name === exercise.name);
      if (exerciseData?.exercise_type !== 'cardio') return;
      
      exercise.sets.forEach((set: any) => {
        if (!set.completed) return;
        workoutsWithCardio.add(workout.id);
        
        if (set.duration) {
          stats.totalDuration += set.duration;
        }
        if (set.distance) {
          stats.totalDistanceByType[exercise.name] = 
            (stats.totalDistanceByType[exercise.name] || 0) + set.distance;
        }
      });
    });
  });
  
  stats.sessionCount = workoutsWithCardio.size;
  return stats;
}, [filteredWorkouts]);
```

**Update volume calculation in tieredVolume:**
```typescript
const tieredVolume = useMemo((): TieredVolumeData => {
  const userWeight = useUserProfileStore.getState().getBodyWeightLbs();
  // ... existing setup ...
  
  filteredWorkouts.forEach((workout) => {
    workout.exercises.forEach((exercise: any) => {
      const exerciseData = exercisesData.find((e: any) => e.name === exercise.name);
      if (!exerciseData) return;
      
      const exerciseType = exerciseData.exercise_type || 'weight';
      const weights = exerciseData.muscles;
      if (!weights || Object.keys(weights).length === 0) return;
      
      // Skip cardio, duration, reps_only from volume
      if (['cardio', 'duration', 'reps_only'].includes(exerciseType)) return;
      
      exercise.sets.forEach((set: any) => {
        if (!set.completed) return;
        
        let setVolume = 0;
        
        if (exerciseType === 'weight') {
          if (set.weight <= 0 || set.reps <= 0) return;
          setVolume = set.weight * set.reps;
        } else if (exerciseType === 'bodyweight') {
          if (!userWeight || set.reps <= 0) return;
          setVolume = userWeight * set.reps;
        } else if (exerciseType === 'assisted') {
          if (!userWeight || set.reps <= 0) return;
          const effectiveWeight = Math.max(0, userWeight - (set.assistanceWeight || 0));
          setVolume = effectiveWeight * set.reps;
        }
        
        if (setVolume <= 0) return;
        
        // ... rest of muscle distribution logic ...
      });
    });
  });
  
  return { high, mid, low };
}, [filteredWorkouts]);
```

**Add cardioStats to return:**
```typescript
return {
  // ... existing returns ...
  cardioStats,
};
```

### 5.3 Create `CardioStatsCard.tsx`

**File:** `src/components/molecules/CardioStatsCard.tsx`

**Features:**
- Display total cardio time (hours:minutes format)
- Time range selector (7-day, month, year, all)
- Distance breakdown by machine type
- Empty state when no cardio data
- Matches existing analytics card styling

### 5.4 Update `app/(tabs)/profile.tsx`

**Add import:**
```typescript
import { CardioStatsCard } from '@/components/molecules/CardioStatsCard';
```

**Add CardioStatsCard after existing cards:**
```typescript
<CardioStatsCard />
```

---

## Phase 6: Premade Content

### 6.1-6.4 New Premade Workouts

Add to `src/data/premadeWorkouts.json`:

```json
{
  "id": "cardio-warmup-upper",
  "name": "Cardio + Upper Body",
  "exercises": [
    { "id": "cardio_001", "name": "Treadmill", "sets": 1 },
    { "id": "exercise_001", "name": "Barbell Bench Press", "sets": 3 },
    { "id": "exercise_008", "name": "Wide Grip Lat Pulldown", "sets": 3 },
    { "id": "exercise_005", "name": "Dumbbell Shoulder Press", "sets": 3 },
    { "id": "exercise_027", "name": "Dumbbell Bicep Curls", "sets": 3 }
  ],
  "metadata": {
    "goal": "general-fitness",
    "experienceLevel": "beginner",
    "equipment": "full-gym",
    "durationMinutes": 50,
    "description": "Start with cardio warmup, then hit upper body.",
    "tags": ["cardio", "upper-body", "balanced"]
  },
  "isPremade": true
},
{
  "id": "legs-cardio-finisher",
  "name": "Legs + Cardio Finisher",
  "exercises": [
    { "id": "exercise_019", "name": "Barbell Squat", "sets": 4 },
    { "id": "exercise_014", "name": "Leg Press", "sets": 3 },
    { "id": "exercise_025", "name": "Lying Leg Curl", "sets": 3 },
    { "id": "exercise_015", "name": "Leg Extensions", "sets": 3 },
    { "id": "cardio_002", "name": "Stationary Bike", "sets": 1 }
  ],
  "metadata": {
    "goal": "build-muscle",
    "experienceLevel": "intermediate",
    "equipment": "full-gym",
    "durationMinutes": 60,
    "description": "Heavy leg work followed by low-impact cardio finisher.",
    "tags": ["legs", "cardio", "hypertrophy"]
  },
  "isPremade": true
},
{
  "id": "cardio-circuit",
  "name": "Cardio Circuit",
  "exercises": [
    { "id": "cardio_001", "name": "Treadmill", "sets": 1 },
    { "id": "cardio_003", "name": "Rowing Machine", "sets": 1 },
    { "id": "cardio_002", "name": "Stationary Bike", "sets": 1 },
    { "id": "cardio_004", "name": "Elliptical", "sets": 1 }
  ],
  "metadata": {
    "goal": "lose-fat",
    "experienceLevel": "beginner",
    "equipment": "full-gym",
    "durationMinutes": 40,
    "description": "Pure cardio workout rotating through machines.",
    "tags": ["cardio", "fat-loss", "endurance"]
  },
  "isPremade": true
},
{
  "id": "bodyweight-basics",
  "name": "Bodyweight Basics",
  "exercises": [
    { "id": "bodyweight_001", "name": "Push-ups", "sets": 3 },
    { "id": "bodyweight_012", "name": "Inverted Rows", "sets": 3 },
    { "id": "bodyweight_008", "name": "Air Squats", "sets": 3 },
    { "id": "bodyweight_009", "name": "Lunges", "sets": 3 },
    { "id": "duration_001", "name": "Plank", "sets": 3 }
  ],
  "metadata": {
    "goal": "general-fitness",
    "experienceLevel": "beginner",
    "equipment": "bodyweight",
    "durationMinutes": 30,
    "description": "Full body workout with no equipment needed.",
    "tags": ["bodyweight", "full-body", "beginner", "home"]
  },
  "isPremade": true
},
{
  "id": "calisthenics-upper",
  "name": "Calisthenics Upper Body",
  "exercises": [
    { "id": "bodyweight_002", "name": "Pull-ups", "sets": 4 },
    { "id": "bodyweight_004", "name": "Dips", "sets": 4 },
    { "id": "bodyweight_001", "name": "Push-ups", "sets": 3 },
    { "id": "bodyweight_012", "name": "Inverted Rows", "sets": 3 },
    { "id": "duration_004", "name": "Dead Hang", "sets": 2 }
  ],
  "metadata": {
    "goal": "build-muscle",
    "experienceLevel": "intermediate",
    "equipment": "bodyweight",
    "durationMinutes": 40,
    "description": "Challenging upper body calisthenics routine.",
    "tags": ["calisthenics", "upper-body", "bodyweight"]
  },
  "isPremade": true
},
{
  "id": "core-crusher",
  "name": "Core Crusher",
  "exercises": [
    { "id": "duration_001", "name": "Plank", "sets": 3 },
    { "id": "duration_002", "name": "Side Plank", "sets": 2 },
    { "id": "bodyweight_005", "name": "Crunches", "sets": 3 },
    { "id": "bodyweight_007", "name": "Leg Raises", "sets": 3 },
    { "id": "duration_006", "name": "Hollow Body Hold", "sets": 2 },
    { "id": "bodyweight_010", "name": "Mountain Climbers", "sets": 3 }
  ],
  "metadata": {
    "goal": "build-muscle",
    "experienceLevel": "intermediate",
    "equipment": "bodyweight",
    "durationMinutes": 25,
    "description": "Intense core-focused workout.",
    "tags": ["core", "abs", "bodyweight"]
  },
  "isPremade": true
},
{
  "id": "assisted-beginner",
  "name": "Assisted Pull & Push",
  "exercises": [
    { "id": "assisted_001", "name": "Assisted Pull-ups", "sets": 3 },
    { "id": "assisted_002", "name": "Assisted Dips", "sets": 3 },
    { "id": "exercise_002", "name": "Chest Press Machine", "sets": 3 },
    { "id": "exercise_010", "name": "Seated Row Machine", "sets": 3 },
    { "id": "exercise_022", "name": "Seated Shoulder Press Machine", "sets": 3 }
  ],
  "metadata": {
    "goal": "build-muscle",
    "experienceLevel": "beginner",
    "equipment": "full-gym",
    "durationMinutes": 40,
    "description": "Build strength with machine assistance.",
    "tags": ["assisted", "beginner", "machines"]
  },
  "isPremade": true
},
{
  "id": "hiit-circuit",
  "name": "HIIT Circuit",
  "exercises": [
    { "id": "cardio_008", "name": "Sprint Intervals", "sets": 3 },
    { "id": "bodyweight_011", "name": "Burpees", "sets": 3 },
    { "id": "bodyweight_010", "name": "Mountain Climbers", "sets": 3 },
    { "id": "bodyweight_008", "name": "Air Squats", "sets": 3 },
    { "id": "duration_001", "name": "Plank", "sets": 2 }
  ],
  "metadata": {
    "goal": "lose-fat",
    "experienceLevel": "intermediate",
    "equipment": "bodyweight",
    "durationMinutes": 25,
    "description": "High-intensity interval training for maximum calorie burn.",
    "tags": ["hiit", "cardio", "fat-loss", "bodyweight"]
  },
  "isPremade": true
}
```

---

## Notes & Issues

(Add implementation notes here as work progresses)

---

## Completed Items Log

(Move completed items here with dates)

