-- Create the table to store the Algolia sync queue
CREATE TABLE IF NOT EXISTS algolia_sync_queue (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function that creates new records in the queue
CREATE OR REPLACE FUNCTION queue_algolia_sync() 
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
DECLARE
  payload jsonb;
BEGIN 
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE
                 WHEN (TG_OP = 'DELETE') THEN row_to_json(OLD)
                 ELSE row_to_json(NEW)
               END
  );

  INSERT INTO algolia_sync_queue (payload)
  VALUES (payload);

  RETURN NULL;
END;
$$;


-- Trigger to queue Algolia sync
CREATE OR REPLACE TRIGGER algolia_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON nature_places FOR EACH ROW 
EXECUTE FUNCTION queue_algolia_sync();

-- Enable pgcron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 5 minutes
SELECT
  cron.schedule(
    'algolia-sync-every-5min',
    '*/5 * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://davnanxnnkphlniazuwp.supabase.co/functions/v1/process_algolia_index_queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdm5hbnhubmtwaGxuaWF6dXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA0NzA2OTAsImV4cCI6MjAzNjA0NjY5MH0.6gSEDsDYNHqWNEivPM0xT4LHsAL3XEdbKZWDUooRcgQ"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
      ) as request_id;
$$
);