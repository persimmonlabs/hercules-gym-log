-- Add unit preference columns to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unit_system text DEFAULT 'imperial',
ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'lbs',
ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'mi',
ADD COLUMN IF NOT EXISTS size_unit text DEFAULT 'in',
ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'light';

-- Add body metrics columns if they don't exist (referenced in userProfileStore.ts comments)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height_feet integer,
ADD COLUMN IF NOT EXISTS height_inches integer,
ADD COLUMN IF NOT EXISTS weight_lbs integer;

-- Update existing profiles that might have defaulted to 'system' to 'light'
UPDATE public.profiles 
SET theme_preference = 'light' 
WHERE theme_preference = 'system';
