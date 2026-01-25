/**
 * Hercules AI Chat Types
 * Frontend type definitions for AI chat functionality
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  action?: ActionProposal | null;
}

export interface ActionProposal {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'dismissed';
}

export interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
}

export interface UsageInfo {
  tokensUsed: number;
  messagesUsed: number;
  tokensLimit: number;
  messagesLimit: number;
  periodEnd: string;
}

export interface ChatRequestBody {
  sessionId?: string;
  message?: string;
  title?: string;
  timezone?: string;
}

export interface ChatResponseBody {
  sessionId: string;
  message: string;
  action: { id: string; actionType: string; payload: Record<string, unknown> } | null;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  model: string;
}

export interface ActionDecisionRequestBody {
  actionRequestId: string;
  decision: 'approve' | 'reject';
}

export interface ActionDecisionResponseBody {
  actionRequestId: string;
  status: 'rejected' | 'executed';
  summary: string;
  data: Record<string, unknown> | null;
}

export interface UsageResponseBody {
  tokensUsed: number;
  messagesUsed: number;
  tokensLimit: number;
  messagesLimit: number;
  periodEnd: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string | null;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
