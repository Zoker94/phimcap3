-- Add columns for user uploads to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON public.videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

-- Update RLS policies to allow users to insert their own videos
CREATE POLICY "Users can insert their own videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

-- Users can view approved videos or their own videos
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
CREATE POLICY "Videos are viewable by everyone or owner" 
ON public.videos 
FOR SELECT 
USING (status = 'approved' OR auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Users can update their own pending videos
CREATE POLICY "Users can update their own pending videos" 
ON public.videos 
FOR UPDATE 
USING (auth.uid() = uploaded_by AND status = 'pending');

-- Users can delete their own pending videos
CREATE POLICY "Users can delete their own pending videos" 
ON public.videos 
FOR DELETE 
USING (auth.uid() = uploaded_by AND status = 'pending');