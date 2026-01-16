-- Create site_settings table for admin controls
CREATE TABLE public.site_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Insert default setting for deposit page (enabled by default)
INSERT INTO public.site_settings (key, value) VALUES ('deposit_enabled', 'true');