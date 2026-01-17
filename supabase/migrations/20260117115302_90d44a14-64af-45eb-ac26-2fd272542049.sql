-- Add vietsub and uncensored columns to videos table
ALTER TABLE public.videos 
ADD COLUMN is_vietsub boolean DEFAULT false,
ADD COLUMN is_uncensored boolean DEFAULT false;