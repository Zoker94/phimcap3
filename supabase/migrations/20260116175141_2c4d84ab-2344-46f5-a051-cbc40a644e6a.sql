-- Add vip_expires_at column to profiles
ALTER TABLE public.profiles 
ADD COLUMN vip_expires_at timestamp with time zone DEFAULT NULL;

-- Update RLS policy on videos to allow everyone to see all videos (but playback is controlled in UI)
DROP POLICY IF EXISTS "Anyone can view non-vip videos" ON public.videos;
DROP POLICY IF EXISTS "VIP users can view VIP videos" ON public.videos;

-- Allow anyone to view all videos (metadata)
CREATE POLICY "Anyone can view all videos" 
ON public.videos 
FOR SELECT 
USING (true);