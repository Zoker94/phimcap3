-- Create comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create comment reactions table (like/dislike)
CREATE TABLE public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Anyone can view comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" ON public.comments
    FOR DELETE TO authenticated 
    USING (public.has_role(auth.uid(), 'admin'));

-- Comment reactions policies
CREATE POLICY "Anyone can view reactions" ON public.comment_reactions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their reactions" ON public.comment_reactions
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create trigger to update comment counts when reactions change
CREATE OR REPLACE FUNCTION public.update_comment_reaction_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        -- Handle changing reaction type
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

CREATE TRIGGER on_comment_reaction_change
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_comment_reaction_counts();

-- Update handle_new_user to set first user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Insert profile
    INSERT INTO public.profiles (user_id, username)
    VALUES (NEW.id, NEW.email);
    
    -- Check if this is the first user
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- If first user, make them admin
    IF user_count = 1 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add trigger for comments updated_at
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();