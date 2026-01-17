-- =============================================
-- DATABASE SCHEMA EXPORT
-- Generated: 2026-01-17
-- =============================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');
CREATE TYPE public.membership_status AS ENUM ('free', 'vip', 'premium');

-- =============================================
-- TABLES
-- =============================================

-- Table: advertisements
CREATE TABLE public.advertisements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    link_url TEXT NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    position TEXT NOT NULL DEFAULT 'sidebar'::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Table: categories
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    slug TEXT NOT NULL,
    name TEXT NOT NULL
);

-- Table: chat_messages
CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    avatar_url TEXT,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: comment_reactions
CREATE TABLE public.comment_reactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    comment_id UUID NOT NULL,
    reaction_type TEXT NOT NULL
);

-- Table: comments
CREATE TABLE public.comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    content TEXT NOT NULL,
    video_id UUID NOT NULL
);

-- Table: notifications
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    type TEXT DEFAULT 'info'::text,
    title TEXT NOT NULL
);

-- Table: profiles
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    membership_status membership_status DEFAULT 'free'::membership_status,
    user_id UUID NOT NULL UNIQUE,
    balance NUMERIC DEFAULT 0,
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    vip_expires_at TIMESTAMP WITH TIME ZONE,
    date_of_birth DATE,
    display_id SERIAL,
    username TEXT,
    avatar_url TEXT
);

-- Table: site_settings
CREATE TABLE public.site_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
);

-- Table: user_roles
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role app_role NOT NULL
);

-- Table: videos
CREATE TABLE public.videos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    video_type TEXT DEFAULT 'bunny'::text,
    duration TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_vip BOOLEAN DEFAULT false,
    category_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT NOT NULL
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Advertisements policies
CREATE POLICY "Admins can manage advertisements" ON public.advertisements
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active advertisements" ON public.advertisements
    FOR SELECT USING (is_active = true);

-- Categories policies
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (true);

-- Chat messages policies
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON public.chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Comment reactions policies
CREATE POLICY "Anyone can view reactions" ON public.comment_reactions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their reactions" ON public.comment_reactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Admins can delete any comment" ON public.comments
    FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Admins can manage notifications" ON public.notifications
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active notifications" ON public.notifications
    FOR SELECT USING ((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())));

-- Profiles policies
CREATE POLICY "Admins can delete any profile" ON public.profiles
    FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

-- Site settings policies
CREATE POLICY "Admins can manage settings" ON public.site_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view settings" ON public.site_settings
    FOR SELECT USING (true);

-- User roles policies
CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Videos policies
CREATE POLICY "Admins can manage videos" ON public.videos
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view all videos" ON public.videos
    FOR SELECT USING (true);

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Function: update_comment_reaction_counts
CREATE OR REPLACE FUNCTION public.update_comment_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.reaction_type = 'like' THEN
            UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE public.comments SET dislikes_count = dislikes_count + 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.reaction_type = 'like' THEN
            UPDATE public.comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
        ELSE
            UPDATE public.comments SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.reaction_type = 'like' THEN
            UPDATE public.comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
        ELSE
            UPDATE public.comments SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = OLD.comment_id;
        END IF;
        IF NEW.reaction_type = 'like' THEN
            UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE public.comments SET dislikes_count = dislikes_count + 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_count INTEGER;
BEGIN
    INSERT INTO public.profiles (user_id, username)
    VALUES (NEW.id, NEW.email);
    
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    IF user_count = 1 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    END IF;
    
    RETURN NEW;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for updating updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating updated_at on comments
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating updated_at on videos
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating updated_at on site_settings
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating updated_at on advertisements
CREATE TRIGGER update_advertisements_updated_at
    BEFORE UPDATE ON public.advertisements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for comment reactions count
CREATE TRIGGER update_comment_reactions_count
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_comment_reaction_counts();

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('advertisements', 'advertisements', true);

-- =============================================
-- END OF SCHEMA EXPORT
-- =============================================
