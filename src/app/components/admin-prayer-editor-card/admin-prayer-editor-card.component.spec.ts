import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render } from '@testing-library/angular';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';
import {
  EMPTY_PRAYER_EDITOR_EDIT_FORM,
  EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM,
  EMPTY_PRAYER_EDITOR_NEW_UPDATE,
} from '../../lib/admin-prayer-editor-types';

const cardComponentDir = dirname(fileURLToPath(import.meta.url));

beforeAll(async () => {
  await resolveComponentResources((url) => {
    const path = join(cardComponentDir, url);
    if (!existsSync(path)) {
      throw new Error(`Component resource not found: ${url}`);
    }
    return Promise.resolve(readFileSync(path, 'utf-8'));
  });
});

describe('AdminPrayerEditorCardComponent', () => {
  let component: AdminPrayerEditorCardComponent;

  beforeEach(() => {
    component = new AdminPrayerEditorCardComponent();
    component.prayer = {
      id: 'p1',
      title: 'Test',
      requester: 'John',
      email: 'john@example.com',
      status: 'current',
      created_at: '2024-01-01',
    };
    component.newUpdate = { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE };
  });

  it('onAddUpdateSubscriberSelected fills newUpdate and emits action', () => {
    const action = vi.fn();
    component.action.subscribe(action);

    component.onAddUpdateSubscriberSelected({
      name: 'Jane Q Public',
      email: 'jane@example.com',
    });

    expect(component.newUpdate.firstName).toBe('Jane');
    expect(component.newUpdate.lastName).toBe('Q Public');
    expect(component.newUpdate.author_email).toBe('jane@example.com');
    expect(action).toHaveBeenCalledWith({
      type: 'addUpdateSubscriberSelected',
      row: { name: 'Jane Q Public', email: 'jane@example.com' },
    });
  });

  it('delegates flushEditDescriptionEditor to the expanded panel', () => {
    const flush = vi.fn();
    component.expandedPanel = {
      flushEditDescriptionEditor: flush,
    } as AdminPrayerEditorCardComponent['expandedPanel'];

    component.flushEditDescriptionEditor();
    expect(flush).toHaveBeenCalledOnce();
  });

  it('delegates resetAddUpdateSubscriberPick to the expanded panel', () => {
    const reset = vi.fn();
    component.expandedPanel = {
      resetAddUpdateSubscriberPick: reset,
    } as AdminPrayerEditorCardComponent['expandedPanel'];

    component.resetAddUpdateSubscriberPick();
    expect(reset).toHaveBeenCalledOnce();
  });

  it('refreshes header checkbox when selected input changes without replacing card reference', async () => {
    const prayer = {
      id: 'p1',
      title: 'Test',
      requester: 'John',
      email: 'john@example.com',
      status: 'current',
      created_at: '2024-01-01',
    };
    const { fixture } = await render(AdminPrayerEditorCardComponent, {
      componentInputs: {
        prayer,
        index: 0,
        selected: false,
        expanded: false,
        editForm: { ...EMPTY_PRAYER_EDITOR_EDIT_FORM },
        newUpdate: { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE },
        editUpdateForm: { ...EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM },
      },
    });

    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    expect(checkbox.checked).toBe(true);
  });

  describe('template layout', () => {
    it('truncates long Basic Information values instead of overflowing the card', async () => {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const source = readFileSync(
        join(__dirname, 'admin-prayer-editor-card-view-details.component.html'),
        'utf8',
      );
      const basicInfoBlock = source.slice(
        source.indexOf('<!-- Basic Information -->'),
        source.indexOf('<!-- Status Information -->'),
      );

      expect(basicInfoBlock).toContain('min-w-0 truncate');
      expect(basicInfoBlock).toContain('[title]="card.prayer.email"');
      expect(basicInfoBlock).toContain('overflow-hidden');
    });
  });
});
