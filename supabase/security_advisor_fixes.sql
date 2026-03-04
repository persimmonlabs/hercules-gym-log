-- =============================================================================
-- SECURITY ADVISOR FIXES
-- Run this in Supabase SQL Editor to resolve all 4 warnings
-- =============================================================================

-- ============================================================================
-- FIX 1: handle_new_user — mutable search_path
-- Adding SET search_path = '' prevents search_path hijacking attacks
-- ============================================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- FIX 2: update_updated_at_column — mutable search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ============================================================================
-- FIX 3: Move vector extension out of public schema
-- Creates an 'extensions' schema and moves the extension there
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
