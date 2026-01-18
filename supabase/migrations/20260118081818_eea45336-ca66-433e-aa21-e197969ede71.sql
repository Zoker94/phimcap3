-- Add visibility column to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- Update existing videos to have public visibility
UPDATE public.videos 
SET visibility = 'public' 
WHERE visibility IS NULL;