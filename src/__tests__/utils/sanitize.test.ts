import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUserInput, sanitizeEmail, sanitizeSearchQuery } from '../../utils/sanitize';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });
  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });
  it('escapes greater-than', () => {
    expect(escapeHtml('5 > 3')).toBe('5 &gt; 3');
  });
  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });
  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });
  it('returns unchanged safe text', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world');
  });
  it('escapes multiple characters in one string', () => {
    const xss = '<script>alert("xss")</script>';
    const out = escapeHtml(xss);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('"');
    expect(out).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
  it('handles string with no special chars', () => {
    expect(escapeHtml('iPhone 15 Pro 128GB')).toBe('iPhone 15 Pro 128GB');
  });
});

describe('sanitizeUserInput', () => {
  it('strips HTML tags', () => {
    expect(sanitizeUserInput('<b>bold</b>')).toBe('bold');
  });
  it('strips script tags', () => {
    expect(sanitizeUserInput('<script>alert(1)</script>')).not.toContain('<');
  });
  it('trims whitespace', () => {
    expect(sanitizeUserInput('  hello  ')).toBe('hello');
  });
  it('removes control characters', () => {
    const input = 'Hello\x00World\x1F';
    const out = sanitizeUserInput(input);
    expect(out).not.toMatch(/[\x00-\x1F]/);
  });
  it('escapes remaining special chars after stripping tags', () => {
    const out = sanitizeUserInput('Tom & Jerry');
    expect(out).toBe('Tom &amp; Jerry');
  });
  it('handles empty input', () => {
    expect(sanitizeUserInput('')).toBe('');
  });
  it('handles already-safe input', () => {
    expect(sanitizeUserInput('iPhone 15 Pro')).toBe('iPhone 15 Pro');
  });
  it('strips multiple nested tags', () => {
    const input = '<div><p><span>Text</span></p></div>';
    expect(sanitizeUserInput(input)).toBe('Text');
  });
  it('handles javascript: URI in tags', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const out = sanitizeUserInput(input);
    expect(out).not.toContain('<a');
  });
});

describe('sanitizeEmail', () => {
  it('normalises to lowercase', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
  });
  it('returns empty string for invalid email', () => {
    expect(sanitizeEmail('notanemail')).toBe('');
    expect(sanitizeEmail('@no-local')).toBe('');
    expect(sanitizeEmail('no-domain@')).toBe('');
  });
  it('accepts standard emails', () => {
    expect(sanitizeEmail('john.doe@example.co.uk')).toBe('john.doe@example.co.uk');
  });
  it('strips HTML tags from email, leaving valid address', () => {
    // Tag stripping removes <b> and </b>, leaving "admin@test.com" which IS valid
    const result = sanitizeEmail('<b>admin@test.com</b>');
    expect(result).toBe('admin@test.com');
  });
  it('handles email with plus addressing', () => {
    expect(sanitizeEmail('user+label@example.com')).toBe('user+label@example.com');
  });
  it('returns empty string for empty input', () => {
    expect(sanitizeEmail('')).toBe('');
  });
  it('handles subdomain emails', () => {
    expect(sanitizeEmail('user@mail.example.co.uk')).toBe('user@mail.example.co.uk');
  });
});

describe('sanitizeSearchQuery', () => {
  it('strips HTML tags from queries', () => {
    const out = sanitizeSearchQuery('<script>iPhone</script>');
    expect(out).not.toContain('<script>');
  });
  it('truncates to 100 characters', () => {
    const long = 'a'.repeat(150);
    expect(sanitizeSearchQuery(long).length).toBeLessThanOrEqual(100);
  });
  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  iPhone  ')).toBe('iPhone');
  });
  it('handles normal search queries', () => {
    expect(sanitizeSearchQuery('iPhone 15 Pro 128GB')).toBe('iPhone 15 Pro 128GB');
  });
  it('handles empty query', () => {
    expect(sanitizeSearchQuery('')).toBe('');
  });
  it('keeps numbers and letters', () => {
    const out = sanitizeSearchQuery('Samsung Galaxy S24');
    expect(out).toBe('Samsung Galaxy S24');
  });
});
