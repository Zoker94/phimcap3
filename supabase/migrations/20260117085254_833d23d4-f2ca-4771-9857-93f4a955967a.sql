-- Create tags table for SEO keywords
CREATE TABLE public.tags (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

-- Create video_tags junction table
CREATE TABLE public.video_tags (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(video_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Anyone can view tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tags" 
ON public.tags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Video_tags policies
CREATE POLICY "Anyone can view video tags" 
ON public.video_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage video tags" 
ON public.video_tags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_tags_slug ON public.tags(slug);
CREATE INDEX idx_tags_name ON public.tags(name);
CREATE INDEX idx_video_tags_video_id ON public.video_tags(video_id);
CREATE INDEX idx_video_tags_tag_id ON public.video_tags(tag_id);