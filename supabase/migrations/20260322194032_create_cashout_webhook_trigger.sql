/*
  # Create Cashout Webhook Trigger

  1. New Functions
    - `trigger_cashout_notification` - PL/pgSQL function that calls the Edge Function webhook when a cashout request is inserted
  
  2. New Triggers
    - `on_cashout_request_created` - Trigger that fires after INSERT on cashout_requests table
  
  This sets up automatic email notifications when users request cash outs.
*/

-- Create function to trigger cashout notification
CREATE OR REPLACE FUNCTION trigger_cashout_notification()
RETURNS TRIGGER AS $$
DECLARE
  request_json jsonb;
BEGIN
  request_json := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'schema', TG_TABLE_SCHEMA
  );

  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/cashout-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := request_json
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_cashout_request_created ON cashout_requests;
CREATE TRIGGER on_cashout_request_created
  AFTER INSERT ON cashout_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cashout_notification();
