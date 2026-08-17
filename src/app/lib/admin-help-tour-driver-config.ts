
import type { Config, DriveStep } from 'driver.js';

export const ADMIN_HELP_DRIVER_POPOVER_CLASS = 'help-driver-popover';

export function buildAdminHelpDriverConfig(
  steps: DriveStep[],
  onDestroyed: () => void,
): Config {
  return {
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    smoothScroll: true,
    allowClose: true,
    popoverClass: ADMIN_HELP_DRIVER_POPOVER_CLASS,
    steps,
    onDestroyed,
  };
}
