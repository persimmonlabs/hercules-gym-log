# Persistence Fixes - Comprehensive Documentation

## Overview
This document details the persistence issues found and fixed in the Hercules app, ensuring data properly persists across sessions.

---

## 🔴 CRITICAL FIX: Workout Source Tracking

### Problem
Workouts added from the premade library were not consistently hidden from the library across app sessions. The `source` field (`'premade' | 'custom' | 'library' | 'recommended'`) was stored in memory but **not persisted to Supabase**.

### Root Cause
1. The `workout_templates` table lacked a `source` column
2. `createWorkoutTemplate()` didn't save the source field
3. `fetchWorkoutTemplates()` didn't retrieve the source field
4. `hydratePlans()` didn't restore the source field from database

### Impact
- Workouts saved from the library would reappear in the library after app restart
- Users would see duplicate workouts they had already saved
- The filter logic in `browse-programs.tsx` relied on the source field being present

### Files Modified
1. **`add_source_to_workout_templates.sql`** (NEW)
   - Adds `source` column to `workout_templates` table
   - Sets default value for existing rows to `'custom'`

2. **`src/lib/supabaseQueries.ts`**
   - Updated `WorkoutTemplateDB` interface to include `source` field
   - Modified `fetchWorkoutTemplates()` to retrieve `source` from database
   - Modified `createWorkoutTemplate()` to accept and save `source` field

3. **`src/store/plansStore.ts`**
   - Updated `hydratePlans()` to restore `source` field from database
   - Updated `addPlan()` to pass `source` field to `createWorkoutTemplate()`

### Filter Logic (Reference)
The library filtering logic in `app/(tabs)/browse-programs.tsx` (lines 88-95):
```typescript
const addedWorkoutNames = new Set(
  plans
    .filter(plan => plan.source === 'premade' || plan.source === 'library' || plan.source === 'recommended')
    .map(plan => plan.name.trim().toLowerCase())
);
filtered = filtered.filter(w => !addedWorkoutNames.has(w.name.trim().toLowerCase()));
```

This filter now works correctly because the `source` field persists across sessions.

---

## 🟡 ADDITIONAL FIXES: Missing Database Columns

### 1. Rotation State Persistence

**Problem:** The `rotation_state` column was missing from the `plans` table, but the code was trying to read/write it.

**Files:**
- **`add_rotation_state_to_plans.sql`** (NEW)
  - Adds `rotation_state` jsonb column to `plans` table
  - Stores: `{ workoutSequence: string[], currentIndex: number, lastAdvancedAt: number }`

**Impact:** Program rotation state (which workout is next in the rotation) now persists across sessions.

---

### 2. Premium & Haptics Settings

**Problem:** The `is_pro` and `haptics_enabled` columns were missing from the `profiles` table, but `settingsStore.ts` was trying to sync them.

**Files:**
- **`add_missing_profile_columns.sql`** (NEW)
  - Adds `is_pro` boolean column (default: false)
  - Adds `haptics_enabled` boolean column (default: true)

**Impact:** Premium status and haptic feedback preferences now persist across sessions and devices.

---

## 📋 Migration Instructions

### Step 1: Run SQL Migrations (In Order)

Execute these SQL files in your Supabase SQL Editor:

1. **`add_source_to_workout_templates.sql`** (CRITICAL)
   ```sql
   -- Adds source column to workout_templates
   -- Sets existing rows to 'custom'
   ```

2. **`add_rotation_state_to_plans.sql`**
   ```sql
   -- Adds rotation_state column to plans
   ```

3. **`add_missing_profile_columns.sql`**
   ```sql
   -- Adds is_pro and haptics_enabled to profiles
   ```

### Step 2: Deploy Code Changes

The following files have been updated and need to be deployed:

- `src/lib/supabaseQueries.ts`
- `src/store/plansStore.ts`

### Step 3: Test the Fix

See the **Testing Guide** section below.

---

## 🧪 Testing Guide

### Test 1: Workout Source Persistence (CRITICAL)

**Objective:** Verify workouts saved from the library stay hidden after app restart.

**Steps:**
1. Open the app and navigate to **Plans → Browse Workouts**
2. Select a premade workout (e.g., "Push Day")
3. Save it to "My Workouts"
4. Verify it disappears from the Browse Workouts library
5. **Close and restart the app**
6. Navigate back to **Plans → Browse Workouts**
7. ✅ **PASS:** The saved workout should NOT reappear in the library
8. ❌ **FAIL:** If the workout reappears, the migration wasn't applied

**Expected Behavior:**
- Saved workouts remain hidden from the library across sessions
- The workout appears in "My Workouts" with source metadata

---

### Test 2: Rotation State Persistence

**Objective:** Verify program rotation state persists across sessions.

**Steps:**
1. Create or clone a program with rotation scheduling
2. Set it as the active program
3. Advance the rotation to the next workout
4. Note which workout is currently active
5. **Close and restart the app**
6. Check the active workout
7. ✅ **PASS:** The rotation index should be preserved
8. ❌ **FAIL:** If rotation resets to the first workout, check migration

---

### Test 3: Settings Persistence

**Objective:** Verify premium status and haptics persist across sessions.

**Steps:**
1. Go to **Profile → Settings**
2. Toggle haptic feedback setting
3. Note the current state
4. **Close and restart the app**
5. Check the haptic feedback setting
6. ✅ **PASS:** Setting should be preserved
7. ❌ **FAIL:** If setting resets, check migration

---

## 🔍 Verification Queries

Run these in Supabase SQL Editor to verify migrations:

### Check workout_templates has source column:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'workout_templates' AND column_name = 'source';
```

### Check plans has rotation_state column:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'plans' AND column_name = 'rotation_state';
```

### Check profiles has new columns:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('is_pro', 'haptics_enabled');
```

### Verify existing workouts have source set:
```sql
SELECT id, name, source
FROM workout_templates
LIMIT 10;
```

---

## 🛡️ Prevention Measures

To prevent similar persistence issues in the future:

### 1. **Schema-First Development**
- Always add database columns BEFORE using them in code
- Document required columns in schema files
- Use TypeScript interfaces that match database schema

### 2. **Persistence Checklist**
When adding new features that store data:
- [ ] Is the field defined in the database schema?
- [ ] Is the field included in INSERT queries?
- [ ] Is the field included in SELECT queries?
- [ ] Is the field included in UPDATE queries?
- [ ] Is the field restored during hydration?
- [ ] Does the TypeScript interface match the database?

### 3. **Testing Protocol**
For any data that should persist:
- [ ] Test with app restart (close and reopen)
- [ ] Test with logout/login
- [ ] Test with multiple devices (if applicable)
- [ ] Verify data in Supabase dashboard

### 4. **Code Review Focus Areas**
When reviewing PRs that add new data fields:
- Check if database migrations are included
- Verify all CRUD operations handle the new field
- Ensure hydration logic includes the new field
- Confirm TypeScript types are updated

---

## 📊 Impact Summary

### Before Fix
- ❌ Workouts saved from library reappeared after restart
- ❌ Rotation state reset on app restart
- ❌ Premium status didn't sync across devices
- ❌ Haptic preferences reset on app restart

### After Fix
- ✅ Workouts stay hidden from library permanently
- ✅ Rotation state persists across sessions
- ✅ Premium status syncs to database
- ✅ Haptic preferences persist across sessions

---

## 🔗 Related Files

### Database Schema
- `supabase_schema.sql` - Base schema
- `update_profiles_units.sql` - Unit preferences
- `add_source_to_workout_templates.sql` - **NEW** (Critical fix)
- `add_rotation_state_to_plans.sql` - **NEW**
- `add_missing_profile_columns.sql` - **NEW**

### Store Files
- `src/store/plansStore.ts` - Workout templates management
- `src/store/programsStore.ts` - Programs and rotation management
- `src/store/settingsStore.ts` - User settings and preferences

### Query Files
- `src/lib/supabaseQueries.ts` - All database operations

### UI Files (Filter Logic)
- `app/(tabs)/browse-programs.tsx` - Library filtering
- `app/create-plan.tsx` - Premade workout detection

---

## 📝 Notes

1. **Backward Compatibility:** All migrations use `IF NOT EXISTS` to safely run on existing databases
2. **Default Values:** Existing rows get sensible defaults (e.g., `source = 'custom'`)
3. **No Data Loss:** All migrations are additive (no columns dropped)
4. **Idempotent:** Migrations can be run multiple times safely

---

## 🆘 Troubleshooting

### Issue: Workouts still reappear after migration

**Diagnosis:**
```sql
-- Check if source column exists and has data
SELECT id, name, source FROM workout_templates LIMIT 5;
```

**Solution:**
- If column is NULL, run the migration again
- If column doesn't exist, check Supabase connection
- Verify RLS policies allow reading the source column

### Issue: TypeScript errors after update

**Diagnosis:**
- Check if `WorkoutTemplateDB` interface includes `source` field
- Verify `createWorkoutTemplate` accepts `source` parameter

**Solution:**
- Restart TypeScript server in your IDE
- Clear build cache: `rm -rf .expo`
- Rebuild: `npx expo start --clear`

---

## ✅ Completion Checklist

- [x] Identified root cause of persistence issue
- [x] Created database migration for `source` column
- [x] Updated TypeScript interfaces
- [x] Modified Supabase queries to handle `source`
- [x] Updated store hydration logic
- [x] Found and fixed additional persistence issues
- [x] Created comprehensive documentation
- [ ] **Run SQL migrations in Supabase** (USER ACTION REQUIRED)
- [ ] **Test the fix** (USER ACTION REQUIRED)
- [ ] **Deploy code changes** (USER ACTION REQUIRED)

---

**Last Updated:** January 12, 2026
**Author:** Cascade AI
**Priority:** CRITICAL (affects core user experience)
