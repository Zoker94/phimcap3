-- Add visibility column to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON public.videos(visibility);

-- Update RLS policy to respect visibility
DROP POLICY IF EXISTS "Videos are viewable by everyone or owner" ON public.videos;
CREATE POLICY "Videos are viewable based on visibility and status" 
ON public.videos 
FOR SELECT 
USING (
  -- Admins and moderators can see all
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  -- Owner can always see their own videos
  OR auth.uid() = uploaded_by
  -- Public approved videos are visible to everyone
  OR (status = 'approved' AND visibility = 'public')
);