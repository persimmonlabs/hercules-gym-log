import type { SupabaseClient } from '@supabase/supabase-js';

import { KB_TOP_K } from './constants.ts';

export interface KnowledgeBaseChunk {
  id: string;
  source: string;
  content: string;
  metadata: Record<string, unknown> | null;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'your',
  'about',
  'what',
  'when',
  'where',
  'why',
  'how',
  'can',
  'should',
  'will',
  'would',
  'into',
  'into',
  'than',
  'then',
  'them',
  'they',
  'their',
  'have',
  'has',
  'had',
  'are',
  'is',
  'was',
  'were',
  'been',
  'not',
  'just',
  'like',
  'need',
  'help',
  'also',
  'does',
  'did',
  'you',
]);

const sanitizeTerm = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const extractKeywords = (query: string, max = 6): string[] => {
  const words = query.split(/\s+/).map(sanitizeTerm).filter(Boolean);
  const unique = new Set<string>();

  words.forEach((word) => {
    if (word.length < 4) return;
    if (STOP_WORDS.has(word)) return;
    unique.add(word);
  });

  return Array.from(unique).slice(0, max);
};

export const searchKnowledgeBase = async (
  supabase: SupabaseClient,
  query: string,
  limit = KB_TOP_K
): Promise<KnowledgeBaseChunk[]> => {
  const terms = extractKeywords(query);
  if (terms.length === 0) return [];

  const filter = terms.map((term) => `content.ilike.%${term}%`).join(',');

  const { data, error } = await supabase
    .from('ai_kb_docs')
    .select('id, source, content, metadata')
    .or(filter)
    .limit(limit);

  if (error) {
    console.warn('[HerculesAI] Knowledge base search failed', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id as string,
    source: row.source as string,
    content: row.content as string,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
  }));
};
