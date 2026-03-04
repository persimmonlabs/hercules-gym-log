# Hercules - Development Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- OpenRouter account (for AI features)

---

## 📦 Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd Hercules

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

#### Root Directory Setup
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENROUTER_API_KEY
```

#### Frontend Directory Setup
```bash
cd frontend

# Copy the example file
cp .env.example .env

# Edit .env and add your credentials:
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
```

**Where to get credentials:**
- **Supabase:** [Dashboard](https://app.supabase.com) → Your Project → Settings → API
- **OpenRouter:** [API Keys](https://openrouter.ai/keys)

See [SECURITY.md](./SECURITY.md) for detailed credential setup instructions.

---

## 🗄️ Database Setup

### 1. Run Migrations

Execute the SQL migration files in your Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard → SQL Editor
# Run these files in order:

frontend/supabase_schema.sql
frontend/add_missing_profile_columns.sql
frontend/add_source_to_workout_templates.sql
frontend/add_rotation_state_to_plans.sql
frontend/custom_exercises_migration.sql
supabase/ai_credits_migration.sql
supabase/cardio_goals_migration.sql
supabase/feedback_table.sql
```

### 2. Ingest AI Knowledge Base

```bash
# From root directory
node scripts/ingest-hercules-ai-kb.js
```

This populates the `ai_kb_docs` table with documentation for Hercules AI.

---

## 🔧 Supabase Edge Functions

### Configure Secrets

```bash
# Set required secrets for the hercules-ai edge function
npx supabase secrets set OPENROUTER_API_KEY=your-key-here
npx supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npx supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

### Deploy Edge Function

```bash
# Deploy the Hercules AI function
npx supabase functions deploy hercules-ai

# View logs
npx supabase functions logs hercules-ai
```

---

## 📱 Running the App

### Development Server

```bash
cd frontend

# Start Expo development server
npm start
# or
npx expo start
```

### Platform-Specific Commands

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

---

## 🏗️ Building for Production

### EAS Build (Expo Application Services)

```bash
cd frontend

# Development build
eas build --profile development --platform android
eas build --profile development --platform ios

# Production build
eas build --profile production --platform android
eas build --profile production --platform ios
```

Build profiles are defined in `frontend/eas.json`.

---

## 🧪 Development Tips

### Enable AI Development Mode

To bypass AI rate limits and credit checks during development:

```bash
# In root .env file
HERCULES_ENV=development
```

Then redeploy the edge function:
```bash
npx supabase functions deploy hercules-ai
```

### Clear Expo Cache

If you encounter build issues:

```bash
cd frontend
npx expo start --clear
```

### Reset Project

```bash
cd frontend
npm run reset-project
```

This moves starter code to `app-example/` directory.

---

## 📂 Project Structure

```
Hercules/
├── .env                          # Root environment variables
├── .env.example                  # Root env template
├── frontend/
│   ├── .env                      # Frontend environment variables
│   ├── .env.example              # Frontend env template
│   ├── app/                      # Expo Router screens
│   │   ├── (tabs)/               # Tab navigation
│   │   ├── auth/                 # Authentication
│   │   └── modals/               # Modal screens
│   ├── src/
│   │   ├── components/           # UI components (atomic design)
│   │   ├── store/                # Zustand state stores
│   │   ├── lib/                  # Supabase client
│   │   ├── services/             # API services
│   │   └── utils/                # Utilities
│   └── scripts/                  # Build scripts
├── supabase/
│   ├── functions/
│   │   └── hercules-ai/          # AI edge function
│   └── *.sql                     # Database migrations
├── scripts/
│   └── ingest-hercules-ai-kb.js  # KB ingestion script
└── docs/                         # Documentation
```

---

## 🔒 Security Reminders

- **Never commit `.env` files** - they're in `.gitignore`
- **Use `.env.example` files** for documentation
- **Rotate keys** if ever exposed
- **Use separate projects** for dev/production
- See [SECURITY.md](./SECURITY.md) for complete security guidelines

---

## 📚 Additional Documentation

- [AGENTS.md](./AGENTS.md) - AI agent guidance and architecture
- [SECURITY.md](./SECURITY.md) - Security best practices
- [frontend/README.md](./frontend/README.md) - Frontend-specific docs
- [docs/hercules-ai/](./docs/hercules-ai/) - AI feature documentation

---

## 🐛 Troubleshooting

### "Missing environment variable" errors
- Verify `.env` files exist in both root and `frontend/` directories
- Check that all required variables are set (see `.env.example`)
- Restart Metro bundler after changing `.env` files

### Edge function deployment fails
- Verify Supabase CLI is installed: `npx supabase --version`
- Check that secrets are set: `npx supabase secrets list`
- Ensure you're logged in: `npx supabase login`

### Database connection issues
- Verify Supabase URL and keys are correct
- Check that RLS policies are properly configured
- Ensure migrations have been run

---

## 🤝 Contributing

Before submitting code:
1. Run linter: `cd frontend && npm run lint`
2. Verify no hardcoded credentials
3. Update `.env.example` if adding new variables
4. Test with fresh `.env` from `.env.example`

---

**Need Help?** Check the documentation in `/docs` or review existing issues.
