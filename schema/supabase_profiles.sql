-- Supabase Profiles Table Migration
-- This migration creates the profiles table and sets up RLS policies

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  school_id UUID,
  school_code_locked BOOLEAN DEFAULT FALSE,
  grade TEXT,
  class_name TEXT,
  attendance_number INTEGER,
  interests TEXT[] NOT NULL DEFAULT '{}',
  theme TEXT,
  question TEXT,
  hypothesis TEXT,
  first_ai_tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE,
  first_ai_tutorial_completed_at TIMESTAMPTZ,
  legacy_user_id INTEGER, -- For migration from old system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_code_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS attendance_number INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hypothesis TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_ai_tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_ai_tutorial_completed_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_user_id ON public.profiles(legacy_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON public.profiles;

-- Create RLS policies
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role can do everything" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration script for existing users table
-- This can be run to migrate data from the old users table
/*
INSERT INTO public.profiles (email, username, legacy_user_id, created_at)
SELECT 
  LOWER(username) || '@tanqmate.local' as email, -- Generate email if not exists
  username,
  id as legacy_user_id,
  created_at
FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.legacy_user_id = users.id
);
*/

-- Grant necessary permissions
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Add comments
COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON COLUMN public.profiles.id IS 'UUID from auth.users';
COMMENT ON COLUMN public.profiles.legacy_user_id IS 'ID from old users table for migration';
COMMENT ON COLUMN public.profiles.role IS 'User role: student, teacher, or admin';
COMMENT ON COLUMN public.profiles.school_code_locked IS 'Whether school assignment is locked after onboarding';
COMMENT ON COLUMN public.profiles.grade IS 'Student grade';
COMMENT ON COLUMN public.profiles.class_name IS 'Student class name';
COMMENT ON COLUMN public.profiles.attendance_number IS 'Student attendance number';
COMMENT ON COLUMN public.profiles.interests IS 'Student self-declared interest tags used as AI support context';
COMMENT ON COLUMN public.profiles.theme IS 'Inquiry theme used as AI student context';
COMMENT ON COLUMN public.profiles.question IS 'Inquiry question used as AI student context';
COMMENT ON COLUMN public.profiles.hypothesis IS 'Inquiry hypothesis used as AI student context';
COMMENT ON COLUMN public.profiles.first_ai_tutorial_completed IS 'Whether the student completed the required first AI chat tutorial';
COMMENT ON COLUMN public.profiles.first_ai_tutorial_completed_at IS 'Timestamp when the required first AI chat tutorial was completed';
