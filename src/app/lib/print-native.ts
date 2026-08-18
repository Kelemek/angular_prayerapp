import { Printer } from '@capgo/capacitor-printer';

/** Detect if running in native Capacitor app (iOS or Android). */
export function isPrintNativeApp(): boolean {
  try {
    const hasCapacitor = typeof (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor !== 'undefined';
    let platform: string | null = null;

    if (hasCapacitor) {
      try {
        platform = (window as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor.getPlatform();
      } catch (e) {
        console.debug('[Print] Error getting platform:', e);
      }
    }

    const isNative = hasCapacitor && (platform === 'ios' || platform === 'android');
    console.log('[Print] Native app check:', isNative, {
      hasCapacitor,
      platform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
    return isNative;
  } catch (e) {
    console.error('[Print] Error checking native app:', e);
    return false;
  }
}

/** Share or save print HTML on native app via @capgo/capacitor-printer. */
export async function sharePrintHtmlOnNativeApp(
  html: string,
  filename: string,
  title: string,
): Promise<void> {
  try {
    const platform = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.();
    if (platform === 'ios' || platform === 'android') {
      try {
        await Printer.printHtml({
          name: title,
          html,
        });
      } catch (error) {
        console.error('[Print] Printer plugin error:', error);
        const message = (error as { message?: string })?.message || 'Unknown error';
        if (!message.toLowerCase().includes('cancelled') && !message.toLowerCase().includes('user')) {
          alert(`Failed to open print dialog: ${message}`);
        }
      }
      return;
    }
  } catch (error) {
    console.error('[Print] Error in sharePrintHtmlOnNativeApp:', error);
    const message = (error as { message?: string })?.message || 'Unknown error';
    if (!message.toLowerCase().includes('cancelled') && !message.toLowerCase().includes('user')) {
      alert(`Error: ${message}`);
    }
  }
}
