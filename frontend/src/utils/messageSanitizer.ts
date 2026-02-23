/**
 * Message Sanitizer
 * CRITICAL: Ensures NO JSON or raw formatting is ever shown to users.
 * This is the frontend's last line of defense against malformed AI responses.
 */

/**
 * Extracts a JSON object from content that may contain text before/after the JSON.
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
 * This function MUST be called on ALL message content before display.
 * 
 * It handles:
 * 1. Pure JSON responses - extracts the "message" field
 * 2. Mixed content (text + JSON) - extracts the "message" field
 * 3. Escaped newlines - converts to actual newlines
 * 4. Malformed JSON - strips JSON-like patterns
 * 
 * @param content - The raw message content
 * @returns Clean, human-readable text
 */
export const sanitizeMessageForDisplay = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const trimmed = content.trim();
  
  // Check if content looks like JSON
  const looksLikeJson = (
    trimmed.startsWith('{') ||
    trimmed.includes('{"type"') ||
    trimmed.includes('{ "type"') ||
    trimmed.includes('"message":') ||
    trimmed.includes('"action":') ||
    trimmed.includes('"actionType":')
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
  } catch {
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
    } catch {
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
  // The regex above requires a closing quote, which won't exist if the LLM
  // hit max_tokens. Parse character-by-character to salvage whatever message
  // text we can extract from the incomplete JSON string value.
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

  // ABSOLUTE LAST RESORT: Remove all JSON-like content
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
