import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type AuditAction =
  | 'cashout_request'
  | 'payment_success'
  | 'payment_failed'
  | 'pre_registration'
  | 'competition_entry'
  | 'admin_action';

export interface AuditLogEntry {
  user_id?: string;
  action: AuditAction;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure';
  error_message?: string;
}

/**
 * Log an action to the audit trail
 * Note: This requires the audit_logs table to exist in Supabase
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.user_id || null,
      action: entry.action,
      details: entry.details,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      status: entry.status,
      error_message: entry.error_message || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[AuditLog] Failed to log audit entry:', error);
    }
  } catch (err) {
    console.error('[AuditLog] Error logging audit:', err);
    // Don't throw — audit logging should not break main flow
  }
}
