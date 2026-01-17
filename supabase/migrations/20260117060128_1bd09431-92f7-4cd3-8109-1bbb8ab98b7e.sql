-- Add display_id column to profiles for easy identification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id SERIAL;

-- Create unique index on display_id
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_id_idx ON public.profiles(display_id);