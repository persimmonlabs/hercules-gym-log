# Hercules App - Terminology Guide

This document clarifies the terminology used throughout the codebase.

## Core Concepts

| Term | Definition | Example |
|------|------------|---------|
| **Exercise** | An individual movement | Bench Press, Squat, Deadlift |
| **Workout** | A collection of exercises | Push Day, Pull Day, Leg Day |
| **Plan** | A collection of workouts | PPL (Push/Pull/Legs), Bro Split, Upper/Lower |
| **Program** | Legacy term for Plan | Same as Plan |

## Hierarchy

```
Plan (e.g., "Push Pull Legs")
├── Workout: Push Day
│   ├── Exercise: Bench Press
│   ├── Exercise: Overhead Press
│   └── Exercise: Tricep Pushdown
├── Workout: Pull Day
│   ├── Exercise: Deadlift
│   ├── Exercise: Barbell Row
│   └── Exercise: Bicep Curl
└── Workout: Leg Day
    ├── Exercise: Squat
    ├── Exercise: Leg Press
    └── Exercise: Calf Raise
```

## File Naming (Current State)

Due to legacy naming, some files use "Plan" when they mean "Workout":

### Stores
| File | Contains | Correct Term |
|------|----------|--------------|
| `plansStore.ts` | User's workouts (collections of exercises) | Should be `workoutsStore` |
| `workoutsStore.ts` | Re-exports from plansStore with correct names | ✓ Correct |
| `programsStore.ts` | User's plans (collections of workouts) | Could be `plansStore` |

### Routes
| Route | Purpose | Correct Term |
|-------|---------|--------------|
| `create-workout` | Create a workout (add exercises) | ✓ Correct |
| `create-plan` | Legacy route for create-workout | Deprecated |
| `create-program` | Create a plan (add workouts) | Could be `create-plan` |

### Types
| Type | Definition | File |
|------|------------|------|
| `Plan` (in plansStore) | A Workout | Legacy - use `Workout` alias |
| `Workout` | Alias for Plan in plansStore | ✓ Correct |
| `PremadePlan` | A premade plan template | `premadePlan.ts` |
| `UserPlan` | User's saved plan | `premadePlan.ts` |
| `PlanWorkout` | A workout within a plan | `premadePlan.ts` |
| `PremadeWorkout` | A standalone premade workout | `premadePlan.ts` |

## Best Practices for New Code

1. **Use correct terminology** in new files and components
2. **Import from `workoutsStore.ts`** for workout-related functionality
3. **Use `Workout` type** instead of `Plan` when referring to collections of exercises
4. **Use `Plan` type** when referring to collections of workouts (from `premadePlan.ts`)
5. **Add documentation** to clarify terminology in ambiguous files

## Legacy Aliases

For backward compatibility, these aliases exist:

```typescript
// In plansStore.ts
export type Workout = Plan;  // Plan is actually a Workout
export const useWorkoutsStore = usePlansStore;

// In premadePlan.ts
export type ProgramWorkout = PlanWorkout;
export type ProgramMetadata = PlanMetadata;
export type PremadeProgram = PremadePlan;
export type UserProgram = UserPlan;
```
