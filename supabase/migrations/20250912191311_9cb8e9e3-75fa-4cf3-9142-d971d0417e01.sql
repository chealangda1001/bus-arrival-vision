-- Update voice preferences to use only valid OpenAI TTS voices
-- Valid voices: 'nova', 'shimmer', 'echo', 'onyx', 'fable', 'alloy', 'ash', 'sage', 'coral'

-- Update preferred_voice from invalid voices to valid ones
UPDATE voice_preferences 
SET preferred_voice = 'nova' 
WHERE preferred_voice IN ('cedar', 'marin');

-- Update auto_selected_voice from invalid voices to valid ones
UPDATE voice_preferences 
SET auto_selected_voice = 'nova' 
WHERE auto_selected_voice IN ('cedar', 'marin');

-- Update voice_candidates array to only include valid voices
UPDATE voice_preferences 
SET voice_candidates = '["nova", "shimmer", "echo", "onyx", "fable", "alloy", "ash", "sage", "coral"]'::json;