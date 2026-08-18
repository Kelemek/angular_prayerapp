import type { Config, Driver, DriverHook } from 'driver.js';

/** Runtime surface passed to help tour catalog runners (implemented by `HelpDriverTourService`). */
export interface HelpTourDriverHost {
  killActiveDriver(): void;
  advanceAfterOrKill(fn: () => void, delayMs?: number): DriverHook;
  popoverNextKillsTour(): DriverHook;
  startTourDriver(config: Config): Driver;
  clearFullGuidedTourNavigationState(): void;
  clearFullGuidedTourProgress(): void;
  getLastDriverDestroyWasProgrammatic(): boolean;
}
