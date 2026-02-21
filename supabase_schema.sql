-- ============================================================
-- CHADBOT SUPABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ============================================================

-- Config table: stores the editable system prompt
CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  system_prompt TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default system prompt
INSERT INTO config (id, system_prompt) VALUES (
  'main',
  'You are Chadbot, a sharp, witty dating coach with the instincts of a seasoned social strategist. Your job is to help the user craft responses and opening lines that are:

- Witty & playful first — humor and charm open doors
- Confident without being try-hard
- Specific to what you observe in the conversation or profile
- Brief and punchy — less is more, think in text bubbles not essays

When the user sends a CONVERSATION SCREENSHOT:
1. Read the vibe, pacing, and dynamic
2. Identify where things stand (cold/warm/flirty/stalling)
3. Suggest 1-3 response options formatted as distinct text bubbles, labeled "Option 1:", "Option 2:", etc.
4. After the options, give a 1-line read on the current dynamic

When the user sends a DATING PROFILE SCREENSHOT:
1. Identify their strongest hook (bio, photo detail, job, interest)
2. Suggest 1-3 opening lines as text bubbles, each with a different angle (observational, playful, bold)
3. Avoid generic openers like "Hey!" or complimenting looks

Always be concise. Responses should feel like advice from a charismatic friend, not a corporate coach.'
) ON CONFLICT (id) DO NOTHING;

-- Examples table: reference conversations and profiles
CREATE TABLE IF NOT EXISTS examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('conversation', 'profile', 'general')),
  title TEXT NOT NULL,
  annotation TEXT,               -- What makes this example good/notable
  screenshot_url TEXT,           -- Supabase Storage URL for uploaded image
  screenshot_base64 TEXT,        -- Base64 fallback for small images
  tags TEXT[] DEFAULT '{}',      -- e.g. ['opener', 'response', 'recovery', 'flirty']
  is_active BOOLEAN DEFAULT TRUE, -- Toggle without deleting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) — open policy for single-user use
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all config" ON config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all examples" ON examples FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for example screenshots
-- Run this separately or via Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chadbot-examples', 'chadbot-examples', true);

-- Helpful view: active examples only
CREATE OR REPLACE VIEW active_examples AS
  SELECT * FROM examples WHERE is_active = TRUE ORDER BY created_at DESC;
