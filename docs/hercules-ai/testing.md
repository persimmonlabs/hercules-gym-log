# Hercules AI — Testing & QA

## Unit Tests
- Context builder (no cross-user leakage).
- Muscle weighting validation (sum to 1.000, leaf nodes only).
- Usage limit calculations and reset.

## Integration Tests
- Chat API auth + premium check.
- KB retrieval + context injection.
- Action confirm → execute → DB write.

## Security Tests
- RLS enforcement on AI tables.
- Ensure AI cannot read other users’ rows.

## Manual QA
- Premium user can use chat; free user is blocked.
- Action proposals require confirmation.
- Limit reached behavior shows clear UI.
- Disclaimer always visible.
