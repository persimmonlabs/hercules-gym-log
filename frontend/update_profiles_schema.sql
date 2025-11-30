-- Run this script in your Supabase SQL Editor to update the profiles table and trigger

-- 1. Add separate name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Update the handle_new_user function to handle first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  first_name_val text;
  last_name_val text;
  full_name_val text;
BEGIN
  -- Extract values from metadata
  first_name_val := new.raw_user_meta_data->>'first_name';
  last_name_val := new.raw_user_meta_data->>'last_name';
  
  -- Construct full name if not provided directly
  IF new.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    full_name_val := new.raw_user_meta_data->>'full_name';
  ELSE
    -- Concatenate with a space if both exist, or just use one
    full_name_val := TRIM(BOTH ' ' FROM CONCAT(first_name_val, ' ', last_name_val));
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    first_name_val,
    last_name_val,
    full_name_val,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
