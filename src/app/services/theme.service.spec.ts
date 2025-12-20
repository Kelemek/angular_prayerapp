import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    service = new ThemeService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('theme$ observable', () => {
    it('should emit theme values', async () => {
      const theme = await firstValueFrom(service.theme$);
      expect(['light', 'dark', 'system']).toContain(theme);
    });

    it('should default to system theme', async () => {
      const theme = await firstValueFrom(service.theme$);
      expect(theme).toBe('system');
    });
  });

  describe('setTheme', () => {
    it('should update theme to light', async () => {
      service.setTheme('light');
      const theme = await firstValueFrom(service.theme$);
      expect(theme).toBe('light');
    });

    it('should update theme to dark', async () => {
      service.setTheme('dark');
      const theme = await firstValueFrom(service.theme$);
      expect(theme).toBe('dark');
    });

    it('should persist theme to localStorage', () => {
      service.setTheme('dark');
      const savedTheme = localStorage.getItem('theme');
      expect(savedTheme).toBe('dark');
    });
  });
});
