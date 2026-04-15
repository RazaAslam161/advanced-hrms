import { cn, formatCurrency, formatDate, toLocalDateTimeInputValue, toIsoDateTime, getApiErrorMessage } from './utils';
import axios from 'axios';

describe('cn (class name utility)', () => {
  it('joins multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('omits falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, null as unknown as string, '')).toBe('foo');
  });

  it('merges conflicting Tailwind classes, keeping the last one', () => {
    // twMerge resolves conflicts: p-4 wins over p-2
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional objects', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('returns an empty string when no arguments are passed', () => {
    expect(cn()).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats PKR values with the Pakistani locale', () => {
    const result = formatCurrency(100000);
    expect(result).toContain('100,000');
  });

  it('formats AED values with the UAE locale', () => {
    const result = formatCurrency(5000, 'AED');
    expect(result).toContain('5,000');
  });

  it('rounds to zero decimal places', () => {
    const result = formatCurrency(1234.56);
    expect(result).not.toMatch(/\.\d/);
  });
});

describe('formatDate', () => {
  it('returns a human-readable date string for an ISO datetime', () => {
    const result = formatDate('2026-04-15T00:00:00.000Z');
    expect(result).toMatch(/2026/);
  });

  it('accepts a Date object', () => {
    const result = formatDate(new Date('2026-01-01T00:00:00.000Z'));
    expect(result).toMatch(/2026/);
  });
});

describe('toLocalDateTimeInputValue', () => {
  it('returns a string in YYYY-MM-DDTHH:MM format', () => {
    const result = toLocalDateTimeInputValue('2026-04-15T00:00:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('has exactly 16 characters (YYYY-MM-DDTHH:MM)', () => {
    const result = toLocalDateTimeInputValue('2026-06-30T12:00:00.000Z');
    expect(result).toHaveLength(16);
  });
});

describe('toIsoDateTime', () => {
  it('converts a datetime string to ISO format', () => {
    const result = toIsoDateTime('2026-04-15T08:00');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('getApiErrorMessage', () => {
  it('extracts the message from an Axios error response', () => {
    const error = new axios.AxiosError('Request failed');
    error.response = { data: { message: 'Unauthorized' } } as typeof error.response;
    expect(getApiErrorMessage(error)).toBe('Unauthorized');
  });

  it('falls back to the axios error message when response has no message', () => {
    const error = new axios.AxiosError('Network Error');
    error.response = { data: {} } as typeof error.response;
    expect(getApiErrorMessage(error)).toBe('Network Error');
  });

  it('extracts the message from a generic Error', () => {
    expect(getApiErrorMessage(new Error('Something broke'))).toBe('Something broke');
  });

  it('returns the fallback string for unknown error types', () => {
    expect(getApiErrorMessage('some string error')).toBe('Something went wrong.');
  });

  it('returns a custom fallback string when provided', () => {
    expect(getApiErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });

  it('returns the fallback when response data has no message property', () => {
    const error = new axios.AxiosError('fail');
    error.response = { data: null } as typeof error.response;
    expect(getApiErrorMessage(error, 'Fallback')).toBe('fail');
  });
});
