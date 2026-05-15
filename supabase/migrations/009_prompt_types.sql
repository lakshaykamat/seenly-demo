-- Phase 2, Step 9: Prompt types
-- Add query_type to ai_results so each row records which type of question it was.

ALTER TABLE public.ai_results
  ADD COLUMN query_type text
    CHECK (query_type IN ('discovery', 'comparison', 'alternatives', 'educational', 'user_added'));
