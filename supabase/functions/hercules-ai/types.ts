export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCallFunction {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_calls?: ToolCallFunction[];
  tool_call_id?: string;
}
