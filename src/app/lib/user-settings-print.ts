import type { UserSettingsFacade } from './user-settings-facade';

export function userSettingsIsNativeApp(): boolean {
  try {
    const hasCapacitor = typeof (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor !== 'undefined';
    let platform: string | null = null;

    if (hasCapacitor) {
      try {
        platform = (window as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor.getPlatform();
      } catch (e) {
        console.debug('[UserSettings] Error getting platform:', e);
      }
    }

    return hasCapacitor && (platform === 'ios' || platform === 'android');
  } catch (e) {
    console.error('[UserSettings] Error checking native app:', e);
    return false;
  }
}

export async function runUserSettingsHandlePrint(host: UserSettingsFacade): Promise<void> {
  host.isPrinting = true;
  const isNative = userSettingsIsNativeApp();
  const newWindow = !isNative ? window.open('', '_blank') : null;

  try {
    await host.deps.printService.downloadPrintablePrayerList(
      host.printRange,
      newWindow,
    );
  } catch (error) {
    console.error('Error printing prayer list:', error);
    if (newWindow) {
      newWindow.close();
    }
  } finally {
    host.isPrinting = false;
    host.deps.cdr.detectChanges();
  }
}

export async function runUserSettingsHandlePrintPrompts(
  host: UserSettingsFacade,
): Promise<void> {
  host.isPrintingPrompts = true;
  const isNative = userSettingsIsNativeApp();
  const newWindow = !isNative ? window.open('', '_blank') : null;

  try {
    await host.deps.printService.downloadPrintablePromptList(
      host.selectedPromptTypes,
      newWindow,
    );
  } catch (error) {
    console.error('Error printing prompts:', error);
    if (newWindow) {
      newWindow.close();
    }
  } finally {
    host.isPrintingPrompts = false;
    host.deps.cdr.detectChanges();
  }
}

export async function runUserSettingsHandlePrintPersonalPrayers(
  host: UserSettingsFacade,
): Promise<void> {
  host.isPrintingPersonal = true;
  const isNative = userSettingsIsNativeApp();
  const newWindow = !isNative ? window.open('', '_blank') : null;

  try {
    await host.deps.printService.downloadPrintablePersonalPrayerList(
      host.selectedPersonalCategories.length > 0
        ? host.selectedPersonalCategories
        : undefined,
      newWindow,
    );
  } catch (error) {
    console.error('Error printing personal prayers:', error);
    if (newWindow) {
      newWindow.close();
    }
  } finally {
    host.isPrintingPersonal = false;
    host.deps.cdr.detectChanges();
  }
}

export function toggleUserSettingsPromptType(host: UserSettingsFacade, type: string): void {
  const index = host.selectedPromptTypes.indexOf(type);
  if (index > -1) {
    host.selectedPromptTypes = host.selectedPromptTypes.filter((t) => t !== type);
  } else {
    host.selectedPromptTypes = [...host.selectedPromptTypes, type];
  }
}

export function toggleUserSettingsPersonalCategory(
  host: UserSettingsFacade,
  category: string,
): void {
  const index = host.selectedPersonalCategories.indexOf(category);
  if (index > -1) {
    host.selectedPersonalCategories = host.selectedPersonalCategories.filter(
      (c) => c !== category,
    );
  } else {
    host.selectedPersonalCategories = [...host.selectedPersonalCategories, category];
  }
}

export async function runUserSettingsLoadPromptTypes(host: UserSettingsFacade): Promise<void> {
  try {
    const { data, error } = await host.deps.supabase.client
      .from('prayer_types')
      .select('name, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      host.promptTypes = data.map((t) => t.name);
    }
  } catch (err) {
    console.error('Error fetching prayer types:', err);
  }
}

export async function runUserSettingsLoadPersonalCategories(
  host: UserSettingsFacade,
): Promise<void> {
  try {
    host.personalCategories =
      await host.deps.prayerService.getUniqueCategoriesForUser();
  } catch (err) {
    console.error('Error loading personal categories:', err);
  }
}
