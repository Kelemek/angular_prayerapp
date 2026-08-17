import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailSettingsComponent } from './email-settings.component';

describe('EmailSettingsComponent', () => {
  let component: EmailSettingsComponent;

  beforeEach(() => {
    component = new EmailSettingsComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have error default to null', () => {
    expect(component.error).toBe(null);
  });

  describe('prepareEmailSubscribersOverviewTour', () => {
    it('delegates to emailSubscribers.prepareOverviewTourListState', async () => {
      const prepareOverviewTourListState = vi.fn().mockResolvedValue(undefined);
      (component as { emailSubscribers?: { prepareOverviewTourListState: () => Promise<void> } }).emailSubscribers = {
        prepareOverviewTourListState,
      };
      await component.prepareEmailSubscribersOverviewTour();
      expect(prepareOverviewTourListState).toHaveBeenCalled();
    });

    it('resolves when emailSubscribers is undefined', async () => {
      (component as { emailSubscribers?: unknown }).emailSubscribers = undefined;
      await expect(component.prepareEmailSubscribersOverviewTour()).resolves.toBeUndefined();
    });
  });
});
