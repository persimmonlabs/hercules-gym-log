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

export const parseAssistantResponse = (content: string): ParsedAssistantResponse => {
  try {
    const parsed = JSON.parse(content) as {
      type?: string;
      message?: string;
      action?: ActionProposal | null;
    };

    if (parsed?.type && parsed?.message) {
      const type = parsed.type === 'action' ? 'action' : 'message';
      return {
        type,
        message: parsed.message,
        action: parsed.action ?? null,
        raw: content,
      };
    }
  } catch (_) {
    // fall through to plain text
  }

  return {
    type: 'message',
    message: content,
    action: null,
    raw: content,
  };
};
