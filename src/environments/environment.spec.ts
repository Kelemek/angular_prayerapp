import { describe, it, expect } from 'vitest';
import { environment } from './environment';

describe('environment', () => {
  it('should be defined', () => {
    expect(environment).toBeDefined();
  });

  it('should have production set to false', () => {
    expect(environment.production).toBe(false);
  });

  it('should have supabaseUrl defined', () => {
    expect(environment.supabaseUrl).toBeDefined();
    expect(typeof environment.supabaseUrl).toBe('string');
    expect(environment.supabaseUrl).toBe('https://eqiafsygvfaifhoaewxi.supabase.co');
  });

  it('should have supabaseAnonKey defined', () => {
    expect(environment.supabaseAnonKey).toBeDefined();
    expect(typeof environment.supabaseAnonKey).toBe('string');
    expect(environment.supabaseAnonKey.length).toBeGreaterThan(0);
  });

  it('should have sentryDsn defined', () => {
    expect(environment.sentryDsn).toBeDefined();
    expect(typeof environment.sentryDsn).toBe('string');
    expect(environment.sentryDsn).toContain('sentry.io');
  });

  it('should have clarityProjectId defined', () => {
    expect(environment.clarityProjectId).toBeDefined();
    expect(typeof environment.clarityProjectId).toBe('string');
    expect(environment.clarityProjectId).toBe('u9ubmxp15k');
  });

  it('should have all required properties', () => {
    expect(environment).toHaveProperty('production');
    expect(environment).toHaveProperty('supabaseUrl');
    expect(environment).toHaveProperty('supabaseAnonKey');
    expect(environment).toHaveProperty('sentryDsn');
    expect(environment).toHaveProperty('clarityProjectId');
  });

  it('should have valid Supabase URL format', () => {
    expect(environment.supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it('should have valid Sentry DSN format', () => {
    expect(environment.sentryDsn).toMatch(/^https:\/\/.+@.+\.sentry\.io\/.+$/);
  });
});
