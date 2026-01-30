# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Hercules** is a fitness tracking mobile app built with React Native (Expo) and TypeScript. The app features workout planning, session tracking, analytics, and an AI-powered workout assistant called **Hercules AI**.

### Key Technologies
- **Frontend**: React Native 0.81.5, Expo ~54, Expo Router (file-based routing)
- **State Management**: Zustand stores (`frontend/src/store/`)
- **Database**: Supabase (PostgreSQL with RLS)
- **Backend**: Supabase Edge Functions (Deno/TypeScript) for Hercules AI
- **UI Libraries**: Tamagui, Victory Native (charts), React Native Reanimated
- **Path Aliases**: `@/*` resolves to `frontend/src/*` (see `frontend/tsconfig.json`)

### Project Structure
```
Hercules/
├── frontend/               # React Native Expo app
│   ├── app/               # Expo Router screens (file-based routing)
│   │   ├── (tabs)/        # Tab navigation screens
│   │   ├── auth/          # Authentication flows
│   │   ├── modals/        # Modal screens
│   │   └── *.tsx          # Other route screens
│   ├── src/
│   │   ├── components/    # UI components (atomic design: atoms, molecules, organisms, templates)
│   │   ├── constants/     # Theme, exercises, navigation, animations
│   │   ├── data/          # JSON data (exercises.json, premadePrograms.json, hierarchy.json)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Supabase client and queries
│   │   ├── services/      # API services (herculesAIService, feedbackService)
│   │   ├── store/         # Zustand state stores
│   │   ├── styles/        # Global styles
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── scripts/           # Build and reset scripts
├── supabase/              # Backend
│   ├── functions/         # Edge Functions (Deno)
│   │   └── hercules-ai/   # AI chat endpoint and logic
│   └── *.sql              # Database migrations and schemas
├── docs/                  # Documentation
│   ├── hercules-ai/       # AI implementation docs
│   └── *.md               # Feature documentation
└── scripts/               # Utility scripts
    └── ingest-hercules-ai-kb.js  # Knowledge base ingestion for AI

```

## Common Development Commands

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Expo development server
npm start
# or
npx expo start

# Run on specific platforms
npm run android          # Android emulator
npm run ios              # iOS simulator
npm run web              # Web browser

# Lint
npm run lint

# Reset project (moves starter code to app-example/)
npm run reset-project
```

### Supabase Edge Functions (Backend)
```bash
# Deploy Hercules AI function
npx supabase functions deploy hercules-ai

# Run function locally
npx supabase functions serve hercules-ai

# View function logs
npx supabase functions logs hercules-ai
```

### Database Management
```bash
# Run SQL migrations (from frontend/ directory)
# Execute .sql files in Supabase Dashboard or via CLI:
npx supabase db push

# Example migrations available:
# - add_source_to_workout_templates.sql
# - add_rotation_state_to_plans.sql
# - add_missing_profile_columns.sql
# - custom_exercises_migration.sql
```

### AI Knowledge Base Ingestion
```bash
# Ingest markdown docs from docs/hercules-ai/ into Supabase
node scripts/ingest-hercules-ai-kb.js
```

## Core Architecture Concepts

### Terminology (CRITICAL - Read `frontend/src/TERMINOLOGY.md`)
The codebase has **legacy naming inconsistencies**. Always use these definitions:

- **Exercise**: Individual movement (e.g., Bench Press, Squat)
- **Workout**: Collection of exercises (e.g., Push Day, Pull Day)
- **Plan**: Collection of workouts (e.g., Push/Pull/Legs split)
- **Program**: Legacy term for Plan (being phased out)

**Hierarchy**: Plan → Workouts → Exercises

**File Naming Issues**:
- `plansStore.ts` actually contains **Workouts** (legacy name)
- `workoutsStore.ts` correctly re-exports from plansStore
- `programsStore.ts` contains **Plans** (collections of workouts)
- **For new code**: Import from `workoutsStore.ts` and use `Workout` type
- **Type aliases exist for backward compatibility**

### State Management (Zustand)
Key stores in `frontend/src/store/`:
- `plansStore.ts` / `workoutsStore.ts`: User's workout templates (collections of exercises)
- `programsStore.ts`: User's plans (collections of workouts) and schedules
- `activeScheduleStore.ts`: Currently active workout schedule and rotation state
- `sessionStore.ts`: Live workout session tracking
- `workoutSessionsStore.ts`: Historical workout sessions
- `customExerciseStore.ts`: User-created custom exercises
- `settingsStore.ts`: User preferences (theme, units, haptics)
- `userProfileStore.ts`: User profile data
- `notificationStore.ts`: App notifications

**Pattern**: Each store uses Zustand with persistence (AsyncStorage) and hydration from Supabase.

### Data Flow
1. **Supabase** (source of truth) ← RLS policies enforce data isolation
2. **Zustand stores** (client-side state) ← hydrated on app load
3. **React components** ← subscribe to stores via hooks

**Mutations**: Component → Store action → Supabase query → Update store state

### Supabase Integration
- **Client**: `frontend/src/lib/supabaseClient.ts`
- **Queries**: `frontend/src/lib/supabaseQueries.ts` (32KB file with all database operations)
- **RLS**: Row-Level Security policies enforce `user_id` isolation
- **Tables**: `workout_templates`, `plans`, `plan_workouts`, `schedules`, `workout_sessions`, `custom_exercises`, `profiles`, `ai_kb_docs`, `ai_chat_sessions`, `ai_messages`, `ai_usage_tracking`

### Hercules AI Architecture
Located in `supabase/functions/hercules-ai/`:
- **Entry**: `index.ts` - Main Edge Function handler
- **LLM Provider**: OpenRouter API (via `openrouter.ts`)
- **Context**: `context.ts` - Builds user context from workout data
- **Knowledge Base**: `kb.ts` - Retrieves relevant docs from `ai_kb_docs` table
- **Actions**: `actions/` - Agentic workflow for workout CRUD operations
- **Prompts**: `prompts.ts` - System prompts and instructions
- **Stats**: `stats.ts` - User workout statistics for AI context
- **Usage Tracking**: `usage.ts` - Token usage and rate limiting

**Flow**: Client → Edge Function → Auth check → Premium check → Build context → LLM call → Response/Actions

**Testing**: See `HERCULES_AI_TESTING_GUIDE.md` for comprehensive test prompts

### File-Based Routing (Expo Router)
- `frontend/app/` contains all screens
- `(tabs)/` directory → tab navigation
- `_layout.tsx` files → nested layouts
- `[param].tsx` → dynamic routes
- Example: `app/(tabs)/index.tsx` → main dashboard screen

### Path Aliases
TypeScript path aliases (defined in `frontend/tsconfig.json`):
- `@/` → `frontend/src/`
- `@/components/` → `frontend/src/components/`
- `@/store/` → `frontend/src/store/`
- `@/hooks/` → `frontend/src/hooks/`
- `@/constants/` → `frontend/src/constants/`
- `@/utils/` → `frontend/src/utils/`

Non-`@` aliases also work: `components/*`, `store/*`, etc.

## Key Data Files

### Exercises Database
- **Location**: `frontend/src/data/exercises.json` (144KB)
- **Structure**: Comprehensive exercise catalog with:
  - Muscle groups, equipment, mechanics, force types
  - Instructions, tips, common mistakes
  - Used by Hercules AI and workout creation flows

### Exercise Hierarchy
- **Location**: `frontend/src/data/hierarchy.json`
- **Purpose**: Muscle group categorization and relationships

### Premade Content
- `frontend/src/data/premadePrograms.json` (115KB): Template workout plans
- `frontend/src/data/premadeWorkouts.json` (34KB): Template workouts

## Testing and Quality Assurance

### Hercules AI Testing
See `HERCULES_AI_TESTING_GUIDE.md` for:
- Basic workout creation prompts
- Program & schedule creation tests
- Edge cases and boundary testing
- Error handling scenarios
- Success metrics and bug tracking templates

### General Testing Approach
- No automated test framework is currently configured
- Manual testing via Expo Go or emulator/simulator
- Use Expo DevTools for debugging
- Check Supabase logs for backend issues

## Database Schema Notes

### Critical Persistence Fixes
See `frontend/PERSISTENCE_FIXES_README.md` for context on:
- `workout_templates.source` field (distinguishes custom vs. premade)
- `plans.rotation_state` field (tracks current workout in schedule)
- `profiles.is_pro`, `profiles.haptics_enabled` fields

**Always ensure these fields are persisted** when making changes to related features.

### Migration Order
When adding new columns or tables:
1. Create `.sql` file in `frontend/` or `supabase/`
2. Run migration via Supabase Dashboard SQL Editor or CLI
3. Update TypeScript types in `frontend/src/types/`
4. Update Zustand stores to handle new fields
5. Update `supabaseQueries.ts` for CRUD operations

## Environment Variables

### Frontend (`.env` in `frontend/`)
```
EXPO_PUBLIC_SUPABASE_URL=https://rzhkagmwhtsvkbjnecfm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Backend/Scripts (`.env` in root)
```
HERCULES_SUPABASE_URL=<url>
HERCULES_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_URL=<url>  # Fallback
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # Fallback
```

## Building and Deployment

### EAS Build (Expo Application Services)
```bash
cd frontend

# Development build
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview build (APK for testing)
eas build --profile preview --platform android

# Production build
eas build --profile production --platform android
eas build --profile production --platform ios
```

**Build profiles** defined in `frontend/eas.json`

### Deployment
- **Frontend**: Expo OTA updates via EAS Update
- **Backend**: Supabase Edge Functions deployed via Supabase CLI

## Development Tips

### When Adding New Features
1. Check `frontend/src/TERMINOLOGY.md` for correct naming
2. Create types in `frontend/src/types/`
3. Add database queries to `frontend/src/lib/supabaseQueries.ts`
4. Create Zustand store if needed in `frontend/src/store/`
5. Build UI components following atomic design structure
6. Use path aliases (`@/components`, `@/store`) for imports

### When Modifying Hercules AI
1. Update system prompts in `supabase/functions/hercules-ai/prompts.ts`
2. Add knowledge base docs to `docs/hercules-ai/*.md`
3. Run `node scripts/ingest-hercules-ai-kb.js` to update KB
4. Test with prompts from `HERCULES_AI_TESTING_GUIDE.md`
5. Deploy function: `npx supabase functions deploy hercules-ai`

### When Debugging
- Frontend logs: Expo DevTools console
- Backend logs: `npx supabase functions logs hercules-ai`
- Database queries: Supabase Dashboard → Table Editor or SQL Editor
- Network requests: React Native Debugger or Flipper

### Common Patterns
- **Haptic feedback**: Use `useHaptics()` hook from `frontend/src/hooks/`
- **Navigation**: Use Expo Router's `useRouter()` and `router.push()`
- **Theme**: Access via `useColorScheme()` and constants from `@/constants/theme`
- **Animations**: Use Reanimated 2 patterns from `@/constants/animations`

## Important Files to Reference

### Must-Read Documentation
- `frontend/src/TERMINOLOGY.md` - Critical for understanding data model
- `HERCULES_AI_TESTING_GUIDE.md` - AI feature testing
- `frontend/PERSISTENCE_FIXES_README.md` - Database persistence patterns
- `docs/hercules-ai/README.md` - AI architecture overview
- `docs/hercules-ai/data-model.md` - AI data structures

### Key Implementation Files
- `frontend/src/lib/supabaseQueries.ts` - All database operations
- `frontend/src/store/programsStore.ts` - Plan/workout management
- `frontend/app/hercules-ai.tsx` - AI chat UI
- `supabase/functions/hercules-ai/index.ts` - AI backend entry point
- `frontend/src/data/exercises.json` - Exercise database

## AI Knowledge Base

The Hercules AI system uses a knowledge base stored in Supabase:
- **Docs Location**: `docs/hercules-ai/*.md`
- **Ingestion Script**: `scripts/ingest-hercules-ai-kb.js`
- **Database Table**: `ai_kb_docs` (chunked markdown content)
- **Retrieval**: Semantic search via embeddings (if enabled) or keyword matching

**To update AI knowledge**: Add/edit markdown files in `docs/hercules-ai/`, then run ingestion script.
