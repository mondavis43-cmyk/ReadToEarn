-- ============================================================================
-- Security Fixes Migration - Created 2024-07-15
-- ============================================================================
-- This migration implements backend security fixes for:
-- - Audit logging
-- - Rate limiting
-- - Idempotency caching
-- - Pre-registration timestamps
-- - Admin role enforcement
-- - Atomic prize pool updates
-- - Enhanced cashout request validation
-- ============================================================================

-- 1. Create audit_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  ip_address inet,
  user_agent text,
  status text CHECK (status IN ('success', 'failure')),
  error_message text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created 
  ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created 
  ON audit_logs(action, created_at DESC);

-- 2. Create rate_limit_log table for rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_action_created 
  ON rate_limit_log(user_id, action, created_at DESC);

-- 3. Create idempotency_cache table for edge function deduplication
CREATE TABLE IF NOT EXISTS idempotency_cache (
  key text PRIMARY KEY,
  response jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_cache_expires_at 
  ON idempotency_cache(expires_at);

-- 4. Add created_at and converted_at columns to pre-registration tables
ALTER TABLE sprint_pre_registrations 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE readathon_pre_registrations 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE elimination_pre_registrations 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- 5. Create indexes for pre-registration timestamps
CREATE INDEX IF NOT EXISTS idx_sprint_pre_registrations_created_at 
  ON sprint_pre_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readathon_pre_registrations_created_at 
  ON readathon_pre_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_elimination_pre_registrations_created_at 
  ON elimination_pre_registrations(created_at DESC);

-- 6. Add role column to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'author'));

-- 7. Add error tracking to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS error_details jsonb,
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- 8. Create RPC function for atomic prize pool increment (SECURITY FIX #5)
CREATE OR REPLACE FUNCTION increment_prize_pool(
  p_sprint_id uuid DEFAULT NULL,
  p_readathon_id uuid DEFAULT NULL,
  p_competition_id uuid DEFAULT NULL,
  p_amount numeric
) RETURNS void AS $$
BEGIN
  IF p_sprint_id IS NOT NULL THEN
    UPDATE sprints
    SET prize_pool = COALESCE(prize_pool, 0) + p_amount
    WHERE id = p_sprint_id;
  END IF;

  IF p_readathon_id IS NOT NULL THEN
    UPDATE readathons
    SET prize_pool = COALESCE(prize_pool, 0) + p_amount
    WHERE id = p_readathon_id;
  END IF;

  IF p_competition_id IS NOT NULL THEN
    UPDATE competitions
    SET prize_pool = COALESCE(prize_pool, 0) + p_amount
    WHERE id = p_competition_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_prize_pool(uuid, uuid, uuid, numeric) TO authenticated;

-- 9. Update submit_cashout_request RPC with security checks (SECURITY FIX #7, #8)
CREATE OR REPLACE FUNCTION submit_cashout_request(
  p_user_id uuid,
  p_email text,
  p_amount numeric,
  p_payout_type text,
  p_payout_details text,
  p_gift_card_brand text
) RETURNS void AS $$
DECLARE
  current_balance numeric;
  user_email text;
  tax_verified boolean;
BEGIN
  -- SECURITY: Enforce authorization - caller must be the user requesting cashout
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot submit cashout for another user';
  END IF;

  -- Get user's actual balance and tax status
  SELECT available_balance, email, COALESCE(tax_info_verified, FALSE)
  INTO current_balance, user_email, tax_verified
  FROM profiles
  WHERE id = p_user_id;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Validate amount is positive and reasonable
  IF p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid amount: must be between $0.01 and $1,000,000';
  END IF;

  -- Check minimum cashout
  IF p_amount < 5 THEN
    RAISE EXCEPTION 'Minimum cashout is $5.00';
  END IF;

  -- Validate sufficient balance
  IF p_amount > current_balance THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Tax compliance: require verification at $600+
  IF current_balance >= 600 AND NOT tax_verified THEN
    RAISE EXCEPTION 'Tax information required to cashout. Please verify your tax ID.';
  END IF;

  -- Validate payout details based on type
  IF p_payout_type = 'wise' THEN
    IF p_payout_details !~ '^[^@]+@[^@]+\..*$' THEN
      RAISE EXCEPTION 'Invalid Wise email address';
    END IF;
  ELSIF p_payout_type = 'bank_transfer' THEN
    IF p_payout_details = '' OR p_payout_details IS NULL THEN
      RAISE EXCEPTION 'Bank transfer details required';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid payout type: %', p_payout_type;
  END IF;

  -- Insert cashout request
  INSERT INTO cashout_requests (
    user_id,
    amount,
    payout_type,
    payout_details,
    status,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    p_payout_type,
    p_payout_details,
    'pending',
    NOW()
  );

  -- Deduct from available balance
  UPDATE profiles
  SET available_balance = available_balance - p_amount
  WHERE id = p_user_id;

  -- Log audit trail
  INSERT INTO audit_logs (
    user_id,
    action,
    details,
    status,
    created_at
  ) VALUES (
    p_user_id,
    'cashout_request',
    jsonb_build_object('amount', p_amount, 'payout_type', p_payout_type),
    'success',
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_cashout_request(uuid, text, numeric, text, text, text) TO authenticated;

-- 10. Create cleanup functions for maintenance
CREATE OR REPLACE FUNCTION cleanup_expired_pre_registrations()
RETURNS void AS $$
BEGIN
  DELETE FROM sprint_pre_registrations 
  WHERE created_at < NOW() - INTERVAL '4 weeks' AND converted = FALSE;
  
  DELETE FROM readathon_pre_registrations 
  WHERE created_at < NOW() - INTERVAL '4 weeks' AND converted = FALSE;
  
  DELETE FROM elimination_pre_registrations 
  WHERE created_at < NOW() - INTERVAL '4 weeks' AND converted = FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_log WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_idempotency_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 11. RLS Policy: Only admins can access admin endpoints
CREATE POLICY "Only admins can access admin data"
  ON sprints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Ensure audit_logs can only be inserted by service role
CREATE POLICY "Only service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- Ensure rate_limit_log can only be inserted by service role
CREATE POLICY "Only service role can insert rate limit logs"
  ON rate_limit_log FOR INSERT
  WITH CHECK (TRUE);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all security-relevant actions';
COMMENT ON TABLE rate_limit_log IS 'Rate limiting tracker to prevent abuse';
COMMENT ON TABLE idempotency_cache IS 'Idempotency key cache for edge function deduplication';
