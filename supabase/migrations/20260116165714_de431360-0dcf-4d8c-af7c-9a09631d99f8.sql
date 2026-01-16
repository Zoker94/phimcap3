-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create enum for membership status
CREATE TYPE public.membership_status AS ENUM ('free', 'vip');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT,
    avatar_url TEXT,
    balance DECIMAL(10,2) DEFAULT 0,
    membership_status membership_status DEFAULT 'free',
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create videos table
CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT NOT NULL,
    video_type TEXT DEFAULT 'bunny', -- 'bunny' or 'upload'
    category_id UUID REFERENCES public.categories(id),
    is_vip BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any profile" ON public.profiles
    FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Categories policies
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Videos policies
CREATE POLICY "Anyone can view non-vip videos" ON public.videos
    FOR SELECT USING (is_vip = false);

CREATE POLICY "VIP users can view VIP videos" ON public.videos
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND membership_status = 'vip'
        )
    );

CREATE POLICY "Admins can manage videos" ON public.videos
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, slug) VALUES
    ('Phim hành động', 'phim-hanh-dong'),
    ('Phim tình cảm', 'phim-tinh-cam'),
    ('Phim hài', 'phim-hai'),
    ('Phim kinh dị', 'phim-kinh-di'),
    ('Clip ngắn', 'clip-ngan');