-- Create the table to store the Algolia sync queue
CREATE TABLE IF NOT EXISTS algolia_sync_queue (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempted_at TIMESTAMP,
  attempt_count INT DEFAULT 0,
  processed_at TIMESTAMP
);

-- Create an index on the status column
CREATE INDEX idx_algolia_sync_queue_status ON algolia_sync_queue(status);

-- Function that creates new records in the queue
CREATE
OR REPLACE FUNCTION queue_algolia_sync() RETURNS TRIGGER AS $ $ DECLARE payload JSONB;

BEGIN payload = jsonb_build_object(
  'operation',
  TG_OP,
  'table',
  TG_TABLE_NAME,
  'schema',
  TG_TABLE_SCHEMA,
  'records',
  CASE
    WHEN (TG_OP = 'DELETE') THEN jsonb_agg(row_to_json(OLD))
    ELSE jsonb_agg(row_to_json(NEW))
  END
);

INSERT INTO
  algolia_sync_queue (payload)
VALUES
  (payload);

RETURN NULL;

END;

$ $ LANGUAGE plpgsql;

-- Trigger to queue Algolia sync
CREATE TRIGGER algolia_sync_trigger
AFTER
INSERT
  OR
UPDATE
  OR DELETE ON places FOR EACH STATEMENT EXECUTE FUNCTION queue_algolia_sync();

-- Enable pgcron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 5 minutes
SELECT
  cron.schedule(
    'algolia-sync-every-5min',
    '*/5 * * * *',
    $ $
    SELECT
      net.http_post(
        url := 'https://[PROJECT_REF].supabase.co/functions/v1/algolia-sync',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'
      ) AS request_id;

$ $
);