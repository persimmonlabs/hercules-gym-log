-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  first_name text,
  last_name text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- PLANS TABLE (User Programs)
create table public.plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  metadata jsonb default '{}'::jsonb,
  schedule_type text check (schedule_type in ('weekly', 'rotation')),
  schedule_config jsonb default '{}'::jsonb,
  is_active boolean default false,
  source_id text, -- ID of premade plan if cloned
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Plans
alter table public.plans enable row level security;

create policy "Users can view own plans."
  on plans for select
  using ( auth.uid() = user_id );

create policy "Users can insert own plans."
  on plans for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own plans."
  on plans for update
  using ( auth.uid() = user_id );

create policy "Users can delete own plans."
  on plans for delete
  using ( auth.uid() = user_id );

-- PLAN WORKOUTS TABLE (Workouts within a plan)
create table public.plan_workouts (
  id uuid default uuid_generate_v4() primary key,
  plan_id uuid references public.plans(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null, -- Denormalized for easier RLS
  name text not null,
  exercises jsonb default '[]'::jsonb, -- Array of PlanExercise
  order_index integer default 0,
  source_workout_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Plan Workouts
alter table public.plan_workouts enable row level security;

create policy "Users can view own plan workouts."
  on plan_workouts for select
  using ( auth.uid() = user_id );

create policy "Users can insert own plan workouts."
  on plan_workouts for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own plan workouts."
  on plan_workouts for update
  using ( auth.uid() = user_id );

create policy "Users can delete own plan workouts."
  on plan_workouts for delete
  using ( auth.uid() = user_id );

-- WORKOUT SESSIONS TABLE (Completed workouts)
create table public.workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id uuid references public.plans(id) on delete set null,
  date timestamp with time zone not null,
  start_time bigint,
  end_time bigint,
  duration integer,
  exercises jsonb default '[]'::jsonb, -- Array of WorkoutExercise (with sets)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Workout Sessions
alter table public.workout_sessions enable row level security;

create policy "Users can view own workout sessions."
  on workout_sessions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own workout sessions."
  on workout_sessions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own workout sessions."
  on workout_sessions for update
  using ( auth.uid() = user_id );

create policy "Users can delete own workout sessions."
  on workout_sessions for delete
  using ( auth.uid() = user_id );

-- TRIGGER to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  first_name_val text;
  last_name_val text;
  full_name_val text;
begin
  -- Extract values from metadata
  first_name_val := new.raw_user_meta_data->>'first_name';
  last_name_val := new.raw_user_meta_data->>'last_name';
  
  -- Construct full name if not provided directly
  if new.raw_user_meta_data->>'full_name' is not null then
    full_name_val := new.raw_user_meta_data->>'full_name';
  else
    -- Concatenate with a space if both exist, or just use one
    full_name_val := trim(both ' ' from concat(first_name_val, ' ', last_name_val));
  end if;

  insert into public.profiles (id, email, first_name, last_name, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    first_name_val,
    last_name_val,
    full_name_val,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
