-- Migration: 20261106000026_add_leaderboard_winner_gift.sql
-- Description: Add optional winner_gift column to leaderboard_config with length validation constraint
-- Target: Yogneet Edu Top 200 Student Leaderboard Configuration

-- 1. Safely add winner_gift column
ALTER TABLE public.leaderboard_config
  ADD COLUMN IF NOT EXISTS winner_gift TEXT;

-- 2. Add validation constraint (max 120 characters, allowing null/empty)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_leaderboard_config_winner_gift_length'
  ) THEN
    ALTER TABLE public.leaderboard_config
      ADD CONSTRAINT check_leaderboard_config_winner_gift_length
      CHECK (winner_gift IS NULL OR char_length(winner_gift) <= 120);
  END IF;
END $$;

COMMENT ON COLUMN public.leaderboard_config.winner_gift IS 'Optional reward/gift announcement displayed to students on the Top 200 leaderboard (max 120 characters).';
