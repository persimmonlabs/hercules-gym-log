-- CUSTOM EXERCISES TABLE
-- User-created exercises that don't exist in the built-in exercise catalog
-- These exercises:
-- - Are user-specific (only visible to the user who created them)
-- - Can be used in workout sessions and plans
-- - Do NOT contribute to analytics/statistics
-- - Persist across app sessions

create table public.custom_exercises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  exercise_type text not null check (exercise_type in ('weight', 'cardio', 'bodyweight', 'assisted', 'reps_only', 'duration')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure unique exercise names per user
  unique(user_id, name)
);

-- RLS for Custom Exercises
alter table public.custom_exercises enable row level security;

create policy "Users can view own custom exercises."
  on custom_exercises for select
  using ( auth.uid() = user_id );

create policy "Users can insert own custom exercises."
  on custom_exercises for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own custom exercises."
  on custom_exercises for update
  using ( auth.uid() = user_id );

create policy "Users can delete own custom exercises."
  on custom_exercises for delete
  using ( auth.uid() = user_id );

-- Create index for faster lookups by user
create index custom_exercises_user_id_idx on public.custom_exercises(user_id);

-- Create index for name lookups
create index custom_exercises_name_idx on public.custom_exercises(user_id, name);
