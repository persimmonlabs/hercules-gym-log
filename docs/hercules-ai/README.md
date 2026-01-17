# Hercules AI — Implementation Plan (Living Doc)

## Goals
- Provide a premium-only AI chatbot to enhance workouts.
- Explain exercises, workout stats, and recommend improvements.
- Create/edit workouts, plans, schedules, and past sessions via natural language.
- Navigate Hercules app features and data.

## Guardrails (Non-Negotiable)
- Hercules + fitness only. No non-fitness topics.
- No personal information requests (name, age, email, etc.).
- Never expose or access other users’ data.
- All mutations require explicit user confirmation.
- Always ask for missing workout context rather than guessing.

## Key Decisions
- Entry point: Dashboard button → full-screen chat (no tab changes).
- Memory: save last ~50 messages per session.
- Premium gating: rely on Supabase `profiles.is_pro` and `usePremiumStatus`.
- Provider: OpenRouter (server-side only).
- Usage limits: weekly caps to protect $1.50/user budget.
- Disclaimer: persistent on screen, not necessarily in every reply.

## Core Data Sources
- Supabase tables: `workout_sessions`, `workout_templates`, `plans`, `plan_workouts`,
  `schedules`, `custom_exercises`, `profiles`.
- Local JSON: `src/data/exercises.json`, `src/data/premadePrograms.json`,
  `src/data/premadeWorkouts.json`, `src/data/hierarchy.json`.
- Internal KB docs: `docs/hercules-ai/` + future `docs/ai/` docs.

## Architecture Overview
1. **Client Chat UI** → sends message to backend AI gateway.
2. **AI Gateway** → enforces premium + limits, builds context, retrieves KB.
3. **LLM (OpenRouter)** → generates answer or proposes actions.
4. **Action Workflow** → user confirmation → execute via Supabase.

## Phase Checklist
- [ ] Data model + RLS
- [ ] AI orchestration + safety policy
- [ ] Knowledge base pipeline
- [ ] Backend endpoints + usage limits
- [ ] Client UI
- [ ] Agentic actions + validation
- [ ] Analytics + testing

## Documents Index
- data-model.md
- orchestration.md
- knowledge-base.md
- actions.md
- testing.md
