# Hercules AI — Data Model (Draft)

## Tables (Proposed)
1. **ai_chat_sessions**
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users)
   - title (text)
   - created_at, updated_at (timestamptz)

2. **ai_chat_messages**
   - id (uuid, PK)
   - session_id (uuid, FK → ai_chat_sessions)
   - user_id (uuid, FK → auth.users)
   - role (user | assistant | system | tool)
   - content (text)
   - token_count (int)
   - metadata (jsonb)
   - created_at (timestamptz)

3. **ai_action_requests**
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users)
   - session_id (uuid, FK → ai_chat_sessions)
   - action_type (text)
   - payload (jsonb)
   - status (pending | approved | rejected | executed | failed)
   - error_message (text)
   - created_at, updated_at (timestamptz)

4. **ai_usage**
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users)
   - period_start, period_end (date)
   - tokens_used (int)
   - messages_used (int)
   - cost_estimate (numeric)
   - updated_at (timestamptz)

5. **ai_profile**
   - user_id (uuid, PK → auth.users)
   - goals (text[] or jsonb)
   - experience_level (text)
   - equipment (text[])
   - time_availability (text)
   - injuries (text)
   - preferences (jsonb)
   - created_at, updated_at (timestamptz)

6. **ai_feedback**
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users)
   - message_id (uuid, FK → ai_chat_messages)
   - rating (-1 | 1)
   - comment (text)
   - created_at (timestamptz)

7. **ai_kb_docs** (knowledge base)
   - id (uuid, PK)
   - source (text)
   - chunk_index (int)
   - content (text)
   - embedding (vector)
   - metadata (jsonb)
   - created_at (timestamptz)

## RLS Policy Summary
- User-scoped tables: only `auth.uid() = user_id` can read/write.
- `ai_kb_docs`: service-role read only (no direct user access).

## Indexing (Draft)
- session_id + created_at for message ordering.
- user_id + status for action requests.
- ivfflat index for `ai_kb_docs.embedding`.

## Notes
- Enforce last 50 messages per session in backend.
- `ai_usage` uses a weekly period for caps.
- Exact SQL will be stored in `supabase/hercules_ai_schema.sql`.
