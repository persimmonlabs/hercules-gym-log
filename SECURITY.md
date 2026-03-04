# Security Guidelines for Hercules

## 🔐 Environment Variables & API Keys

### Overview
This project uses environment variables to protect sensitive credentials. **Never commit API keys or secrets to Git.**

---

## 📁 Environment File Structure

### Root Directory (`.env`)
Used by:
- Node.js scripts (`scripts/ingest-hercules-ai-kb.js`)
- Backend utilities
- Supabase Edge Functions (deployed separately)

**Required Variables:**
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

**Optional Variables:**
```bash
# Alternative naming (scripts support both)
HERCULES_SUPABASE_URL=https://your-project-id.supabase.co
HERCULES_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Development mode for AI (bypasses rate limits)
HERCULES_ENV=development
```

### Frontend Directory (`frontend/.env`)
Used by:
- Expo/React Native app
- Metro bundler

**Required Variables:**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important Notes:**
- `EXPO_PUBLIC_` prefix makes variables available in client-side code
- Anon key is safe to expose - protected by Supabase Row Level Security (RLS)
- Service role key should **NEVER** be in frontend `.env`

---

## 🚀 Setup Instructions

### First Time Setup

1. **Copy example files:**
   ```bash
   # Root directory
   cp .env.example .env
   
   # Frontend directory
   cd frontend
   cp .env.example .env
   ```

2. **Get Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Navigate to Settings → API
   - Copy:
     - Project URL → `SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
     - `anon` `public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Get OpenRouter API key:**
   - Go to [OpenRouter](https://openrouter.ai/keys)
   - Create an API key
   - Copy to `OPENROUTER_API_KEY`

4. **Fill in both `.env` files** with your actual values

---

## 🛡️ Security Best Practices

### ✅ DO:
- Use `.env` files for all sensitive credentials
- Keep `.env` files in `.gitignore`
- Use `.env.example` files with placeholder values for documentation
- Rotate API keys if they're ever exposed
- Use different Supabase projects for development/production
- Review `.env.example` files before committing

### ❌ DON'T:
- Commit `.env` files to Git
- Hardcode API keys in source code
- Share API keys in chat/email/Slack
- Use production keys in development
- Put service role keys in frontend code
- Commit files with real credentials (even in comments)

---

## 🔍 What's Protected

### Files Excluded from Git (`.gitignore`):
```
.env
.env.local
.env.*.local
.env.development
.env.production
```

Both root and `frontend/` directories have `.gitignore` configured.

### Sensitive Keys in This Project:
1. **SUPABASE_SERVICE_ROLE_KEY** - Full database access (admin)
2. **OPENROUTER_API_KEY** - AI API access (costs money)
3. **EXPO_PUBLIC_SUPABASE_ANON_KEY** - Client database access (RLS protected)

---

## 🚨 If Keys Are Exposed

### Immediate Actions:
1. **Rotate the exposed key immediately:**
   - Supabase: Dashboard → Settings → API → Reset key
   - OpenRouter: Delete old key, create new one

2. **Update all `.env` files** with new keys

3. **Redeploy edge functions** if service role key was exposed:
   ```bash
   npx supabase functions deploy hercules-ai
   ```

4. **Clear Git history** if committed (requires force push):
   ```bash
   # Use git-filter-repo or BFG Repo-Cleaner
   # Then force push to remote
   ```

5. **Monitor usage** for unauthorized access

---

## 📝 Edge Function Secrets

Supabase Edge Functions use **Supabase Secrets** (not `.env` files).

### Required Secrets for `hercules-ai` function:
```bash
OPENROUTER_API_KEY=your-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### Set secrets via Supabase CLI:
```bash
npx supabase secrets set OPENROUTER_API_KEY=your-key-here
npx supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npx supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

### List current secrets:
```bash
npx supabase secrets list
```

---

## 🧪 Development vs Production

### Development:
- Use separate Supabase project for dev
- Set `HERCULES_ENV=development` to bypass AI rate limits
- Test with lower-cost OpenRouter models if needed

### Production:
- Use production Supabase project
- Remove `HERCULES_ENV` variable (defaults to production)
- Monitor OpenRouter usage/costs
- Enable Supabase RLS policies

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [OpenRouter API Documentation](https://openrouter.ai/docs)

---

## ✅ Security Checklist

Before committing code:
- [ ] No hardcoded API keys in source files
- [ ] `.env` files are in `.gitignore`
- [ ] `.env.example` files have placeholder values only
- [ ] No real credentials in comments or documentation
- [ ] Edge function secrets are set via Supabase CLI
- [ ] Production and development use separate credentials

Before deploying:
- [ ] All required environment variables are set
- [ ] Edge function secrets are configured
- [ ] Supabase RLS policies are enabled
- [ ] API keys are rotated from development
- [ ] Usage monitoring is enabled

---

**Last Updated:** March 2026
