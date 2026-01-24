import { describe, it, expect } from 'vitest';
import { environment } from './environment.prod';
import { environment as devEnvironment } from './environment';

describe('environment.prod', () => {
  it('should be defined', () => {
    expect(environment).toBeDefined();
  });

  it('should have production set to true', () => {
    expect(environment.production).toBe(true);
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

  it('should use different Supabase configuration from development', () => {
    // Production and development environments use separate Supabase projects
    expect(environment.supabaseUrl).not.toBe(devEnvironment.supabaseUrl);
    expect(environment.supabaseAnonKey).not.toBe(devEnvironment.supabaseAnonKey);
  });

  it('should use same Sentry configuration as development', () => {
    // Production and development environments share the same Sentry project
    expect(environment.sentryDsn).toBe(devEnvironment.sentryDsn);
  });

  it('should use same Clarity configuration as development', () => {
    // Production and development environments share the same Clarity project
    expect(environment.clarityProjectId).toBe(devEnvironment.clarityProjectId);
  });
});
