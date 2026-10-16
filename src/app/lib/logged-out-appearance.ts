import type { Injector } from '@angular/core';
import { runApplyingClientPreferencesFromSession } from './client-preferences-notify';
import { TextSizeService } from '../services/text-size.service';
import { ThemeService } from '../services/theme.service';

/** Login-screen defaults without writing appearance keys to localStorage. */
export function resetAppearanceForLoggedOutView(injector: Injector): void {
  try {
    runApplyingClientPreferencesFromSession(() => {
      injector.get(ThemeService).setTheme('system', { persist: false });
      injector.get(TextSizeService).setTextSize('normal', { persist: false });
    });
  } catch {
    // Services may be unavailable in some test harnesses
  }
}
