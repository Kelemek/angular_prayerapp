import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Component, Input, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';
import { AdminPendingBadgeComponent } from '../admin-pending-badge/admin-pending-badge.component';
import { AdminPendingCountService } from '../../services/admin-pending-count.service';
import { UserSettingsPanelComponent } from './user-settings-panel.component';

function sectionStub(selector: string) {
  @Component({
    selector,
    standalone: true,
    template: '',
  })
  class Stub {
    @Input() host: unknown;
    @Input() isOpen = false;
    @Input() email = '';
    @Input() kind = '';
    @Input() title = '';
    @Input() description = '';
    @Input() tourSectionId = '';
    @Input() tourControlsId = '';
    @Input() hourSelectId = '';
    @Input() hourSelectLabel = '';
    @Input() addButtonTitle = '';
  }
  return Stub;
}

const SECTION_STUBS = [
  'app-user-settings-print-section',
  'app-user-settings-appearance-section',
  'app-user-settings-notifications-section',
  'app-user-settings-prayer-encouragement-section',
  'app-user-settings-default-view-section',
  'app-user-settings-memorization-practice-section',
  'app-hour-reminder-settings-section',
  'app-user-settings-error-banner',
  'app-user-settings-feedback-section',
  'app-user-settings-account-section',
].map(sectionStub);

function settingsHost(hasAdminEmail$: BehaviorSubject<boolean>): UserSettingsFacade {
  return {
    isOpen: false,
    email: 'admin@example.com',
    logout: () => undefined,
    navigateToAdmin: () => undefined,
    getCurrentUserName: () => 'Ada Admin',
    getCurrentUserEmail: () => 'admin@example.com',
    hasAdminEmail$,
  } as unknown as UserSettingsFacade;
}

describe('UserSettingsPanelComponent admin badge', () => {
  const componentDir = dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    const resourcesByName = new Map<string, string[]>();
    const stack = [join(process.cwd(), 'src/app/components')];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (!dir) {
        continue;
      }
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        const matches = resourcesByName.get(entry.name) ?? [];
        matches.push(full);
        resourcesByName.set(entry.name, matches);
      }
    }

    await resolveComponentResources((url) => {
      const local = join(componentDir, url);
      if (existsSync(local)) {
        return Promise.resolve(readFileSync(local, 'utf-8'));
      }
      const base = url.split('/').pop() ?? url;
      const matches = resourcesByName.get(base) ?? [];
      if (matches.length !== 1) {
        throw new Error(`Component resource not found: ${url}`);
      }
      return Promise.resolve(readFileSync(matches[0], 'utf-8'));
    });
  });

  async function renderPanel(count: number) {
    const hasAdminEmail$ = new BehaviorSubject(true);
    const pendingCount$ = new BehaviorSubject(count);
    const refresh = vi.fn(() => Promise.resolve());
    await TestBed.configureTestingModule({
      imports: [UserSettingsPanelComponent],
      providers: [
        {
          provide: AdminPendingCountService,
          useValue: { pendingApprovalItemCount$: pendingCount$, refresh },
        },
      ],
    })
      .overrideComponent(UserSettingsPanelComponent, {
        set: {
          // Replacing imports rebuilds the component from templateUrl, which is
          // unresolved again, so pass the same file contents.
          template: readFileSync(join(componentDir, 'user-settings-panel.component.html'), 'utf-8'),
          imports: [CommonModule, AdminPendingBadgeComponent, ...SECTION_STUBS],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(UserSettingsPanelComponent);
    fixture.componentRef.setInput('host', settingsHost(hasAdminEmail$));
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '[data-testid="settings-admin-button"]',
    ) as HTMLButtonElement;
    return { fixture, button, pendingCount$, refresh };
  }

  it('refreshes the pending count each time Settings mounts the panel', async () => {
    const { refresh } = await renderPanel(0);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows the pending count on the Admin button', async () => {
    const { button } = await renderPanel(3);
    const badge = button.querySelector('[data-testid="admin-pending-badge"]');
    expect(badge?.textContent?.trim()).toBe('3');
    expect(button.getAttribute('aria-label')).toBe('Admin Portal, 3 pending approvals');
    expect(button.classList.contains('relative')).toBe(true);
  });

  it('hides the badge when no approvals are waiting', async () => {
    const { button, pendingCount$, fixture } = await renderPanel(0);
    expect(button.querySelector('[data-testid="admin-pending-badge"]')).toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Admin Portal');

    pendingCount$.next(2);
    fixture.detectChanges();
    expect(button.querySelector('[data-testid="admin-pending-badge"]')?.textContent?.trim()).toBe(
      '2',
    );
  });
});
