# Hercules AI — Orchestration & Safety

## System Behavior
- Fitness-only, Hercules-only assistance.
- Ask for missing info (goals, experience, time, equipment, units).
- No personal data collection.
- No contradictions with app data.
- Always provide actionable + concise guidance.

## Safety & Content Policy
- Allowed: exercises, workouts, plans, schedules, stats, app guidance.
- Disallowed: personal info requests, non-fitness topics, offensive content.
- Must refuse and redirect when out of scope.

## Context Builder (Per Request)
- Workout sessions history (recent + aggregates).
- My Workouts templates.
- My Plans + schedules.
- Custom exercises.
- User settings + AI profile.
- Premade workouts/plans + muscle hierarchy.
- Knowledge base chunks.

## Action Workflow
1. Model proposes action with payload.
2. App shows confirmation preview.
3. On confirm → server executes via Supabase.

## Usage Limits
- Weekly message/token caps enforced server-side.
- Client displays remaining budget.

## Streaming UX
- Show “thinking / steps” placeholder while response streams.
