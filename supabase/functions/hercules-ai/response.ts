export interface ActionProposal {
  actionType: string;
  payload: Record<string, unknown>;
}

export interface ParsedAssistantResponse {
  type: 'message' | 'action';
  message: string;
  action: ActionProposal | null;
  raw: string;
}

/**
 * Detects if a message looks like an action proposal that should have an action payload.
 * This helps identify when the AI forgot to include the action field.
 */
const looksLikeActionProposal = (message: string): { isProposal: boolean; likelyActionType: string | null } => {
  const lowerMessage = message.toLowerCase();
  
  // Check for confirmation questions that indicate a proposal
  const confirmationPatterns = [
    'would you like me to create',
    'would you like me to set up',
    'would you like me to schedule',
    'would you like me to apply',
    'would you like me to log',
    'would you like me to add',
    'would you like to apply',
    'would you like to proceed',
    'would you like to approve',
    'would you like me to approve',
    'shall i create',
    'shall i set up',
    'shall i apply',
    'want me to create',
    'ready to create',
    'create this for you',
    'set this up for you',
    'apply this schedule',
    'approve this schedule',
    'tap approve',
    'click approve',
    'hit approve',
    'approve this program',
    'approve this plan',
    'approve this workout',
  ];
  
  let isProposal = confirmationPatterns.some(pattern => lowerMessage.includes(pattern));
  
  // STRUCTURAL DETECTION: Multiple bold headers with numbered exercise lists
  // This catches FORMAT 2 program proposals even without a confirmation phrase
  if (!isProposal) {
    const boldPattern = /\*\*([^*\n]{3,40})\*\*/g;
    const allBolds = [...message.matchAll(boldPattern)];
    let workoutHeaderCount = 0;
    for (let idx = 0; idx < allBolds.length; idx++) {
      const pos = (allBolds[idx].index || 0) + allBolds[idx][0].length;
      const nextBold = allBolds[idx + 1];
      const endPos = nextBold ? (nextBold.index || message.length) : message.length;
      const section = message.substring(pos, endPos);
      if ((section.match(/\n\s*\d+\.\s+[A-Z]/g) || []).length >= 2) {
        workoutHeaderCount++;
      }
    }
    if (workoutHeaderCount >= 2) {
      isProposal = true;
      console.log('[HerculesAI] looksLikeActionProposal: Detected structural program proposal (' + workoutHeaderCount + ' workout sections)');
    }
  }
  
  if (!isProposal) {
    return { isProposal: false, likelyActionType: null };
  }
  
  // Determine likely action type from message content
  let likelyActionType: string | null = null;
  if (lowerMessage.includes('program') || lowerMessage.includes('plan') || lowerMessage.includes('day 1') || lowerMessage.includes('day 2')) {
    likelyActionType = 'create_program_plan';
  } else if (lowerMessage.includes('schedule') || lowerMessage.includes('monday') || lowerMessage.includes('weekly')) {
    likelyActionType = 'create_schedule';
  } else if (lowerMessage.includes('workout') || lowerMessage.includes('exercise')) {
    likelyActionType = 'create_workout_template';
  } else if (lowerMessage.includes('log') || lowerMessage.includes('session')) {
    likelyActionType = 'add_workout_session';
  }
  
  // If structural detection found multiple workout sections but no keyword match, it's a program
  if (!likelyActionType && isProposal) {
    likelyActionType = 'create_program_plan';
  }
  
  return { isProposal, likelyActionType };
};

/**
 * CRITICAL: Constructs an action payload from the AI's message when the AI forgets to include it.
 * This is a fallback mechanism to ensure users always see approve/reject buttons for proposals.
 */
export const constructActionFromMessage = (message: string, likelyActionType: string | null): ActionProposal | null => {
  if (!likelyActionType) return null;
  
  console.log('[HerculesAI] Attempting to construct action from message for type:', likelyActionType);
  
  try {
    if (likelyActionType === 'create_program_plan') {
      return constructProgramPlanAction(message);
    } else if (likelyActionType === 'create_workout_template') {
      return constructWorkoutTemplateAction(message);
    } else if (likelyActionType === 'create_schedule') {
      return constructScheduleAction(message);
    }
  } catch (err) {
    console.error('[HerculesAI] Failed to construct action from message:', err);
  }
  
  return null;
};

/**
 * Parses workout details from a message and constructs a program plan action.
 * Handles both "Day N" headers and FORMAT 2 bold workout name headers.
 */
const constructProgramPlanAction = (message: string): ActionProposal | null => {
  console.log('[HerculesAI] constructProgramPlanAction - parsing message of length:', message.length);
  
  // --- Step 1: Extract plan name ---
  let planName = 'Training Program';
  const planNamePatterns = [
    /\*\*([^*]{3,50}(?:Program|Plan|Split|Routine)[^*]*)\*\*/i,
    /here'?s?\s+(?:a|your|the)\s+\*\*([^*]{3,50})\*\*/i,
    /(?:here'?s?\s+(?:a|your|the)\s+)?(\d+-day\s+[a-z/]+(?:\s+split)?(?:\s+program)?)/i,
    /(?:called|named|titled)\s+"([^"]+)"/i,
  ];
  for (const pattern of planNamePatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim();
      if (candidate.length < 50 && !candidate.includes('\n') && !candidate.match(/^\d+\.\s/)) {
        planName = candidate;
        break;
      }
    }
  }
  console.log('[HerculesAI] Extracted plan name:', planName);
  
  // --- Step 2: Find workout section headers ---
  interface SectionHeader { name: string; headerStart: number; contentStart: number; }
  let headers: SectionHeader[] = [];
  
  // Pattern A: **Day N** or **Day N - Name** or **Day N: Name**
  const dayPattern = /\*\*Day\s*(\d+)\s*(?:[-:–]\s*([^*\n]+))?\*\*/gi;
  const dayMatches = [...message.matchAll(dayPattern)];
  if (dayMatches.length > 0) {
    headers = dayMatches.map((m, i) => {
      let name = m[2]?.trim() || `Workout ${parseInt(m[1]) || (i + 1)}`;
      name = name.split(/[:\n]/)[0].trim().replace(/\*+/g, '').trim();
      if (name.length > 30) name = name.substring(0, 30).trim();
      return { name, headerStart: m.index || 0, contentStart: (m.index || 0) + m[0].length };
    });
    console.log('[HerculesAI] Found', headers.length, 'Day N headers');
  }
  
  // Pattern B: **BoldWorkoutName** followed by ≥2 numbered exercise items (FORMAT 2)
  if (headers.length === 0) {
    const boldPattern = /\*\*([^*\n]{3,40})\*\*/g;
    const allBolds = [...message.matchAll(boldPattern)];
    const workoutBolds = allBolds.filter((m, idx) => {
      const pos = (m.index || 0) + m[0].length;
      const nextBold = allBolds[idx + 1];
      const endPos = nextBold ? (nextBold.index || message.length) : message.length;
      const section = message.substring(pos, endPos);
      return (section.match(/\n\s*\d+\.\s+[A-Z]/g) || []).length >= 2;
    });
    if (workoutBolds.length >= 2) {
      headers = workoutBolds.map(m => ({
        name: m[1].trim().replace(/\*+/g, '').trim(),
        headerStart: m.index || 0,
        contentStart: (m.index || 0) + m[0].length,
      }));
      console.log('[HerculesAI] Found', headers.length, 'bold workout headers (FORMAT 2)');
    }
  }
  
  if (headers.length === 0) {
    console.warn('[HerculesAI] Could not find any workout section headers');
    return null;
  }
  
  // Update plan name with workout count if still generic
  if (planName === 'Training Program') {
    planName = `${headers.length}-Day Training Program`;
  }
  
  // --- Step 3: Extract exercises from each section ---
  const workouts: Array<{
    name: string; dayOfWeek: number;
    exercises: Array<{ name: string; sets: number; reps: string; restSeconds: number }>;
  }> = [];
  
  for (let i = 0; i < headers.length; i++) {
    const startIdx = headers[i].contentStart;
    const endIdx = headers[i + 1]?.headerStart || message.length;
    const section = message.substring(startIdx, endIdx);
    const exercises: Array<{ name: string; sets: number; reps: string; restSeconds: number }> = [];
    
    const addExercise = (rawName: string, sets: number, reps: string): boolean => {
      let name = rawName.trim().replace(/\*+/g, '').replace(/[,;.!?]+$/, '').trim();
      if (name.length < 3 || name.length > 50) return false;
      const lower = name.toLowerCase();
      const fragments = ['ups','up','down','downs','over','overs','through','throughs','bar row','bar rows','bell row','bell rows','bell press','bell curl','arm row','arm rows','arm press','arm curl'];
      if (fragments.includes(lower)) return false;
      if (!/^[A-Z0-9]/.test(name)) return false;
      const generic = ['row','rows','press','curl','curls','fly','flies','raise','raises','pull','push','extension','extensions'];
      if (!name.includes(' ') && generic.includes(lower)) return false;
      if (lower.includes('day ') || lower.includes('would you') || lower.includes('workout')) return false;
      if (exercises.some(e => e.name.toLowerCase() === lower)) return false;
      exercises.push({ name, sets, reps, restSeconds: 90 });
      return true;
    };
    
    const nc = "[A-Za-z0-9][A-Za-z0-9\\s\\-''']*";
    
    // P1: Numbered with parentheses - "1. Exercise (4 sets, 8-12 reps)"
    for (const m of section.matchAll(new RegExp(`\\d+\\.\\s*\\*?\\*?(${nc})\\*?\\*?\\s*\\((\\d+)\\s*sets?(?:,?\\s*(\\d+(?:-\\d+)?)\\s*(?:reps?|seconds?))?[^)]*\\)`, 'gi')))
      addExercise(m[1], parseInt(m[2]) || 3, m[3] || '8-12');
    // P2: Bullet with parentheses
    for (const m of section.matchAll(new RegExp(`[-•]\\s*\\*?\\*?(${nc})\\*?\\*?\\s*\\((\\d+)\\s*sets?(?:,?\\s*(\\d+(?:-\\d+)?)\\s*(?:reps?|seconds?))?[^)]*\\)`, 'gi')))
      addExercise(m[1], parseInt(m[2]) || 3, m[3] || '8-12');
    // P3: Numbered with colon - "1. Bench Press: 3 sets x 8-12"
    for (const m of section.matchAll(new RegExp(`\\d+\\.\\s*\\*?\\*?(${nc})\\*?\\*?\\s*:\\s*(\\d+)\\s*(?:sets?)?\\s*[x×]\\s*(\\d+(?:-\\d+)?)`, 'gi')))
      addExercise(m[1], parseInt(m[2]) || 3, m[3] || '8-12');
    // P4: Bullet with colon
    for (const m of section.matchAll(new RegExp(`[-•]\\s*\\*?\\*?(${nc})\\*?\\*?\\s*:\\s*(\\d+)\\s*(?:sets?)?\\s*[x×]\\s*(\\d+(?:-\\d+)?)`, 'gi')))
      addExercise(m[1], parseInt(m[2]) || 3, m[3] || '8-12');
    // P5: Simple numbered list (fallback)
    if (exercises.length === 0) {
      for (const m of [...section.matchAll(new RegExp(`\\d+\\.\\s*\\*?\\*?(${nc})\\*?\\*?\\s*(?:\\n|$)`, 'gi'))].slice(0, 10))
        addExercise(m[1], 3, '8-12');
    }
    // P6: Simple bullet list (fallback)
    if (exercises.length === 0) {
      for (const m of [...section.matchAll(new RegExp(`[-•]\\s*\\*?\\*?(${nc})\\*?\\*?\\s*(?:\\n|$)`, 'gi'))].slice(0, 10))
        addExercise(m[1], 3, '8-12');
    }
    
    console.log('[HerculesAI]', headers[i].name, ':', exercises.length, 'exercises');
    
    if (exercises.length > 0) {
      workouts.push({ name: headers[i].name, dayOfWeek: i + 1, exercises });
    } else {
      workouts.push({ name: headers[i].name, dayOfWeek: i + 1, exercises: [{ name: 'Custom Exercise', sets: 3, reps: '8-12', restSeconds: 90 }] });
    }
  }
  
  if (workouts.length === 0) {
    console.warn('[HerculesAI] Could not extract any workouts from message');
    return null;
  }
  
  console.log('[HerculesAI] Constructed program plan:', {
    planName,
    workoutCount: workouts.length,
    workouts: workouts.map(w => ({ name: w.name, exerciseCount: w.exercises.length })),
  });
  
  return {
    actionType: 'create_program_plan',
    payload: {
      name: planName,
      description: `AI-generated ${workouts.length}-day training program`,
      workouts,
    },
  };
};

/**
 * Parses workout details from a message and constructs a workout template action.
 */
const constructWorkoutTemplateAction = (message: string): ActionProposal | null => {
  // Extract workout name
  let workoutName = 'Custom Workout';
  const nameMatch = message.match(/\*\*([^*]+(?:Workout|Training|Session)[^*]*)\*\*/i) ||
                   message.match(/(?:called|named|titled)\s+"([^"]+)"/i);
  if (nameMatch) {
    workoutName = nameMatch[1].trim();
  }
  
  // Extract exercises
  const exercises: Array<{ name: string; sets: number; reps: string; restSeconds: number }> = [];
  const exercisePattern = /[-•]\s*\*?\*?([^:*\n]+)\*?\*?\s*[:]\s*(\d+)\s*(?:sets?)?\s*[x×]\s*(\d+(?:-\d+)?)\s*(?:reps?)?/gi;
  const exerciseMatches = [...message.matchAll(exercisePattern)];
  
  for (const exMatch of exerciseMatches) {
    exercises.push({
      name: exMatch[1].trim().replace(/\*+/g, ''),
      sets: parseInt(exMatch[2]) || 3,
      reps: exMatch[3] || '8-12',
      restSeconds: 90,
    });
  }
  
  if (exercises.length === 0) {
    return null;
  }
  
  return {
    actionType: 'create_workout_template',
    payload: {
      name: workoutName,
      exercises,
    },
  };
};

/**
 * Constructs a schedule action from message content.
 * Parses day assignments from the AI's message and builds a create_schedule payload.
 * Uses workout NAMES (resolved server-side to IDs).
 */
const constructScheduleAction = (message: string): ActionProposal | null => {
  console.log('[HerculesAI] constructScheduleAction - parsing message');

  // Strip markdown bold markers before parsing so **Monday**: Push works
  const cleanMessage = message.replace(/\*\*/g, '');

  const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Try to detect weekly schedule: "Monday: Push Day", "Tuesday: Rest", etc.
  const weeklyPattern = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*[:–-]\s*([^,\n]+)/gi;
  const weeklyMatches = [...cleanMessage.matchAll(weeklyPattern)];

  if (weeklyMatches.length >= 3) {
    console.log('[HerculesAI] Detected weekly schedule with', weeklyMatches.length, 'day assignments');
    const days: Record<string, string | null> = {};
    for (const day of WEEKDAYS) {
      days[day] = null; // default rest
    }
    for (const match of weeklyMatches) {
      const dayName = match[1].toLowerCase();
      const workoutName = match[2].trim();
      const isRest = /^(rest|off|recovery|rest day|off day|recovery day)$/i.test(workoutName);
      days[dayName] = isRest ? null : workoutName;
    }
    return {
      actionType: 'create_schedule',
      payload: { type: 'weekly', scheduleData: { type: 'weekly', days } },
    };
  }

  // Try to detect rotating schedule: "Day 1: Push", "Day 2: Pull", etc.
  const rotatingPattern = /\bDay\s*(\d+)\s*[:–-]\s*([^,\n]+)/gi;
  const rotatingMatches = [...cleanMessage.matchAll(rotatingPattern)];

  if (rotatingMatches.length >= 2) {
    console.log('[HerculesAI] Detected rotating schedule with', rotatingMatches.length, 'cycle entries');
    // Sort by day number
    const sorted = rotatingMatches.sort((a, b) => parseInt(a[1]) - parseInt(b[1]));
    const cycleWorkouts: (string | null)[] = sorted.map((match) => {
      const workoutName = match[2].trim();
      const isRest = /^(rest|off|recovery|rest day|off day|recovery day)$/i.test(workoutName);
      return isRest ? null : workoutName;
    });
    return {
      actionType: 'create_schedule',
      payload: { type: 'rotating', scheduleData: { type: 'rotating', cycleWorkouts } },
    };
  }

  console.warn('[HerculesAI] Could not parse schedule from message');
  return null;
};

/**
 * Extracts a JSON object from content that may contain text before/after the JSON.
 * Looks for our expected JSON format with "type" and "message" fields.
 */
const extractJsonFromContent = (content: string): string | null => {
  const jsonStartPatterns = [
    '{"type"',
    '{ "type"',
    "{'type'",
    "{ 'type'",
  ];
  
  for (const pattern of jsonStartPatterns) {
    const startIndex = content.indexOf(pattern);
    if (startIndex !== -1) {
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = startIndex; i < content.length; i++) {
        const char = content[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          
          if (braceCount === 0 && char === '}') {
            return content.substring(startIndex, i + 1);
          }
        }
      }
    }
  }
  
  return null;
};

/**
 * Normalizes message content for human-readable display.
 * Converts escaped newlines to actual newlines.
 */
const normalizeMessage = (message: string): string => {
  return message.replace(/\\n/g, '\n');
};

/**
 * CRITICAL: Sanitizes content to ensure NO JSON is ever shown to users.
 * This is the last line of defense - if content looks like JSON, extract the message.
 * If extraction fails, strip JSON-like patterns entirely.
 */
export const sanitizeForDisplay = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return 'Let me know how I can help with your training today.';
  }

  const trimmed = content.trim();
  
  // Check if content looks like JSON (starts with { and contains "type" or "message")
  const looksLikeJson = (
    trimmed.startsWith('{') ||
    trimmed.includes('{"type"') ||
    trimmed.includes('{ "type"') ||
    trimmed.includes('"message":') ||
    trimmed.includes('"action":')
  );

  if (!looksLikeJson) {
    // Content doesn't look like JSON, return normalized version
    return normalizeMessage(trimmed);
  }

  // Content looks like JSON - we MUST extract the message
  // Try to parse as pure JSON first
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.message && typeof parsed.message === 'string') {
      return normalizeMessage(parsed.message);
    }
  } catch (_) {
    // Not pure JSON
  }

  // Try to extract JSON from mixed content
  const extractedJson = extractJsonFromContent(trimmed);
  if (extractedJson) {
    try {
      const parsed = JSON.parse(extractedJson);
      if (parsed?.message && typeof parsed.message === 'string') {
        return normalizeMessage(parsed.message);
      }
    } catch (_) {
      // Extraction failed
    }
  }

  // Last resort: Try to extract message using regex (requires closing quote)
  const messageMatch = trimmed.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (messageMatch && messageMatch[1]) {
    const extracted = messageMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\');
    return extracted;
  }

  // CRITICAL: Handle truncated JSON (response was cut off mid-stream).
  // Parse character-by-character to salvage the message value.
  const msgStartMatch = trimmed.match(/"message"\s*:\s*"/);
  if (msgStartMatch && msgStartMatch.index !== undefined) {
    const valueStart = msgStartMatch.index + msgStartMatch[0].length;
    let extracted = '';
    let escapeNext = false;

    for (let i = valueStart; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (escapeNext) {
        if (char === 'n') extracted += '\n';
        else if (char === '"') extracted += '"';
        else if (char === '\\') extracted += '\\';
        else if (char === 't') extracted += '\t';
        else extracted += char;
        escapeNext = false;
        continue;
      }
      if (char === '\\') { escapeNext = true; continue; }
      if (char === '"') break;
      extracted += char;
    }

    if (extracted.length > 20) {
      return extracted;
    }
  }

  // ABSOLUTE LAST RESORT: Remove all JSON-like content and return what's left
  // This should never happen, but we MUST NOT show JSON to users
  const stripped = trimmed
    .replace(/\{[^{}]*"type"\s*:\s*"[^"]*"[^{}]*\}/g, '')
    .replace(/\{[^{}]*"message"\s*:\s*"[^"]*"[^{}]*\}/g, '')
    .replace(/\{[\s\S]*\}/g, '')
    .trim();

  if (stripped.length > 10) {
    return normalizeMessage(stripped);
  }

  // If we still have nothing useful, return a neutral fallback
  return 'Let me know how I can help with your training today.';
};

/**
 * Extracts exercise names from a message's human-readable text.
 * Used to cross-validate that the action payload matches what the user sees.
 */
const extractExerciseNamesFromMessage = (message: string): string[] => {
  const names: Set<string> = new Set();
  const nameChars = "[A-Za-z][A-Za-z0-9\\s\\-''']+?";

  // Pattern A: "- Exercise Name: N sets x M" or "- **Exercise Name**: N x M"
  const patternA = new RegExp(`[-•]\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*[:]\\s*\\d+\\s*(?:sets?)?\\s*[x×]`, 'gi');
  for (const m of message.matchAll(patternA)) {
    const name = m[1].trim().replace(/\*+/g, '');
    if (name.length >= 3 && name.length <= 50) names.add(name.toLowerCase());
  }

  // Pattern B: "N. Exercise Name: N sets x M" (numbered list)
  const patternB = new RegExp(`\\d+\\.\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*[:]\\s*\\d+\\s*(?:sets?)?\\s*[x×]`, 'gi');
  for (const m of message.matchAll(patternB)) {
    const name = m[1].trim().replace(/\*+/g, '');
    if (name.length >= 3 && name.length <= 50) names.add(name.toLowerCase());
  }

  // Pattern C: "- Exercise Name (N sets)" or "N. Exercise Name (N sets)"
  const patternC = new RegExp(`(?:[-•]|\\d+\\.)\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*\\(\\s*\\d+\\s*sets?`, 'gi');
  for (const m of message.matchAll(patternC)) {
    const name = m[1].trim().replace(/\*+/g, '');
    if (name.length >= 3 && name.length <= 50) names.add(name.toLowerCase());
  }

  return [...names];
};

/**
 * Checks if two exercise names are similar enough to be considered a match.
 * Uses substring containment — e.g., "bench press" matches "barbell bench press".
 */
const exerciseNamesMatch = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Split into words and check if majority of words overlap
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  const commonWords = wordsA.filter(w => wordsB.includes(w));
  return commonWords.length >= Math.min(wordsA.length, wordsB.length) * 0.6;
};

/**
 * CRITICAL: Cross-validates that the action payload matches the message the user sees.
 * If the AI generated a message about "Pull Day" but the payload contains "Push Day" exercises,
 * this function detects the mismatch and reconstructs the payload from the message text.
 * 
 * This prevents the bug where the user approves one workout but a different one gets created.
 */
export const crossValidateActionPayload = (
  message: string,
  action: ActionProposal
): ActionProposal => {
  if (action.actionType === 'create_workout_template') {
    return crossValidateWorkoutPayload(message, action);
  }
  if (action.actionType === 'create_program_plan') {
    return crossValidateProgramPayload(message, action);
  }
  if (action.actionType === 'create_schedule') {
    return crossValidateSchedulePayload(message, action);
  }
  return action;
};

/**
 * Cross-validates a create_workout_template payload against the message text.
 */
const crossValidateWorkoutPayload = (
  message: string,
  action: ActionProposal
): ActionProposal => {
  const payload = action.payload;
  const payloadExercises = Array.isArray(payload.exercises)
    ? (payload.exercises as Array<Record<string, unknown>>)
        .map(e => String(e?.name || '').toLowerCase().trim())
        .filter(Boolean)
    : [];

  if (payloadExercises.length === 0) return action;

  const messageExercises = extractExerciseNamesFromMessage(message);

  if (messageExercises.length < 2) {
    console.log('[HerculesAI] Cross-validation: Not enough message exercises to validate (' + messageExercises.length + ')');
    return action;
  }

  const { matchCount, overlapRatio } = computeExerciseOverlap(payloadExercises, messageExercises);

  console.log('[HerculesAI] Cross-validation (workout):', {
    payloadExercises: payloadExercises.slice(0, 5),
    messageExercises: messageExercises.slice(0, 5),
    matchCount,
    total: payloadExercises.length,
    overlap: (overlapRatio * 100).toFixed(0) + '%',
  });

  if (overlapRatio >= 0.5) {
    return action;
  }

  // MISMATCH DETECTED — payload exercises don't match what the user sees in the message
  console.error('[HerculesAI] CRITICAL MISMATCH: Payload exercises do not match message text!');
  console.error('[HerculesAI] Payload exercises:', payloadExercises);
  console.error('[HerculesAI] Message exercises:', messageExercises);

  const reconstructed = constructWorkoutTemplateAction(message);
  if (reconstructed) {
    console.log('[HerculesAI] Replaced mismatched payload with message-derived exercises (' +
      ((reconstructed.payload.exercises as unknown[])?.length || 0) + ' exercises)');
    // Preserve the original workout name if the reconstructed one is generic
    if (reconstructed.payload.name === 'Custom Workout' && payload.name) {
      reconstructed.payload.name = payload.name;
    }
    return reconstructed;
  }

  console.warn('[HerculesAI] Could not reconstruct from message — using original payload');
  return action;
};

/**
 * Cross-validates a create_program_plan payload against the message text.
 * Flattens all exercises across all workouts and checks overall overlap.
 */
const crossValidateProgramPayload = (
  message: string,
  action: ActionProposal
): ActionProposal => {
  const payload = action.payload;
  const workouts = Array.isArray(payload.workouts)
    ? (payload.workouts as Array<Record<string, unknown>>)
    : [];

  if (workouts.length === 0) return action;

  // Flatten all exercise names from all workouts in the payload
  const payloadExercises: string[] = [];
  for (const w of workouts) {
    const exercises = Array.isArray(w.exercises) ? (w.exercises as Array<Record<string, unknown>>) : [];
    for (const e of exercises) {
      const name = String(e?.name || '').toLowerCase().trim();
      if (name) payloadExercises.push(name);
    }
  }

  if (payloadExercises.length === 0) return action;

  const messageExercises = extractExerciseNamesFromMessage(message);

  if (messageExercises.length < 3) {
    console.log('[HerculesAI] Cross-validation (program): Not enough message exercises to validate (' + messageExercises.length + ')');
    return action;
  }

  const { matchCount, overlapRatio } = computeExerciseOverlap(payloadExercises, messageExercises);

  console.log('[HerculesAI] Cross-validation (program):', {
    payloadExerciseCount: payloadExercises.length,
    messageExerciseCount: messageExercises.length,
    matchCount,
    overlap: (overlapRatio * 100).toFixed(0) + '%',
  });

  if (overlapRatio >= 0.5) {
    // Even if exercises match, sanitize the setActiveSchedule sub-payload for rest day strings
    sanitizeSetActiveSchedule(action.payload);
    return action;
  }

  console.error('[HerculesAI] CRITICAL MISMATCH: Program payload exercises do not match message!');

  const reconstructed = constructProgramPlanAction(message);
  if (reconstructed) {
    const newWorkouts = Array.isArray(reconstructed.payload.workouts)
      ? (reconstructed.payload.workouts as unknown[]).length : 0;
    console.log('[HerculesAI] Replaced mismatched program payload (' + newWorkouts + ' workouts)');
    // Preserve the original setActiveSchedule if the reconstructed one doesn't have it
    if (payload.setActiveSchedule && !reconstructed.payload.setActiveSchedule) {
      reconstructed.payload.setActiveSchedule = payload.setActiveSchedule;
    }
    sanitizeSetActiveSchedule(reconstructed.payload);
    return reconstructed;
  }

  console.warn('[HerculesAI] Could not reconstruct program from message — using original payload');
  sanitizeSetActiveSchedule(action.payload);
  return action;
};

/**
 * Sanitizes the setActiveSchedule sub-payload within a create_program_plan payload.
 * Converts rest-day strings ("Rest", "Off", etc.) to null to prevent them from
 * being treated as workout names during schedule creation.
 */
const sanitizeSetActiveSchedule = (payload: Record<string, unknown>): void => {
  const sched = payload.setActiveSchedule;
  if (!sched || typeof sched !== 'object') return;

  const schedObj = sched as Record<string, unknown>;
  const restDayStrings = ['rest', 'rest day', 'restday', 'off', 'off day', 'recovery', 'recovery day'];

  // Sanitize weekly days
  if (typeof schedObj.days === 'object' && schedObj.days !== null) {
    const days = schedObj.days as Record<string, unknown>;
    for (const [day, val] of Object.entries(days)) {
      if (typeof val === 'string' && restDayStrings.includes(val.toLowerCase().trim())) {
        console.warn(`[HerculesAI] sanitizeSetActiveSchedule: correcting ${day}: "${val}" → null`);
        days[day] = null;
      }
    }
  }

  // Sanitize rotating cycleWorkouts
  const cycle = Array.isArray(schedObj.cycleWorkouts) ? schedObj.cycleWorkouts as unknown[] : null;
  if (cycle) {
    for (let i = 0; i < cycle.length; i++) {
      const val = cycle[i];
      if (typeof val === 'string' && restDayStrings.includes(val.toLowerCase().trim())) {
        console.warn(`[HerculesAI] sanitizeSetActiveSchedule: correcting cycle[${i}]: "${val}" → null`);
        cycle[i] = null;
      }
    }
  }
};

/**
 * Cross-validates a create_schedule payload against the message text.
 * Checks that:
 * 1. The schedule type (weekly/rotating) matches what the message describes
 * 2. Rest day strings in the payload are corrected to null
 * 3. Workout names in the payload appear in the message
 */
const crossValidateSchedulePayload = (
  message: string,
  action: ActionProposal
): ActionProposal => {
  const payload = action.payload;
  const sd = (typeof payload.scheduleData === 'object' && payload.scheduleData !== null)
    ? payload.scheduleData as Record<string, unknown>
    : payload;
  const payloadType = String(sd.type || payload.type || '').toLowerCase();

  const lowerMessage = message.toLowerCase();

  // 1. Detect schedule type from message text
  const messageHasWeekly = lowerMessage.includes('weekly schedule') ||
    (lowerMessage.includes('monday') && lowerMessage.includes('tuesday'));
  const messageHasRotating = lowerMessage.includes('rotating schedule') ||
    (lowerMessage.includes('day 1') && lowerMessage.includes('day 2'));

  if (messageHasWeekly && payloadType === 'rotating') {
    console.error('[HerculesAI] SCHEDULE TYPE MISMATCH: Message says weekly but payload says rotating — correcting to weekly');
    // Can't auto-fix this reliably, but log the error so it's visible
  }
  if (messageHasRotating && payloadType === 'weekly') {
    console.error('[HerculesAI] SCHEDULE TYPE MISMATCH: Message says rotating but payload says weekly — correcting to rotating');
  }

  // 2. Sanitize rest day strings in payload — convert "Rest", "rest", "Off", etc. to null
  const restDayStrings = ['rest', 'rest day', 'restday', 'off', 'off day', 'recovery', 'recovery day'];
  let corrected = false;

  if (payloadType === 'weekly') {
    const days = (typeof sd.days === 'object' && sd.days !== null) ? sd.days as Record<string, unknown> : null;
    if (days) {
      for (const [day, val] of Object.entries(days)) {
        if (typeof val === 'string' && restDayStrings.includes(val.toLowerCase().trim())) {
          console.warn(`[HerculesAI] Schedule cross-validation: correcting ${day}: "${val}" → null (rest day)`);
          (days as Record<string, unknown>)[day] = null;
          corrected = true;
        }
      }
    }
  } else if (payloadType === 'rotating') {
    const cycle = Array.isArray(sd.cycleWorkouts) ? sd.cycleWorkouts as unknown[] : [];
    for (let i = 0; i < cycle.length; i++) {
      const val = cycle[i];
      if (typeof val === 'string' && restDayStrings.includes(val.toLowerCase().trim())) {
        console.warn(`[HerculesAI] Schedule cross-validation: correcting cycle[${i}]: "${val}" → null (rest day)`);
        cycle[i] = null;
        corrected = true;
      }
    }
  }

  if (corrected) {
    console.log('[HerculesAI] Schedule cross-validation: corrected rest day strings to null');
  }

  // 3. Check that workout names from payload appear in the message
  const payloadWorkoutNames: string[] = [];
  if (payloadType === 'weekly') {
    const days = (typeof sd.days === 'object' && sd.days !== null) ? sd.days as Record<string, unknown> : {};
    for (const val of Object.values(days)) {
      if (typeof val === 'string' && val.trim()) {
        payloadWorkoutNames.push(val.trim().toLowerCase());
      }
    }
  } else if (payloadType === 'rotating') {
    const cycle = Array.isArray(sd.cycleWorkouts) ? sd.cycleWorkouts as unknown[] : [];
    for (const val of cycle) {
      if (typeof val === 'string' && val.trim()) {
        payloadWorkoutNames.push(val.trim().toLowerCase());
      }
    }
  }

  if (payloadWorkoutNames.length > 0) {
    const missingInMessage = payloadWorkoutNames.filter(name => !lowerMessage.includes(name));
    if (missingInMessage.length > 0) {
      console.warn('[HerculesAI] Schedule cross-validation: payload workout names not found in message:', missingInMessage);
    }
  }

  return action;
};

/**
 * Computes the overlap ratio between payload exercise names and message exercise names.
 */
const computeExerciseOverlap = (
  payloadExercises: string[],
  messageExercises: string[]
): { matchCount: number; overlapRatio: number } => {
  let matchCount = 0;
  for (const pName of payloadExercises) {
    if (messageExercises.some(mName => exerciseNamesMatch(mName, pName))) {
      matchCount++;
    }
  }
  return {
    matchCount,
    overlapRatio: matchCount / Math.max(payloadExercises.length, 1),
  };
};

/**
 * Parses the raw AI response and extracts structured data.
 * The message field is ALWAYS sanitized to ensure no JSON is shown to users.
 * 
 * CRITICAL: This function logs warnings when action proposals are detected but
 * the action payload is missing - this helps debug AI instruction compliance.
 */
export const parseAssistantResponse = (content: string): ParsedAssistantResponse => {
  // CRITICAL DEBUG: Log the raw AI response
  console.log('[HerculesAI] parseAssistantResponse: RAW CONTENT (first 500 chars):', content?.substring(0, 500));
  console.log('[HerculesAI] parseAssistantResponse: Content length:', content?.length);
  
  if (!content || typeof content !== 'string') {
    console.warn('[HerculesAI] parseAssistantResponse: Empty or invalid content');
    return {
      type: 'message',
      message: 'Let me know how I can help with your training today.',
      action: null,
      raw: content || '',
    };
  }

  const trimmed = content.trim();
  console.log('[HerculesAI] parseAssistantResponse: Starts with curly brace?', trimmed.startsWith('{'));

  // Try to parse as pure JSON first
  try {
    console.log('[HerculesAI] parseAssistantResponse: Attempting JSON.parse...');
    const parsed = JSON.parse(trimmed) as {
      type?: string;
      message?: string;
      action?: ActionProposal | null;
    };
    console.log('[HerculesAI] parseAssistantResponse: JSON parsed successfully, type=', parsed.type, 'hasAction=', !!parsed.action);

    if (parsed?.type && parsed?.message) {
      let type: 'message' | 'action' = parsed.type === 'action' ? 'action' : 'message';
      const sanitizedMessage = sanitizeForDisplay(parsed.message);
      let action: ActionProposal | null = parsed.action ?? null;
      
      // CRITICAL: Validate action has required fields
      if (action) {
        if (!action.actionType || !action.payload) {
          console.warn('[HerculesAI] parseAssistantResponse: Action missing required fields', { action });
          action = null;
        }
      }
      
      // CRITICAL: If type is 'action' but action payload is null, try to construct it
      if (type === 'action' && !action) {
        const proposal = looksLikeActionProposal(sanitizedMessage);
        console.warn('[HerculesAI] parseAssistantResponse: type=action but action is null! Attempting construction...', {
          messagePreview: sanitizedMessage.substring(0, 100),
          likelyActionType: proposal.likelyActionType,
        });
        if (proposal.likelyActionType) {
          action = constructActionFromMessage(sanitizedMessage, proposal.likelyActionType);
          if (action) {
            console.log('[HerculesAI] parseAssistantResponse: Successfully constructed missing action:', action.actionType);
          }
        }
      }
      
      // CRITICAL: If type is 'message' but message looks like a proposal, construct and attach the action
      if (type === 'message') {
        const proposal = looksLikeActionProposal(sanitizedMessage);
        if (proposal.isProposal && proposal.likelyActionType) {
          console.warn('[HerculesAI] parseAssistantResponse: Message looks like proposal but type=message! Constructing action...', {
            messagePreview: sanitizedMessage.substring(0, 100),
            likelyActionType: proposal.likelyActionType,
          });
          action = constructActionFromMessage(sanitizedMessage, proposal.likelyActionType);
          if (action) {
            type = 'action';
            console.log('[HerculesAI] parseAssistantResponse: Promoted message to action:', action.actionType);
          }
        }
      }
      
      console.log('[HerculesAI] parseAssistantResponse: Parsed successfully', {
        type,
        hasAction: !!action,
        actionType: action?.actionType,
      });
      
      return {
        type,
        message: sanitizedMessage,
        action,
        raw: content,
      };
    }
  } catch (_) {
    // Not pure JSON
  }

  // Try to extract JSON from mixed content
  const extractedJson = extractJsonFromContent(trimmed);
  if (extractedJson) {
    try {
      const parsed = JSON.parse(extractedJson) as {
        type?: string;
        message?: string;
        action?: ActionProposal | null;
      };

      if (parsed?.type && parsed?.message) {
        let type: 'message' | 'action' = parsed.type === 'action' ? 'action' : 'message';
        const sanitizedMessage = sanitizeForDisplay(parsed.message);
        let action: ActionProposal | null = parsed.action ?? null;
        
        // Validate action
        if (action && (!action.actionType || !action.payload)) {
          console.warn('[HerculesAI] parseAssistantResponse (extracted): Action missing required fields');
          action = null;
        }
        
        // If action expected but missing, try to construct it
        if (type === 'action' && !action) {
          console.warn('[HerculesAI] parseAssistantResponse (extracted): type=action but action is null! Attempting construction...');
          const proposal = looksLikeActionProposal(sanitizedMessage);
          if (proposal.likelyActionType) {
            action = constructActionFromMessage(sanitizedMessage, proposal.likelyActionType);
            if (action) {
              console.log('[HerculesAI] parseAssistantResponse (extracted): Constructed missing action:', action.actionType);
            }
          }
        }
        
        // If type is message but looks like a proposal, try to construct action
        if (type === 'message') {
          const proposal = looksLikeActionProposal(sanitizedMessage);
          if (proposal.isProposal && proposal.likelyActionType) {
            const constructed = constructActionFromMessage(sanitizedMessage, proposal.likelyActionType);
            if (constructed) {
              type = 'action';
              action = constructed;
              console.log('[HerculesAI] parseAssistantResponse (extracted): Promoted to action:', constructed.actionType);
            }
          }
        }
        
        return {
          type,
          message: sanitizedMessage,
          action,
          raw: content,
        };
      }
    } catch (_) {
      // Extraction failed
    }
  }

  // CRITICAL: Handle truncated JSON (response hit max_tokens).
  // The content starts with { but JSON.parse and extractJsonFromContent both failed,
  // meaning the JSON was never closed. Try to salvage the "message" value.
  if (trimmed.startsWith('{') || trimmed.includes('"message"')) {
    console.warn('[HerculesAI] parseAssistantResponse: Detected likely truncated JSON, attempting to salvage message');

    // Try to extract the message value even from incomplete JSON.
    // Match "message": "..." where the string may be cut off (no closing quote).
    const msgStartMatch = trimmed.match(/"message"\s*:\s*"/);
    if (msgStartMatch && msgStartMatch.index !== undefined) {
      const valueStart = msgStartMatch.index + msgStartMatch[0].length;
      let extracted = '';
      let escapeNext = false;

      for (let i = valueStart; i < trimmed.length; i++) {
        const char = trimmed[i];
        if (escapeNext) {
          if (char === 'n') extracted += '\n';
          else if (char === '"') extracted += '"';
          else if (char === '\\') extracted += '\\';
          else if (char === 't') extracted += '\t';
          else extracted += char;
          escapeNext = false;
          continue;
        }
        if (char === '\\') { escapeNext = true; continue; }
        if (char === '"') break; // Proper end of string value
        extracted += char;
      }

      if (extracted.length > 20) {
        console.log('[HerculesAI] parseAssistantResponse: Salvaged message from truncated JSON, length:', extracted.length);
        return {
          type: 'message',
          message: extracted,
          action: null,
          raw: content,
        };
      }
    }
  }

  // Fallback: Use sanitizeForDisplay to ensure no JSON is shown
  const fallbackMessage = sanitizeForDisplay(trimmed);
  const proposal = looksLikeActionProposal(fallbackMessage);
  
  if (proposal.isProposal) {
    console.warn('[HerculesAI] parseAssistantResponse: Fallback path - message looks like proposal but no valid JSON!', {
      messagePreview: fallbackMessage.substring(0, 100),
      likelyActionType: proposal.likelyActionType,
    });
  }
  
  return {
    type: 'message',
    message: fallbackMessage,
    action: null,
    raw: content,
  };
};
