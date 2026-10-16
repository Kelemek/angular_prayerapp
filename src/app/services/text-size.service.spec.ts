import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { TextSizeService } from './text-size.service';

describe('TextSizeService', () => {
  let service: TextSizeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-size');
    document.documentElement.style.removeProperty('--text-scale');
    vi.spyOn(document, 'addEventListener');
    service = new TextSizeService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-size');
    document.documentElement.style.removeProperty('--text-scale');
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('textSize$ observable', () => {
    it('should emit text size values', async () => {
      const size = await firstValueFrom(service.textSize$);
      expect(['normal', 'large', 'largest']).toContain(size);
    });

    it('should default to normal', async () => {
      const size = await firstValueFrom(service.textSize$);
      expect(size).toBe('normal');
    });

    it('should emit different sizes when setTextSize is called', async () => {
      const sizes: string[] = [];
      service.textSize$.subscribe(s => sizes.push(s));

      service.setTextSize('large');
      await new Promise(resolve => setTimeout(resolve, 10));

      service.setTextSize('largest');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sizes).toContain('normal');
      expect(sizes).toContain('large');
      expect(sizes).toContain('largest');
    });
  });

  describe('setTextSize', () => {
    it('should update to large', async () => {
      service.setTextSize('large');
      const size = await firstValueFrom(service.textSize$);
      expect(size).toBe('large');
    });

    it('should update to largest', async () => {
      service.setTextSize('largest');
      const size = await firstValueFrom(service.textSize$);
      expect(size).toBe('largest');
    });

    it('should persist to localStorage', () => {
      service.setTextSize('large');
      expect(localStorage.getItem('textSize')).toBe('large');
    });

    it('setTextSize with persist false does not write localStorage', () => {
      localStorage.setItem('textSize', 'large');
      service.setTextSize('normal', { persist: false });
      expect(service.getTextSize()).toBe('normal');
      expect(localStorage.getItem('textSize')).toBe('large');
    });

    it('writes localStorage before textSize$ subscribers run', () => {
      localStorage.setItem('textSize', 'largest');
      let lsWhenNormalEmitted: string | null = null;
      const sub = service.textSize$.subscribe((size) => {
        if (size === 'normal') {
          lsWhenNormalEmitted = localStorage.getItem('textSize');
        }
      });
      service.setTextSize('largest');
      service.setTextSize('normal');
      expect(lsWhenNormalEmitted).toBe('normal');
      sub.unsubscribe();
    });

    it('should set data-text-size attribute on documentElement', () => {
      service.setTextSize('large');
      expect(document.documentElement.getAttribute('data-text-size')).toBe('large');
    });

    it('should set --text-scale CSS variable on documentElement', () => {
      service.setTextSize('normal');
      expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1');

      service.setTextSize('large');
      expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1.15');

      service.setTextSize('largest');
      expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1.25');
    });
  });

  describe('visibility change listener', () => {
    it('does not write localStorage when reapplying after persist false logout state', async () => {
      localStorage.setItem('textSize', 'large');
      service.setTextSize('normal', { persist: false });
      localStorage.removeItem('textSize');

      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(localStorage.getItem('textSize')).toBeNull();
    });
  });

  describe('getTextSize', () => {
    it('should return current value', () => {
      expect(service.getTextSize()).toBe('normal');
      service.setTextSize('large');
      expect(service.getTextSize()).toBe('large');
    });

    it('should restore from localStorage', () => {
      localStorage.setItem('textSize', 'largest');
      const service2 = new TextSizeService();
      expect(service2.getTextSize()).toBe('largest');
      service2.ngOnDestroy();
    });

    it('does not write default normal size when localStorage has no key', () => {
      localStorage.clear();
      new TextSizeService().ngOnDestroy();
      expect(localStorage.getItem('textSize')).toBeNull();
    });
  });
});
