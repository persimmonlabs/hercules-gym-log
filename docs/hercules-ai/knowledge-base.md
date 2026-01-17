# Hercules AI — Knowledge Base

## Purpose
Provide reliable, app-consistent knowledge for:
- App feature explanations
- Workout guidance based on Hercules data
- Exercise mechanics tied to in-app catalog

## Sources (Planned)
- Internal docs (new): feature guides, analytics definitions, navigation.
- Local JSON data: exercises, premade workouts/plans, muscle hierarchy.

## Storage
- Supabase `ai_kb_docs` table using pgvector embeddings.
- Chunked docs (300–800 tokens) with metadata tags.

## Retrieval
- For each user query: semantic search + tag filters.
- Return top K chunks to the LLM context.

## Update Flow
- Script to re-ingest docs on change.
- Keep source → chunk mapping for traceability.
