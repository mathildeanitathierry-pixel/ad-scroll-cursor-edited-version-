-- Add revolut_id column to user_stats table
-- Run this in your Supabase SQL Editor to apply the migration

ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS revolut_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.user_stats.revolut_id IS 'User Revolut ID/number for manual money transfers';

