/**
 * Sanitization utilities to prevent XSS attacks
 * These functions escape HTML special characters to prevent script injection
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - The text to sanitize
 * @returns Sanitized text safe for HTML rendering
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitizes user input by removing potentially dangerous HTML/JavaScript
 * @param input - The user input to sanitize
 * @returns Sanitized input safe for storage and display
 */
export function sanitizeUserInput(input: string): string {
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Escape remaining special characters
  sanitized = escapeHtml(sanitized);

  // Remove any control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates and sanitizes email addresses
 * @param email - The email to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeUserInput(email).toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitizes search queries to prevent injection attacks
 * @param query - The search query
 * @returns Sanitized query
 */
export function sanitizeSearchQuery(query: string): string {
  let sanitized = sanitizeUserInput(query);

  // Limit length to prevent DOS attacks
  sanitized = sanitized.substring(0, 100);

  return sanitized;
}
