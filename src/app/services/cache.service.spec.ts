import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    localStorage.clear();
    service = new CacheService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('set and get', () => {
    it('should cache data in memory', () => {
      const testData = { id: 1, name: 'Test Prayer' };
      const config = { key: 'test_prayer', ttl: 60000 };

      service.set(config.key, testData, config.ttl);
      const cachedData = service.get(config.key);

      expect(cachedData).toEqual(testData);
    });

    it('should return null for missing cache key', () => {
      const cachedData = service.get('nonexistent');
      expect(cachedData).toBeNull();
    });

    it('should respect TTL expiration', async () => {
      const testData = { id: 1, name: 'Test' };
      const ttl = 100; // 100ms

      service.set('test_key', testData, ttl);
      expect(service.get('test_key')).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50));
      expect(service.get('test_key')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all cached data', () => {
      service.set('key1', { data: 1 }, 60000);
      service.set('key2', { data: 2 }, 60000);
      service.set('key3', { data: 3 }, 60000);

      expect(service.get('key1')).toBeTruthy();
      expect(service.get('key2')).toBeTruthy();
      expect(service.get('key3')).toBeTruthy();

      service.invalidateAll();

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
      expect(service.get('key3')).toBeNull();
    });
  });
});
