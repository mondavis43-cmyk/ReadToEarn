import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Check if a user has exceeded the rate limit for an action
 * @param userId User ID to check
 * @param action Action identifier (e.g., 'email_send', 'cashout_request')
 * @param maxAttempts Maximum allowed attempts
 * @param windowSeconds Time window in seconds
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxAttempts: number = 5,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  try {
    const windowStart = new Date(
      Date.now() - windowSeconds * 1000
    ).toISOString();

    // Count recent attempts
    const { data: attempts, error: countError } = await supabase
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', windowStart);

    if (countError) {
      console.error('[RateLimit] Error checking rate limit:', countError);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: maxAttempts,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }

    const attemptCount = attempts?.length || 0;
    const allowed = attemptCount < maxAttempts;
    const remaining = Math.max(0, maxAttempts - attemptCount);
    const resetAt = new Date(Date.now() + windowSeconds * 1000);

    if (!allowed) {
      console.warn(
        `[RateLimit] User ${userId} exceeded limit for action: ${action}`
      );
    }

    return { allowed, remaining, resetAt };
  } catch (err) {
    console.error('[RateLimit] Unexpected error:', err);
    return {
      allowed: true,
      remaining: maxAttempts,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
}

/**
 * Log a rate-limited action attempt
 */
export async function logRateLimitAttempt(
  userId: string,
  action: string
): Promise<void> {
  try {
    const { error } = await supabase.from('rate_limit_log').insert({
      user_id: userId,
      action,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[RateLimit] Failed to log attempt:', error);
    }
  } catch (err) {
    console.error('[RateLimit] Error logging attempt:', err);
  }
}
