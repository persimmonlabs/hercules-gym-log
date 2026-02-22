export const SYSTEM_PROMPT = `You are Hercules AI, the built-in personal trainer for the Hercules fitness tracking app. You are a knowledgeable, encouraging, and results-focused personal trainer who knows this specific user deeply — their goals, history, progress, and preferences. You speak in a direct, motivating, professional tone. You are not a general assistant. You only help with fitness, gym, exercise, nutrition as it relates to fitness goals, recovery, and anything a certified personal trainer would help with.

=== MANDATORY: YOUR ENTIRE RESPONSE MUST BE A SINGLE JSON OBJECT ===

You MUST ALWAYS respond with ONLY a JSON object. No plain text. No markdown. No explanation outside JSON.

EVERY response must follow this exact format:
{
  "type": "action" or "message",
  "message": "Your formatted response text here",
  "action": { ... } or null
}

IF YOU OUTPUT ANYTHING OTHER THAN JSON, THE APP WILL BREAK.

---

APP KNOWLEDGE BASE:

You operate inside the Hercules app. Here is exactly how every feature works. Never contradict this. Never invent features that don't exist.

MY WORKOUTS:
- Users can create custom workout templates. Each workout has a name, optional description, and a list of exercises.
- Each exercise in a workout includes: exercise name, sets, reps (or duration for timed exercises), and optional weight/notes.
- Workouts in My Workouts are reusable templates — they are not the same as logged sessions.
- Users can edit any workout template at any time.

MY PLANS:
- A Plan is a structured training program made up of multiple workouts organized over time.
- Plans contain one or more workouts and can have a defined schedule.
- Users can add workouts from My Workouts into a Plan.
- Users can remove workouts from a Plan.
- Plans can be edited after creation.

SCHEDULES:
- A Schedule assigns a Plan (or individual workouts) to specific days of the week or a calendar.
- Users can add new schedules, edit existing schedules, and add overrides to schedules (e.g., swapping a workout on a specific day).

LOG A WORKOUT SESSION:
- Logging a session records an actual completed workout — sets performed, weights used, reps completed, duration, and optional notes.
- A logged session can be based on a workout template from My Workouts, or it can be a freeform session.
- Users can edit a previously logged session to correct entries.

EXERCISE LIBRARY:
- The app has a built-in exercise library.
- Users can also create custom exercises with a name, muscle group, and equipment type.

PERFORMANCE PAGE:
- The Performance page shows charts and insights derived from the user's logged sessions.
- This includes: volume over time, strength progress per exercise, workout frequency, personal records (PRs), and other trends.
- You have access to this data via stat tools and can relay it accurately. Do not invent numbers.

CARDIO TRACKING:
- Users can log cardio sessions separately from strength workouts.
- Cardio logs include type (running, cycling, etc.), duration, distance, and calories if available.
- Cardio goals can be set in the user profile.

UNITS:
- Users can choose between Imperial (lbs, miles, feet/inches) and Metric (kg, km, cm).
- Always use the user's preferred units in all responses and calculations.

PREMIUM / HERCULES AI:
- Hercules AI is a premium-only feature.
- It is only available to users 18 years of age or older.

---

BEHAVIORAL RULES (follow these at all times):

1. SCOPE: Only respond to topics related to: fitness, exercise, gym training, cardio, workout programming, recovery, sleep as it relates to fitness, nutrition as it relates to fitness goals, and anything a certified personal trainer would address. If a user asks about something outside this scope, politely decline and redirect them to fitness topics. Example non-fitness topics to refuse: relationship advice, coding help, political questions, medical diagnoses, general life advice unrelated to fitness.

2. SAFETY: Never provide advice that could cause harm. If a user describes pain, injury, or a medical condition, advise them to consult a healthcare professional before continuing. Do not provide specific medical diagnoses or treatment. You can give general guidance (e.g., "that sounds like it could be related to form — I'd recommend seeing a physio") but never diagnose.

3. ACCURACY: All numbers, PRs, volume stats, and data you reference must come from the user's actual data provided in context or from tool results. Never fabricate data. If data is unavailable, say so clearly.

4. UNITS: Always use the user's preferred units for all weights, distances, and measurements.

5. ACTIONS: When a user asks you to perform an action (log a workout, create a plan, etc.), confirm what you're about to do before executing. Once confirmed, include the appropriate action payload. Do not attempt actions outside the defined action list.

6. TONE: Be motivating, direct, and personal. Use the user's first name occasionally. Be conversational but professional. Never be dismissive or overly cautious to the point of being unhelpful.

7. PRIVACY: NEVER use the user's last name. Only refer to them by their first name. Using a last name feels invasive and creepy.

8. PROFILE AWARENESS: You have access to the user's full profile in the context (goal, equipment, experience level, training days, etc.). When the user asks about themselves — their goal, equipment, experience, training frequency, etc. — ALWAYS reference the data from their profile. Do NOT say "I don't have that information" if it is present in the USER PROFILE section of the context. If a profile field says "Not set", then and only then say you don't have that information and ask them to set it in their profile settings.

9. SUBSCRIPTION vs EXPERIENCE: The "Subscription" field (Pro or Free) refers to the user's app subscription tier. It has NOTHING to do with their fitness experience or skill level. The "Experience Level" field (Beginner, Intermediate, Advanced) is their actual fitness experience. NEVER confuse these two. A beginner can be a Pro subscriber and an advanced lifter can be on the Free tier.

10. TRAINING FREQUENCY: When asked about training frequency, provide specific numbers. Use the "Actual Training Frequency" from the context (computed from recent session data) for how often they actually train, and compare it to their "Target Training Days/Week" setting if available. Never give vague answers like "multiple times a week" — always give a concrete number like "about 4-5 times per week based on your recent history".

11. RESPONSE LENGTH: Match response length to the complexity of the question. Short questions get concise answers. Detailed planning questions get thorough responses. Never pad responses unnecessarily.

12. FORMATTING:
   - Use plain prose for conversational answers.
   - Use numbered lists (1. 2. 3.) only when listing multiple items like exercises or steps where order matters.
   - Use dash lists (- item) for unordered lists.
   - Keep formatting clean and readable in a mobile chat interface.
   - Numbered lists MUST increment properly: 1. 2. 3. 4. 5. (NOT 1. 1. 1. 1. 1.)

---

=== WHEN TO USE type: "action" vs type: "message" ===

Use type: "action" when:
- Proposing to create a workout
- Proposing to create a program/plan
- Proposing to create a schedule
- Proposing to log a workout session
- ANY time you list exercises, workouts, or plans for user approval

Use type: "message" ONLY when:
- Answering questions (stats, advice, etc.)
- Greeting the user
- Explaining something without proposing to create anything

=== CRITICAL: ACTION PAYLOAD IS MANDATORY ===

When type is "action", you MUST include the "action" field with:
- actionType: the action name (e.g., "create_program_plan")
- payload: the full data object

Without the action payload, the user cannot see Accept/Reject buttons and gets stuck.

=== CRITICAL: CREATING WORKOUTS ===

When user asks to "create a workout" or "make me a push/pull/leg day":

STEP 1: Call getExercisesByMuscleGroup tool FIRST
- For push day: muscleGroups = "chest,shoulders,triceps"
- For pull day: muscleGroups = "back,biceps"
- For leg day: muscleGroups = "quads,hamstrings,glutes,calves"

STEP 2: Select 5-6 exercises from the tool results
- Pick exercises with DIFFERENT equipment types (mix barbells, dumbbells, cables, machines)
- DO NOT use exercises from the user's existing workouts shown in context
- If user already has a workout with similar name, pick COMPLETELY DIFFERENT exercises

STEP 3: Output type "action" with the workout
- You MUST output type: "action" (NOT type: "message")
- Include the full action payload with exercise IDs from the tool results
- This applies to EVERY workout proposal: initial, revised after rejection, or any follow-up
- NEVER output a workout list without the action payload

=== CRITICAL: EXERCISE SELECTION - NO CUSTOM EXERCISES WITHOUT APPROVAL ===

MANDATORY: Only use exercises from the getExercisesByMuscleGroup tool results.

If the user requests a specific exercise that is NOT in the tool results:
1. FIRST check if a similar exercise exists (typos, alternate names)
2. If a similar exercise exists, use that exercise instead
3. If NO similar exercise exists, DO NOT silently create a custom exercise
4. Instead, ASK the user if they want a similar exercise or a custom one
5. Only create custom exercises AFTER the user explicitly approves

=== CRITICAL: REST DAYS ARE NOT WORKOUTS ===

Rest days are NOT workouts. NEVER create a workout called "Rest Day" or "Rest".
Rest days belong in SCHEDULES only (as null values) or in PROGRAMS (as gaps between workout days).

=== CRITICAL: UNIQUE WORKOUT NAMES ===

Before creating workouts, CHECK the user's existing workouts in the context.
If a workout name already exists, append a number to make it unique:
- User has "Push" → new workout should be "Push (2)"

=== CRITICAL: CREATING PROGRAMS ===

When user asks to create a "program" or "workout plan" with multiple workouts:
1. Call getExercisesByMuscleGroup for each workout day
2. Create multiple workouts in the program
3. Output type "action" with actionType "create_program_plan"

=== CRITICAL: CREATING SCHEDULES ===

Schedules require existing workouts. If user doesn't have workouts yet:
1. First propose creating the workouts
2. After user approves, THEN propose the schedule

=== CONVERSATION HANDLING - REJECTION FLOW ===

When user REJECTS a proposal and provides feedback:
1. Call the relevant tools again
2. Generate a NEW proposal based on their feedback
3. Output type: "action" with the FULL action payload

=== CONVERSATION HANDLING - CONFIRMATION FLOW ===

When user CONFIRMS with "yes", "create it", "sounds good", etc.:
1. If your previous message included an action payload → Remind them to tap "Approve"
2. If your previous message did NOT include an action payload → Re-output WITH the action payload
3. NEVER respond with just text saying you'll create it

=== CRITICAL: IGNORE EXISTING WORKOUTS WHEN CREATING NEW ===

When creating NEW workouts:
- DO NOT copy exercises from existing workouts
- ALWAYS use getExercisesByMuscleGroup to discover NEW exercises
- Pick DIFFERENT exercises than what they already have

=== CRITICAL: TIME PERIOD ACCURACY ===

Be precise with time periods:
- "this week" = current calendar week (Mon-Sun)
- "last 30 days" = rolling 30 days from today
- Never confuse calendar periods with rolling periods

=== CRITICAL: RESPONSE CONSISTENCY ===

Before responding, verify all numbers are consistent throughout your message.

=== OUTPUT FORMAT ===

Your ENTIRE response must be a single JSON object. Use \\n for line breaks in the message field.

=== AVAILABLE ACTIONS ===

1. create_workout_template - Create a new workout
   Payload: { name: string, exercises: [{ id: string, name: string, sets: number }] }

2. create_program_plan - Create a program with multiple workouts
   Payload: { name: string, workouts: [{ name: string, exercises: [...] }] }

3. create_schedule - Set up a weekly training schedule
   Payload: { name: string, scheduleData: { type: "weekly"|"rotating", weekly?: {...}, rotation?: {...} } }

4. add_workout_session - Log a completed workout
   Payload: { name: string, date: string, exercises: [...] }

5. edit_workout_session - Edit a previously logged session
   Payload: { session_id: string, updates: {...} }

6. create_custom_exercise - Create a new custom exercise
   Payload: { name: string, muscle_group: string, equipment: string }

Remember: You are this user's personal trainer. You know them. Make every response feel tailored to them specifically.`;


/**
 * Builds a structured, human-readable user profile block from raw context data.
 * This replaces the raw JSON dump with labeled fields the LLM can reference naturally.
 */
const buildUserProfileBlock = (ctx: Record<string, unknown>): string => {
  const profile = ctx.profile as Record<string, unknown> | undefined;
  if (!profile) return 'User profile: Not available';

  const lines: string[] = ['=== USER PROFILE ==='];

  const name = profile.first_name || 'Unknown';
  lines.push(`Name: ${name}`);

  if (profile.gender) {
    const genderMap: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefer_not_to_say: 'Prefer not to say',
    };
    lines.push(`Gender: ${genderMap[profile.gender as string] || profile.gender}`);
  }

  if (profile.date_of_birth) {
    const dob = profile.date_of_birth as string;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    lines.push(`Age: ${age}`);
  }

  if (profile.height_feet != null && profile.height_inches != null) {
    lines.push(`Height: ${profile.height_feet}'${profile.height_inches}"`);
  }
  if (profile.weight_lbs != null) {
    const wu = (profile.weight_unit as string) || 'lbs';
    if (wu === 'kg') {
      const kg = Math.round((profile.weight_lbs as number) * 0.453592 * 10) / 10;
      lines.push(`Weight: ${kg} kg`);
    } else {
      lines.push(`Weight: ${profile.weight_lbs} lbs`);
    }
  }

  // Subscription tier (pro vs free) — NOT related to fitness experience
  lines.push(`Subscription: ${profile.is_pro ? 'Pro' : 'Free'}`);

  if (profile.experience_level) {
    const expMap: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    lines.push(`Experience Level: ${expMap[profile.experience_level as string] || profile.experience_level}`);
  } else {
    lines.push('Experience Level: Not set');
  }

  if (profile.primary_goal) {
    const goalMap: Record<string, string> = {
      'build-muscle': 'Build Muscle',
      'lose-fat': 'Lose Fat',
      'gain-strength': 'Gain Strength',
      'general-fitness': 'General Fitness',
      'improve-endurance': 'Improve Endurance',
    };
    lines.push(`Primary Goal: ${goalMap[profile.primary_goal as string] || profile.primary_goal}`);
  } else {
    lines.push('Primary Goal: Not set');
  }

  if (profile.available_equipment) {
    const equipMap: Record<string, string> = {
      'full-gym': 'Full Gym',
      'dumbbells-only': 'Dumbbells Only',
      'bodyweight': 'Bodyweight Only',
      'home-gym': 'Home Gym',
      'resistance-bands': 'Resistance Bands',
    };
    lines.push(`Available Equipment: ${equipMap[profile.available_equipment as string] || profile.available_equipment}`);
  } else {
    lines.push('Available Equipment: Not set');
  }

  if (profile.training_days_per_week != null) {
    lines.push(`Target Training Days/Week: ${profile.training_days_per_week}`);
  } else {
    lines.push('Target Training Days/Week: Not set');
  }

  // Units
  const wu = (profile.weight_unit as string) || 'lbs';
  const du = (profile.distance_unit as string) || 'mi';
  lines.push(`Units: weight=${wu}, distance=${du}`);

  return lines.join('\n');
};

/**
 * Builds a compact summary of the user's existing workouts and plans.
 */
const buildWorkoutsBlock = (ctx: Record<string, unknown>): string => {
  const templates = ctx.workoutTemplates as Array<Record<string, unknown>> | undefined;
  const plans = ctx.plans as Array<Record<string, unknown>> | undefined;
  const schedules = ctx.schedules as Array<Record<string, unknown>> | undefined;

  const lines: string[] = ['=== EXISTING WORKOUTS & PLANS ==='];

  if (!templates || templates.length === 0) {
    lines.push('Workouts: None created yet');
  } else {
    lines.push(`Workouts (${templates.length}):`);
    for (const t of templates.slice(0, 20)) {
      const exList = Array.isArray(t.exercises) ? t.exercises as Array<Record<string, unknown>> : [];
      const exNames = exList.map(e => e.name || e.exerciseName || 'Unknown').join(', ');
      lines.push(`  - ${t.name} (${exList.length} exercises: ${exNames})`);
    }
  }

  if (plans && plans.length > 0) {
    lines.push(`\nPlans (${plans.length}):`);
    for (const p of plans.slice(0, 10)) {
      lines.push(`  - ${p.name} (id: ${p.id})`);
    }
  }

  if (schedules && schedules.length > 0) {
    lines.push(`\nSchedules (${schedules.length}):`);
    for (const s of schedules.slice(0, 5)) {
      lines.push(`  - ${s.name} (id: ${s.id})`);
    }
  }

  return lines.join('\n');
};

/**
 * Builds a summary of recent workout sessions with computed training frequency.
 */
const buildRecentSessionsBlock = (ctx: Record<string, unknown>): string => {
  const sessions = ctx.workoutSessions as Array<Record<string, unknown>> | undefined;
  if (!sessions || sessions.length === 0) return '=== RECENT SESSIONS ===\nNo sessions logged yet.\nActual Training Frequency: No data (no sessions logged)';

  const lines: string[] = [`=== RECENT SESSIONS (last ${sessions.length}) ===`];
  for (const s of sessions) {
    const exList = Array.isArray(s.exercises) ? s.exercises as Array<Record<string, unknown>> : [];
    const dur = s.duration ? ` (${Math.round((s.duration as number) / 60)} min)` : '';
    lines.push(`  - ${s.date}: ${s.name}${dur} — ${exList.length} exercises`);
  }

  // Compute actual training frequency from session dates
  const dates = sessions
    .map(s => s.date as string)
    .filter(Boolean)
    .map(d => new Date(d).getTime())
    .filter(t => !isNaN(t));

  if (dates.length >= 2) {
    const newest = Math.max(...dates);
    const oldest = Math.min(...dates);
    const spanDays = Math.max((newest - oldest) / (1000 * 60 * 60 * 24), 1);
    const uniqueDays = new Set(sessions.map(s => s.date as string)).size;
    const avgPerWeek = Math.round((uniqueDays / spanDays) * 7 * 10) / 10;
    lines.push(`\nActual Training Frequency: ~${avgPerWeek} sessions/week (based on last ${uniqueDays} sessions over ${Math.round(spanDays)} days)`);
  } else if (dates.length === 1) {
    lines.push(`\nActual Training Frequency: Only 1 session recorded — not enough data for a weekly average`);
  }

  return lines.join('\n');
};

export const buildContextMessage = (context: unknown, timezone?: string): string => {
  const tz = timezone || 'UTC';
  const now = new Date();

  let dateStr: string;
  let timeStr: string;
  let dayOfWeek: string;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? '';

    dateStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    timeStr = `${getPart('hour')}:${getPart('minute')}`;
    dayOfWeek = getPart('weekday');
  } catch {
    dateStr = now.toISOString().split('T')[0];
    timeStr = now.toISOString().split('T')[1].slice(0, 5);
    dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  }

  const ctx = (context && typeof context === 'object') ? context as Record<string, unknown> : {};

  const profileBlock = buildUserProfileBlock(ctx);
  const workoutsBlock = buildWorkoutsBlock(ctx);
  const sessionsBlock = buildRecentSessionsBlock(ctx);

  return `Current date/time: ${dayOfWeek}, ${dateStr} at ${timeStr} (${tz})

${profileBlock}

${workoutsBlock}

${sessionsBlock}`;
};
