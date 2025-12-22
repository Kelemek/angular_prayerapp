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

    it('should handle TTL expiration without localStorage', async () => {
      // Mock localStorage to throw on operations
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      localStorage.setItem = () => {
        throw new Error('localStorage not available');
      };
      localStorage.removeItem = () => {
        throw new Error('localStorage not available');
      };

      // Create a new service instance with unavailable localStorage
      const serviceWithoutStorage = new CacheService();
      const testData = { id: 1, name: 'Test' };
      const ttl = 100; // 100ms

      serviceWithoutStorage.set('test_key', testData, ttl);
      expect(serviceWithoutStorage.get('test_key')).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50));
      expect(serviceWithoutStorage.get('test_key')).toBeNull();

      // Restore original methods
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
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

  describe('invalidate', () => {
    it('should invalidate a specific cache key', () => {
      service.set('key1', { data: 1 }, 60000);
      service.set('key2', { data: 2 }, 60000);

      expect(service.get('key1')).toBeTruthy();
      expect(service.get('key2')).toBeTruthy();

      service.invalidate('key1');

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeTruthy();
    });

    it('should remove key from localStorage when invalidated', () => {
      const key = 'test_key';
      service.set(key, { data: 'test' }, 60000);
      
      expect(localStorage.getItem(key)).toBeTruthy();
      
      service.invalidate(key);
      
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should work without localStorage', () => {
      // Mock localStorage to throw on operations
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      localStorage.setItem = () => {
        throw new Error('localStorage not available');
      };
      localStorage.removeItem = () => {
        throw new Error('localStorage not available');
      };

      // Create a new service instance with unavailable localStorage
      const serviceWithoutStorage = new CacheService();
      serviceWithoutStorage.set('test_key', { data: 'test' }, 60000);
      
      // Should still be able to invalidate from in-memory cache
      serviceWithoutStorage.invalidate('test_key');
      expect(serviceWithoutStorage.get('test_key')).toBeNull();

      // Restore original methods
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('invalidateCategory', () => {
    it('should invalidate all keys starting with category prefix', () => {
      service.set('prayers_1', { id: 1 }, 60000);
      service.set('prayers_2', { id: 2 }, 60000);
      service.set('prompts_1', { id: 3 }, 60000);

      expect(service.get('prayers_1')).toBeTruthy();
      expect(service.get('prayers_2')).toBeTruthy();
      expect(service.get('prompts_1')).toBeTruthy();

      service.invalidateCategory('prayers');

      expect(service.get('prayers_1')).toBeNull();
      expect(service.get('prayers_2')).toBeNull();
      expect(service.get('prompts_1')).toBeTruthy();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      service.set('key1', { data: 'test1' }, 60000);
      service.set('key2', { data: 'test2' }, 60000);

      const stats = service.getStats();

      expect(stats.inMemoryCount).toBe(2);
      expect(stats.details.length).toBe(2);
      expect(stats.details[0]).toHaveProperty('key');
      expect(stats.details[0]).toHaveProperty('size');
      expect(stats.details[0]).toHaveProperty('expired');
    });

    it('should mark expired entries in stats', async () => {
      service.set('key1', { data: 'test' }, 50); // 50ms TTL

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = service.getStats();
      const entry = stats.details.find(d => d.key === 'key1');
      
      expect(entry?.expired).toBe(true);
    });

    it('should format sizes correctly', () => {
      service.set('small', 'x', 60000); // Small data
      service.set('medium', { data: 'x'.repeat(1500) }, 60000); // ~1.5KB

      const stats = service.getStats();
      
      // All entries should have formatted sizes
      stats.details.forEach(detail => {
        expect(detail.size).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB)/);
      });
    });

    it('should format size with negative decimals parameter', () => {
      // Create a large data structure to get KB/MB size
      const largeData = { data: 'x'.repeat(1500) }; // ~1.5KB
      service.set('key1', largeData, 60000);

      const stats = service.getStats();
      const entry = stats.details.find(d => d.key === 'key1');
      
      // Should format with proper size unit (KB or MB)
      expect(entry?.size).toMatch(/Bytes|KB|MB/);
    });
  });

  describe('cacheObservable', () => {
    it('should cache observable data', async () => {
      const { of } = await import('rxjs');
      const testData = { id: 1, name: 'Test' };
      const source$ = of(testData);

      let callCount = 0;
      const cached$ = service.cacheObservable('test_observable', source$);

      cached$.subscribe(data => {
        callCount++;
        expect(data).toEqual(testData);
      });

      // Second subscription should use cached data
      cached$.subscribe(data => {
        callCount++;
        expect(data).toEqual(testData);
      });

      expect(callCount).toBe(2);
    });

    it('should return cached data if available and not expired', async () => {
      const { of } = await import('rxjs');
      const testData = { id: 1, name: 'Test' };
      
      // First call to cache the observable
      const source1$ = of(testData);
      const cached1$ = service.cacheObservable('test_observable', source1$);
      
      // Subscribe to the first observable to trigger caching
      await new Promise<void>(resolve => {
        cached1$.subscribe(data => {
          expect(data).toEqual(testData);
          resolve();
        });
      });
      
      // Second call with different data - should return cached observable
      const source2$ = of({ id: 2, name: 'New Data' });
      const cached2$ = service.cacheObservable('test_observable', source2$);

      // Verify it returns cached data by subscribing
      await new Promise<void>(resolve => {
        cached2$.subscribe(data => {
          // Should return the cached data from first call
          expect(data).toEqual(testData);
          resolve();
        });
      });
    });

    it('should refresh observable when data cache expires', async () => {
      const { of } = await import('rxjs');
      const testData1 = { id: 1, name: 'Test1' };
      const testData2 = { id: 2, name: 'Test2' };
      
      // Cache observable with short TTL
      const source1$ = of(testData1);
      const cached1$ = service.cacheObservable('test_observable', source1$, 50);
      
      // Subscribe to trigger caching
      await new Promise<void>(resolve => {
        cached1$.subscribe(data => {
          expect(data).toEqual(testData1);
          resolve();
        });
      });
      
      // Wait for data cache to expire but observableCache still has reference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Call cacheObservable again - should create new observable since data expired
      const source2$ = of(testData2);
      const cached2$ = service.cacheObservable('test_observable', source2$, 60000);

      await new Promise<void>(resolve => {
        cached2$.subscribe(data => {
          // Should get new data since cache expired
          expect(data).toEqual(testData2);
          resolve();
        });
      });
    });
  });

  describe('localStorage integration', () => {
    it('should persist data to localStorage', () => {
      const key = 'test_persist';
      const testData = { id: 1, name: 'Test' };

      service.set(key, testData, 60000);

      const stored = localStorage.getItem(key);
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.data).toEqual(testData);
    });

    it('should initialize cache from localStorage on construction', () => {
      const key = 'prayers_cache';
      const testData = { id: 1, name: 'Test Prayer' };
      const cached = {
        data: testData,
        timestamp: Date.now(),
        ttl: 60000
      };
      
      localStorage.setItem(key, JSON.stringify(cached));

      // Create new service instance to trigger initialization
      const newService = new CacheService();
      
      const retrieved = newService.get(key);
      expect(retrieved).toEqual(testData);
    });

    it('should handle localStorage errors gracefully during set', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage full');
      };

      // Should not throw, just log warning
      expect(() => {
        service.set('test_key', { data: 'test' }, 60000);
      }).not.toThrow();

      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage errors gracefully during invalidate', () => {
      // Mock localStorage.removeItem to throw an error
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error('Storage error');
      };

      // Should not throw, just log warning
      expect(() => {
        service.invalidate('test_key');
      }).not.toThrow();

      // Restore original method
      localStorage.removeItem = originalRemoveItem;
    });

    it('should handle localStorage errors gracefully during invalidateAll', () => {
      // Mock localStorage.removeItem to throw an error
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error('Storage error');
      };

      // Should not throw, just log warning
      expect(() => {
        service.invalidateAll();
      }).not.toThrow();

      // Restore original method
      localStorage.removeItem = originalRemoveItem;
    });

    it('should handle localStorage initialization errors gracefully', () => {
      const badData = 'not valid json';
      localStorage.setItem('prayers_cache', badData);

      // Should not throw during construction
      expect(() => {
        new CacheService();
      }).not.toThrow();
    });

    it('should handle localStorage unavailability', () => {
      // Mock localStorage to throw on setItem (simulating unavailable localStorage)
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      localStorage.setItem = () => {
        throw new Error('localStorage not available');
      };
      localStorage.removeItem = () => {
        throw new Error('localStorage not available');
      };

      // Create a new service instance with unavailable localStorage
      const serviceWithoutStorage = new CacheService();
      
      // Should still work with in-memory cache only
      serviceWithoutStorage.set('test_key', { data: 'test' }, 60000);
      const retrieved = serviceWithoutStorage.get('test_key');
      expect(retrieved).toEqual({ data: 'test' });

      // Test invalidateAll without localStorage
      serviceWithoutStorage.invalidateAll();
      expect(serviceWithoutStorage.get('test_key')).toBeNull();

      // Test getStats without localStorage
      serviceWithoutStorage.set('test_key2', { data: 'test2' }, 60000);
      const stats = serviceWithoutStorage.getStats();
      expect(stats.localStorageCount).toBe(0);
      expect(stats.inMemoryCount).toBeGreaterThan(0);

      // Restore original methods
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    });
  });
});
