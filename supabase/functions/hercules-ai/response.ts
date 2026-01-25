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
    'would you like me to log',
    'would you like me to add',
    'shall i create',
    'shall i set up', 
    'want me to create',
    'ready to create',
    'create this for you',
    'set this up for you',
    'tap approve',
    'click approve',
  ];
  
  const isProposal = confirmationPatterns.some(pattern => lowerMessage.includes(pattern));
  
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
 * CRITICAL: This must properly separate workout names from exercise lists.
 */
const constructProgramPlanAction = (message: string): ActionProposal | null => {
  console.log('[HerculesAI] constructProgramPlanAction - parsing message of length:', message.length);
  
  // Count days mentioned to generate a sensible plan name
  const dayCount = (message.match(/\*\*Day\s*\d+/gi) || []).length;
  
  // Extract plan name - be very specific, avoid matching exercise lists
  let planName = `${dayCount || 5}-Day Training Program`;
  
  // Look for explicit program name patterns (not exercise lists)
  const programNamePatterns = [
    /(?:here'?s?\s+(?:a|your|the)\s+)?(\d+-day\s+[a-z/]+(?:\s+split)?(?:\s+program)?)/i,
    /(?:called|named|titled)\s+"([^"]+)"/i,
    /^#+\s*([^#\n]+(?:Program|Plan|Split|Routine)[^#\n]*)/im,
  ];
  
  for (const pattern of programNamePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Only use if it's a reasonable name (not a list of exercises)
      if (candidate.length < 50 && !candidate.includes('\n') && !candidate.match(/^\d+\.\s/)) {
        planName = candidate;
        break;
      }
    }
  }
  
  console.log('[HerculesAI] Extracted plan name:', planName);
  
  // Extract days/workouts from the message
  const workouts: Array<{
    name: string;
    dayOfWeek: number;
    exercises: Array<{ name: string; sets: number; reps: string; restSeconds: number }>;
  }> = [];
  
  // Split message by day headers to process each day separately
  // Pattern: **Day X - Name** or **Day X: Name** or just **Day X**
  const dayHeaderPattern = /\*\*Day\s*(\d+)\s*(?:[-:–]\s*([^*\n]+))?\*\*/gi;
  const dayMatches = [...message.matchAll(dayHeaderPattern)];
  
  console.log('[HerculesAI] Found', dayMatches.length, 'day headers');
  
  for (let i = 0; i < dayMatches.length; i++) {
    const dayMatch = dayMatches[i];
    const dayNum = parseInt(dayMatch[1]) || (i + 1);
    // Extract just the day name (e.g., "Push", "Pull", "Shoulders") - NOT exercises
    let dayName = dayMatch[2]?.trim() || `Workout ${dayNum}`;
    
    // Clean up the day name - remove any trailing exercise info
    dayName = dayName.split(/[:\n]/)[0].trim();
    // Remove markdown formatting
    dayName = dayName.replace(/\*+/g, '').trim();
    // Ensure name is reasonable length
    if (dayName.length > 30) {
      dayName = dayName.substring(0, 30).trim();
    }
    
    console.log('[HerculesAI] Processing Day', dayNum, ':', dayName);
    
    // Find the section of text for this day (until next day header or end)
    const startIndex = (dayMatch.index || 0) + dayMatch[0].length;
    const endIndex = dayMatches[i + 1]?.index || message.length;
    const daySection = message.substring(startIndex, endIndex);
    
    // Extract exercises from this day's section using multiple patterns
    const exercises: Array<{ name: string; sets: number; reps: string; restSeconds: number }> = [];
    
    console.log('[HerculesAI] Parsing exercises from day section (length:', daySection.length, ')');
    console.log('[HerculesAI] Day section content preview:', daySection.substring(0, 300));
    
    // Helper to add exercise if valid and not duplicate
    const addExercise = (name: string, sets: number, reps: string) => {
      // Clean up the name
      let cleanName = name.trim().replace(/\*+/g, '').replace(/[,;.!?]+$/, '').trim();
      
      // Skip invalid names - length check
      if (cleanName.length < 3 || cleanName.length > 50) {
        console.log('[HerculesAI] Skipped - length issue:', cleanName, cleanName.length);
        return false;
      }
      
      // CRITICAL: Skip partial hyphenated words (like "ups" from "Chin-ups" or "Bar Row" from "T-Bar Row")
      // These are fragments that got incorrectly parsed
      const lowerName = cleanName.toLowerCase();
      const partialHyphenatedWords = [
        'ups', 'up', 'down', 'downs', 'over', 'overs', 'through', 'throughs',
        'bar row', 'bar rows', 'bell row', 'bell rows', 'bell press', 'bell curl',
        'arm row', 'arm rows', 'arm press', 'arm curl',
      ];
      if (partialHyphenatedWords.includes(lowerName)) {
        console.log('[HerculesAI] Skipped - partial hyphenated word fragment:', cleanName);
        return false;
      }
      
      // Skip if name doesn't start with a capital letter (proper exercise names are capitalized)
      // Exception: numbers like "21s"
      if (!/^[A-Z0-9]/.test(cleanName)) {
        console.log('[HerculesAI] Skipped - not capitalized:', cleanName);
        return false;
      }
      
      // Skip single-word names that are too generic or likely fragments
      const genericWords = ['row', 'rows', 'press', 'curl', 'curls', 'fly', 'flies', 'raise', 'raises', 'pull', 'push', 'extension', 'extensions'];
      if (!cleanName.includes(' ') && genericWords.includes(lowerName)) {
        console.log('[HerculesAI] Skipped - generic single word:', cleanName);
        return false;
      }
      
      // Skip names containing problematic phrases
      if (lowerName.includes('day ') || lowerName.includes('would you') || lowerName.includes('workout')) {
        console.log('[HerculesAI] Skipped - contains problematic phrase:', cleanName);
        return false;
      }
      
      // Check for duplicate
      if (exercises.some(e => e.name.toLowerCase() === cleanName.toLowerCase())) {
        console.log('[HerculesAI] Skipped - duplicate:', cleanName);
        return false;
      }
      
      console.log('[HerculesAI] Adding exercise:', cleanName, '- sets:', sets, '- reps:', reps);
      exercises.push({
        name: cleanName,
        sets: sets,
        reps: reps,
        restSeconds: 90,
      });
      return true;
    };
    
    // CRITICAL: Character class for exercise names - must include hyphens, apostrophes, numbers (for T-Bar)
    // Using [A-Za-z0-9\s\-'''] to match: "T-Bar Row", "Pull-ups", "Farmer's Walk", "21s"
    const nameChars = "[A-Za-z0-9][A-Za-z0-9\\s\\-''']*";
    
    // Try ALL patterns and collect ALL matches (don't break early)
    // Pattern 1: Numbered list with parentheses - "1. Barbell Bent-Over Row (4 sets)"
    const numberedParenPattern = new RegExp(`\\d+\\.\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*\\((\\d+)\\s*sets?(?:,?\\s*(\\d+(?:-\\d+)?)\\s*(?:reps?|seconds?))?[^)]*\\)`, 'gi');
    let matches = [...daySection.matchAll(numberedParenPattern)];
    console.log('[HerculesAI] Pattern 1 (numbered paren) found', matches.length, 'matches');
    for (const m of matches) {
      const reps = m[3] || '8-12';
      addExercise(m[1], parseInt(m[2]) || 3, reps);
    }
    
    // Pattern 2: Bullet list with parentheses - "- Pull-ups (3 sets)"
    const bulletParenPattern = new RegExp(`[-•]\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*\\((\\d+)\\s*sets?(?:,?\\s*(\\d+(?:-\\d+)?)\\s*(?:reps?|seconds?))?[^)]*\\)`, 'gi');
    matches = [...daySection.matchAll(bulletParenPattern)];
    console.log('[HerculesAI] Pattern 2 (bullet paren) found', matches.length, 'matches');
    for (const m of matches) {
      const reps = m[3] || '8-12';
      addExercise(m[1], parseInt(m[2]) || 3, reps);
    }
    
    // Pattern 3: Numbered with colon - "1. Bench Press: 3 sets x 8-12"
    const numberedColonPattern = new RegExp(`\\d+\\.\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*:\\s*(\\d+)\\s*(?:sets?)?\\s*[x×]\\s*(\\d+(?:-\\d+)?)`, 'gi');
    matches = [...daySection.matchAll(numberedColonPattern)];
    console.log('[HerculesAI] Pattern 3 (numbered colon) found', matches.length, 'matches');
    for (const m of matches) {
      addExercise(m[1], parseInt(m[2]) || 3, m[3] || '8-12');
    }
    
    // Pattern 4: Bullet with colon - "- Bench Press: 3 sets x 8-12"
    const bulletColonPattern = new RegExp(`[-•]\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*:\\s*(\\d+)\\s*(?:sets?)?\\s*[x×]\\s*(\\d+(?:-\\d+)?)`, 'gi');
    matches = [...daySection.matchAll(bulletColonPattern)];
    console.log('[HerculesAI] Pattern 4 (bullet colon) found', matches.length, 'matches');
    for (const m of matches) {
      addExercise(m[1], parseInt(m[2]) || 3, m[3] || '8-12');
    }
    
    // Pattern 5: Simple numbered list - "1. Pull-ups" (no sets/reps specified)
    if (exercises.length === 0) {
      const simpleNumberedPattern = new RegExp(`\\d+\\.\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*(?:\\n|$)`, 'gi');
      matches = [...daySection.matchAll(simpleNumberedPattern)];
      console.log('[HerculesAI] Pattern 5 (simple numbered) found', matches.length, 'matches');
      for (const m of matches.slice(0, 10)) {
        addExercise(m[1], 3, '8-12');
      }
    }
    
    // Pattern 6: Simple bullet list - "- Pull-ups" (no sets/reps specified)
    if (exercises.length === 0) {
      const simpleBulletPattern = new RegExp(`[-•]\\s*\\*?\\*?(${nameChars})\\*?\\*?\\s*(?:\\n|$)`, 'gi');
      matches = [...daySection.matchAll(simpleBulletPattern)];
      console.log('[HerculesAI] Pattern 6 (simple bullet) found', matches.length, 'matches');
      for (const m of matches.slice(0, 10)) {
        addExercise(m[1], 3, '8-12');
      }
    }
    
    console.log('[HerculesAI] Day', dayNum, 'final exercise count:', exercises.length);
    if (exercises.length > 0) {
      console.log('[HerculesAI] Exercises:', exercises.map(e => e.name).join(', '));
    } else {
      console.warn('[HerculesAI] WARNING: No exercises found for day', dayNum);
    }
    
    // Only add workout if we found exercises
    if (exercises.length > 0) {
      workouts.push({
        name: dayName,
        dayOfWeek: dayNum,
        exercises,
      });
    } else {
      // Still add the workout even without exercises, using the day name
      workouts.push({
        name: dayName,
        dayOfWeek: dayNum,
        exercises: [{ name: 'Custom Exercise', sets: 3, reps: '8-12', restSeconds: 90 }],
      });
    }
  }
  
  if (workouts.length === 0) {
    console.warn('[HerculesAI] Could not extract any workouts from message');
    return null;
  }
  
  console.log('[HerculesAI] Constructed program plan:', { 
    planName, 
    workoutCount: workouts.length,
    workouts: workouts.map(w => ({ name: w.name, exerciseCount: w.exercises.length }))
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
 */
const constructScheduleAction = (message: string): ActionProposal | null => {
  // This is more complex as it requires existing workout IDs
  // For now, return null and let the AI retry with proper payload
  console.warn('[HerculesAI] Cannot construct schedule action without workout IDs');
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
    return 'I encountered an issue processing your request. Please try again.';
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

  // Last resort: Try to extract message using regex
  const messageMatch = trimmed.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (messageMatch && messageMatch[1]) {
    // Unescape the extracted message
    const extracted = messageMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\');
    return extracted;
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

  // If we still have nothing useful, return a generic message
  return 'I processed your request. Please check if the action was completed.';
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
      message: 'I encountered an issue processing your request. Please try again.',
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
      const type = parsed.type === 'action' ? 'action' : 'message';
      const sanitizedMessage = sanitizeForDisplay(parsed.message);
      let action = parsed.action ?? null;
      
      // CRITICAL: Validate action has required fields
      if (action) {
        if (!action.actionType || !action.payload) {
          console.warn('[HerculesAI] parseAssistantResponse: Action missing required fields', { action });
          action = null;
        }
      }
      
      // CRITICAL: If type is 'action' but action payload is null, log warning
      if (type === 'action' && !action) {
        const proposal = looksLikeActionProposal(sanitizedMessage);
        console.warn('[HerculesAI] parseAssistantResponse: type=action but action is null!', {
          messagePreview: sanitizedMessage.substring(0, 100),
          looksLikeProposal: proposal.isProposal,
          likelyActionType: proposal.likelyActionType,
        });
      }
      
      // CRITICAL: If type is 'message' but message looks like a proposal, log warning
      if (type === 'message') {
        const proposal = looksLikeActionProposal(sanitizedMessage);
        if (proposal.isProposal) {
          console.warn('[HerculesAI] parseAssistantResponse: Message looks like proposal but type=message!', {
            messagePreview: sanitizedMessage.substring(0, 100),
            likelyActionType: proposal.likelyActionType,
          });
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
        const type = parsed.type === 'action' ? 'action' : 'message';
        const sanitizedMessage = sanitizeForDisplay(parsed.message);
        let action = parsed.action ?? null;
        
        // Validate action
        if (action && (!action.actionType || !action.payload)) {
          console.warn('[HerculesAI] parseAssistantResponse (extracted): Action missing required fields');
          action = null;
        }
        
        // Log warning if action expected but missing
        if (type === 'action' && !action) {
          console.warn('[HerculesAI] parseAssistantResponse (extracted): type=action but action is null!');
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
