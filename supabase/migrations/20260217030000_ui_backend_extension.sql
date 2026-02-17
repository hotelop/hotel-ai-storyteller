BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Enum helpers
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider') THEN
    CREATE TYPE integration_provider AS ENUM (
      'tripadvisor',
      'google_business',
      'booking_com',
      'expedia',
      'facebook',
      'instagram',
      'whatsapp_business',
      'mailchimp'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
    CREATE TYPE integration_status AS ENUM (
      'connected',
      'pending',
      'disconnected',
      'error'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM (
      'pending',
      'urgent',
      'approved',
      'published',
      'discarded'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_sentiment') THEN
    CREATE TYPE review_sentiment AS ENUM (
      'positive',
      'negative',
      'neutral'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_response_status') THEN
    CREATE TYPE review_response_status AS ENUM (
      'draft',
      'approved',
      'published',
      'discarded'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_response_variant') THEN
    CREATE TYPE review_response_variant AS ENUM (
      'default',
      'formal',
      'apology'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_channel') THEN
    CREATE TYPE conversation_channel AS ENUM (
      'whatsapp',
      'email',
      'sms',
      'booking'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_status') THEN
    CREATE TYPE conversation_status AS ENUM (
      'open',
      'closed',
      'archived'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_sender') THEN
    CREATE TYPE message_sender AS ENUM (
      'guest',
      'ai',
      'staff',
      'system'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_delivery_status') THEN
    CREATE TYPE message_delivery_status AS ENUM (
      'queued',
      'sent',
      'failed',
      'read'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_platform') THEN
    CREATE TYPE social_platform AS ENUM (
      'instagram',
      'facebook',
      'linkedin',
      'twitter'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_post_status') THEN
    CREATE TYPE social_post_status AS ENUM (
      'draft',
      'scheduled',
      'publishing',
      'published',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM (
      'scheduled',
      'active',
      'paused',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_channel') THEN
    CREATE TYPE campaign_channel AS ENUM (
      'email',
      'social',
      'sms'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_key') THEN
    CREATE TYPE agent_key AS ENUM (
      'review_reply',
      'social_posting',
      'messaging',
      'campaign'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
    CREATE TYPE agent_status AS ENUM (
      'active',
      'paused',
      'error'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_priority') THEN
    CREATE TYPE agent_priority AS ENUM (
      'low',
      'medium',
      'high'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_task_status') THEN
    CREATE TYPE agent_task_status AS ENUM (
      'completed',
      'pending',
      'failed',
      'running'
    );
  END IF;
END $$;

-- Extend existing notification_type enum safely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'notification_type' AND e.enumlabel = 'new_review'
    ) THEN
      ALTER TYPE notification_type ADD VALUE 'new_review';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'notification_type' AND e.enumlabel = 'negative_review'
    ) THEN
      ALTER TYPE notification_type ADD VALUE 'negative_review';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'notification_type' AND e.enumlabel = 'guest_message'
    ) THEN
      ALTER TYPE notification_type ADD VALUE 'guest_message';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'notification_type' AND e.enumlabel = 'campaign_performance'
    ) THEN
      ALTER TYPE notification_type ADD VALUE 'campaign_performance';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'notification_type' AND e.enumlabel = 'ai_agent_activity'
    ) THEN
      ALTER TYPE notification_type ADD VALUE 'ai_agent_activity';
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Core multi-property extension
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  city TEXT,
  country TEXT,
  property_type TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency_code TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  default_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_brand_settings (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  tone_of_voice TEXT NOT NULL DEFAULT 'professional',
  key_selling_points TEXT[] NOT NULL DEFAULT '{}',
  signature_signoff TEXT,
  use_guest_names BOOLEAN NOT NULL DEFAULT TRUE,
  multilingual_responses BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS property_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  status integration_status NOT NULL DEFAULT 'disconnected',
  external_account_id TEXT,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, provider)
);

CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferred_language TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES property_integrations(id) ON DELETE SET NULL,
  external_booking_id TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  room_type TEXT,
  booking_status TEXT NOT NULL DEFAULT 'confirmed',
  total_amount NUMERIC(12,2),
  currency_code TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, integration_id, external_booking_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  channel conversation_channel NOT NULL,
  channel_thread_id TEXT,
  status conversation_status NOT NULL DEFAULT 'open',
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, channel, channel_thread_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender message_sender NOT NULL,
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_status message_delivery_status NOT NULL DEFAULT 'queued',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES property_integrations(id) ON DELETE SET NULL,
  external_review_id TEXT,
  platform integration_provider NOT NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL,
  status review_status NOT NULL DEFAULT 'pending',
  sentiment review_sentiment NOT NULL DEFAULT 'neutral',
  external_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, integration_id, external_review_id)
);

CREATE TABLE IF NOT EXISTS review_response_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  content TEXT NOT NULL,
  variant review_response_variant NOT NULL DEFAULT 'default',
  status review_response_status NOT NULL DEFAULT 'draft',
  generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(review_id, version_no)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status social_post_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_reach INTEGER,
  actual_reach INTEGER,
  engagement_rate NUMERIC(5,2),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_post_platforms (
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  PRIMARY KEY(post_id, platform)
);

CREATE TABLE IF NOT EXISTS social_post_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  asset_url TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'image',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_post_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  optimization_reason TEXT,
  generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(post_id, version_no)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status campaign_status NOT NULL DEFAULT 'scheduled',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  reach_total INTEGER NOT NULL DEFAULT 0,
  conversions_total INTEGER NOT NULL DEFAULT 0,
  revenue_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_channels (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel campaign_channel NOT NULL,
  PRIMARY KEY(campaign_id, channel)
);

CREATE TABLE IF NOT EXISTS campaign_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  preview_image_url TEXT,
  template_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  key agent_key NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status agent_status NOT NULL DEFAULT 'active',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  max_tasks_per_hour INTEGER NOT NULL DEFAULT 10,
  priority_level agent_priority NOT NULL DEFAULT 'medium',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  retry_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, key)
);

CREATE TABLE IF NOT EXISTS property_ai_settings (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  auto_approval_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_agent_task_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  status agent_task_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  response_time_ms INTEGER,
  time_saved_seconds INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_notification_preferences (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_reviews BOOLEAN NOT NULL DEFAULT TRUE,
  negative_reviews BOOLEAN NOT NULL DEFAULT TRUE,
  guest_messages BOOLEAN NOT NULL DEFAULT TRUE,
  campaign_performance BOOLEAN NOT NULL DEFAULT TRUE,
  ai_agent_activity BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(property_id, user_id)
);

CREATE TABLE IF NOT EXISTS property_metric_daily (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  revpar NUMERIC(10,2),
  occupancy_rate NUMERIC(5,2),
  avg_rating NUMERIC(4,2),
  response_time_minutes NUMERIC(10,2),
  total_revenue NUMERIC(14,2),
  ai_revenue_contribution NUMERIC(14,2),
  labor_cost_saved NUMERIC(14,2),
  revenue_attributed NUMERIC(14,2),
  time_saved_hours NUMERIC(10,2),
  roi_ratio NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(property_id, metric_date)
);

CREATE TABLE IF NOT EXISTS booking_channel_daily (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  channel_name TEXT NOT NULL,
  percentage NUMERIC(5,2),
  bookings_count INTEGER,
  revenue_amount NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(property_id, metric_date, channel_name)
);

-- ---------------------------------------------------------------------------
-- Extend notifications table
-- ---------------------------------------------------------------------------
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS account_id UUID,
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_account_id_fkey') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_property_id_fkey') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Updated-at trigger utility
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'properties',
    'property_integrations',
    'guests',
    'bookings',
    'conversations',
    'reviews',
    'social_posts',
    'campaigns',
    'campaign_templates',
    'ai_agents',
    'property_metric_daily',
    'booking_channel_daily'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = table_name || '_set_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill defaults (safe/idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO properties (account_id, name, timezone, currency_code, is_active)
SELECT a.id, a.name, 'UTC', 'USD', TRUE
FROM accounts a
WHERE a.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM properties p
    WHERE p.account_id = a.id
      AND p.deleted_at IS NULL
  );

WITH accepted_members AS (
  SELECT DISTINCT ON (tm.user_id)
    tm.user_id,
    tm.account_id
  FROM team_members tm
  WHERE tm.status = 'accepted'
    AND tm.deleted_at IS NULL
  ORDER BY tm.user_id, tm.joined_at NULLS LAST, tm.id
), member_defaults AS (
  SELECT
    am.user_id,
    am.account_id,
    (
      SELECT p.id
      FROM properties p
      WHERE p.account_id = am.account_id
        AND p.deleted_at IS NULL
      ORDER BY p.created_at ASC
      LIMIT 1
    ) AS property_id
  FROM accepted_members am
)
INSERT INTO user_preferences (
  user_id,
  default_account_id,
  default_property_id,
  theme,
  language,
  timezone
)
SELECT
  md.user_id,
  md.account_id,
  md.property_id,
  'light',
  'en',
  'UTC'
FROM member_defaults md
ON CONFLICT (user_id) DO UPDATE
SET
  default_account_id = COALESCE(user_preferences.default_account_id, EXCLUDED.default_account_id),
  default_property_id = COALESCE(user_preferences.default_property_id, EXCLUDED.default_property_id),
  updated_at = NOW();

INSERT INTO property_brand_settings (
  property_id,
  tone_of_voice,
  key_selling_points,
  signature_signoff,
  use_guest_names,
  multilingual_responses
)
SELECT
  p.id,
  'professional',
  '{}'::text[],
  p.name || ' Team',
  TRUE,
  FALSE
FROM properties p
WHERE NOT EXISTS (
  SELECT 1 FROM property_brand_settings bs WHERE bs.property_id = p.id
);

INSERT INTO property_ai_settings (property_id, auto_approval_mode)
SELECT p.id, FALSE
FROM properties p
WHERE NOT EXISTS (
  SELECT 1 FROM property_ai_settings pas WHERE pas.property_id = p.id
);

INSERT INTO ai_agents (
  property_id,
  key,
  name,
  description,
  status,
  enabled,
  auto_approve,
  max_tasks_per_hour,
  priority_level,
  notifications_enabled,
  retry_on_failure,
  max_retries
)
SELECT
  p.id,
  agent_spec.key::agent_key,
  agent_spec.name,
  agent_spec.description,
  'active'::agent_status,
  TRUE,
  agent_spec.auto_approve,
  agent_spec.max_tasks_per_hour,
  agent_spec.priority_level::agent_priority,
  TRUE,
  TRUE,
  3
FROM properties p
CROSS JOIN (
  VALUES
    ('review_reply', 'Review Reply Agent', 'Auto-generate personalized review responses', FALSE, 20, 'high'),
    ('social_posting', 'Social Posting Agent', 'Generate and schedule social media posts', TRUE, 10, 'medium'),
    ('messaging', 'Messaging Agent', 'Handle guest inquiries automatically', TRUE, 50, 'high'),
    ('campaign', 'Campaign Agent', 'Create and manage seasonal campaigns', FALSE, 5, 'low')
) AS agent_spec(key, name, description, auto_approve, max_tasks_per_hour, priority_level)
WHERE NOT EXISTS (
  SELECT 1
  FROM ai_agents aa
  WHERE aa.property_id = p.id
    AND aa.key = agent_spec.key::agent_key
);

INSERT INTO property_notification_preferences (
  property_id,
  user_id,
  new_reviews,
  negative_reviews,
  guest_messages,
  campaign_performance,
  ai_agent_activity
)
SELECT
  tm.account_property_id,
  tm.user_id,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  FALSE
FROM (
  SELECT DISTINCT
    team_members.user_id,
    (
      SELECT p.id
      FROM properties p
      WHERE p.account_id = team_members.account_id
      ORDER BY p.created_at ASC
      LIMIT 1
    ) AS account_property_id
  FROM team_members
  WHERE team_members.status = 'accepted'
    AND team_members.deleted_at IS NULL
) tm
WHERE tm.account_property_id IS NOT NULL
ON CONFLICT (property_id, user_id) DO NOTHING;

UPDATE notifications n
SET account_id = x.account_id
FROM (
  SELECT DISTINCT ON (tm.user_id)
    tm.user_id,
    tm.account_id
  FROM team_members tm
  WHERE tm.status = 'accepted'
    AND tm.deleted_at IS NULL
  ORDER BY tm.user_id, tm.joined_at NULLS LAST, tm.id
) x
WHERE n.user_id = x.user_id
  AND n.account_id IS NULL;

UPDATE notifications n
SET property_id = p.id
FROM properties p
WHERE n.account_id = p.account_id
  AND n.property_id IS NULL;

-- ---------------------------------------------------------------------------
-- Search and cursor indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_property_created
  ON notifications(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_account_active
  ON properties(account_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_property_reviewed_id
  ON reviews(property_id, reviewed_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_property_status
  ON reviews(property_id, status, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_search_tsv
  ON reviews
  USING GIN (to_tsvector('simple', coalesce(author_name, '') || ' ' || coalesce(title, '') || ' ' || coalesce(body, '')));
CREATE INDEX IF NOT EXISTS idx_reviews_search_trgm
  ON reviews
  USING GIN ((coalesce(author_name, '') || ' ' || coalesce(title, '') || ' ' || coalesce(body, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_guests_property_created
  ON guests(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_search_tsv
  ON guests
  USING GIN (to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(email, '')));
CREATE INDEX IF NOT EXISTS idx_guests_search_trgm
  ON guests
  USING GIN ((coalesce(full_name, '') || ' ' || coalesce(email, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_conversations_property_last_msg_id
  ON conversations(property_id, last_message_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_property_status
  ON conversations(property_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_search_tsv
  ON conversations
  USING GIN (to_tsvector('simple', coalesce(last_message_preview, '')));
CREATE INDEX IF NOT EXISTS idx_conversations_search_trgm
  ON conversations
  USING GIN ((coalesce(last_message_preview, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_created_id
  ON conversation_messages(conversation_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_property_sched_id
  ON social_posts(property_id, scheduled_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_social_posts_property_created_id
  ON social_posts(property_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_property_status
  ON social_posts(property_id, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_search_tsv
  ON social_posts
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));
CREATE INDEX IF NOT EXISTS idx_social_posts_search_trgm
  ON social_posts
  USING GIN ((coalesce(title, '') || ' ' || coalesce(content, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_campaigns_property_start_id
  ON campaigns(property_id, start_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_property_status
  ON campaigns(property_id, status, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_search_tsv
  ON campaigns
  USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_campaigns_search_trgm
  ON campaigns
  USING GIN ((coalesce(name, '') || ' ' || coalesce(description, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_agent_runs_property_started_id
  ON ai_agent_task_runs(property_id, started_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_property_status
  ON ai_agent_task_runs(property_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_started
  ON ai_agent_task_runs(agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_search_tsv
  ON ai_agent_task_runs
  USING GIN (to_tsvector('simple', coalesce(action, '') || ' ' || coalesce(details, '')));
CREATE INDEX IF NOT EXISTS idx_agent_runs_search_trgm
  ON ai_agent_task_runs
  USING GIN ((coalesce(action, '') || ' ' || coalesce(details, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_property_metrics_property_date
  ON property_metric_daily(property_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_booking_channel_daily_property_date
  ON booking_channel_daily(property_id, metric_date DESC);

COMMIT;
