-- Update RLS policies to include manager role for admin-like access
-- Videos table
DROP POLICY IF EXISTS "Admins can manage videos" ON public.videos;
CREATE POLICY "Admins and managers can manage videos" 
ON public.videos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Categories table
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins and managers can manage categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Tags table
DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins and managers can manage tags" 
ON public.tags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Advertisements table
DROP POLICY IF EXISTS "Admins can manage advertisements" ON public.advertisements;
CREATE POLICY "Admins and managers can manage advertisements" 
ON public.advertisements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Notifications table
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins and managers can manage notifications" 
ON public.notifications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Site settings table
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins and managers can manage settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Video tags table
DROP POLICY IF EXISTS "Admins can manage video tags" ON public.video_tags;
CREATE POLICY "Admins and managers can manage video tags" 
ON public.video_tags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Profiles - allow managers to update profiles (for ban, balance, etc)
CREATE POLICY "Managers can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'manager'::app_role));

-- Comments - allow managers to delete comments
CREATE POLICY "Managers can delete any comment" 
ON public.comments 
FOR DELETE 
USING (has_role(auth.uid(), 'manager'::app_role));

-- User roles - only admins can manage roles (managers cannot) - keep existing policy
-- Allow managers to view all roles (for admin panel)
CREATE POLICY "Managers can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));