/**
 * Security utilities for input validation, sanitization, and protection
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize email for safe display in HTML
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return sanitizeHtml(email.trim());
}

/**
 * Validate US routing number format (9 digits)
 */
export function validateRoutingNumber(routingNumber: string): boolean {
  const trimmed = routingNumber.trim();
  return /^\d{9}$/.test(trimmed);
}

/**
 * Validate account number format (8-17 digits)
 */
export function validateAccountNumber(accountNumber: string): boolean {
  const trimmed = accountNumber.trim();
  return /^\d{8,17}$/.test(trimmed);
}

/**
 * Validate IBAN format
 * Basic format check: 2 letter country code + 2 digits + up to 30 alphanumeric
 */
export function validateIBAN(iban: string): boolean {
  const trimmed = iban.toUpperCase().replace(/\s/g, '');
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
  return ibanRegex.test(trimmed);
}

/**
 * Validate SWIFT/BIC code format
 * 6-11 characters: 4 letter bank code, 2 letter country, 2 char location, optional 3 char branch
 */
export function validateSWIFTCode(swiftCode: string): boolean {
  const trimmed = swiftCode.toUpperCase().replace(/\s/g, '');
  const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return swiftRegex.test(trimmed);
}

/**
 * Validate cashout amount
 */
export function validateCashoutAmount(
  amount: number,
  balance: number,
  minCashout: number
): { valid: boolean; error?: string } {
  if (isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than $0' };
  }

  if (amount < minCashout) {
    return {
      valid: false,
      error: `Minimum cashout is $${minCashout.toFixed(2)}`,
    };
  }

  if (amount > balance) {
    return {
      valid: false,
      error: `Insufficient balance: requested $${amount.toFixed(2)}, have $${balance.toFixed(2)}`,
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Generate idempotency key for request deduplication
 */
export function generateIdempotencyKey(prefix: string, data: Record<string, any>): string {
  const hash = btoa(JSON.stringify(data));
  return `${prefix}_${hash}_${Date.now()}`;
}

/**
 * Validate CORS origin against allowlist
 */
export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

/**
 * URL-safe encoding for query parameters
 */
export function encodeQueryParam(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Safe table name validation to prevent SQL injection
 */
export function validateTableName(
  tableName: string,
  allowedTables: string[]
): boolean {
  return (
    typeof tableName === 'string' &&
    tableName.length > 0 &&
    allowedTables.includes(tableName)
  );
}

/**
 * Ensure amount is non-negative and reasonable (max $1,000,000)
 */
export function sanitizeAmount(amount: any): number {
  const num = Number(amount);
  if (isNaN(num) || num < 0 || num > 1000000) {
    throw new Error('Invalid amount: must be between $0 and $1,000,000');
  }
  return Math.round(num * 100) / 100; // Round to 2 decimals
}
