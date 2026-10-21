import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, vi } from 'vitest';
import { DestroyRef, ElementRef } from '@angular/core';
import { AdminEmailTemplatesListComponent } from './admin-email-templates-list.component';
import type { EmailTemplateRow } from '../../lib/admin-email-templates';

const componentDir = dirname(fileURLToPath(import.meta.url));

const sample: EmailTemplateRow = {
  id: 't1',
  name: 'Account Approval Request',
  template_key: 'account_approval_request',
  subject: 'Subject',
  html_body: '<p>Hi</p>',
  text_body: 'Hi',
  description: null,
  created_at: '',
  updated_at: '',
};

function createComponent(): AdminEmailTemplatesListComponent {
  const destroyRef = { onDestroy: () => {} } as DestroyRef;
  return new AdminEmailTemplatesListComponent(
    document,
    new ElementRef(document.createElement('div')),
    destroyRef,
  );
}

describe('AdminEmailTemplatesListComponent', () => {
  it('template includes expand chevron tied to selection', () => {
    const html = readFileSync(
      join(componentDir, 'admin-email-templates-list.component.html'),
      'utf-8',
    );
    expect(html).toContain('[class.rotate-180]="selectedId === template.id"');
    expect(html).toContain('aria-expanded');
  });

  it('emits select when header pointerdown and click are on the same header', () => {
    const component = createComponent();
    const select = vi.fn();
    component.select.subscribe(select);
    const header = document.createElement('button');

    component.onHeaderPointerDown({ stopPropagation: vi.fn(), currentTarget: header } as unknown as Event);
    component.onHeaderClick(sample, { stopPropagation: vi.fn(), currentTarget: header } as unknown as MouseEvent);
    expect(select).toHaveBeenCalledWith(sample);
  });

  it('does not emit select when pointerup happens outside the header', () => {
    const component = createComponent();
    const select = vi.fn();
    component.select.subscribe(select);
    const header = document.createElement('button');
    const field = document.createElement('input');
    header.contains = () => false;

    component.onHeaderPointerDown({ stopPropagation: vi.fn(), currentTarget: header } as unknown as Event);
    (
      component as unknown as {
        disarmHeaderIfPointerUpOutside(e: Event, reason: string): void;
      }
    ).disarmHeaderIfPointerUpOutside({ target: field } as unknown as PointerEvent);
    component.onHeaderClick(sample, { stopPropagation: vi.fn(), currentTarget: header } as unknown as MouseEvent);

    expect(select).not.toHaveBeenCalled();
  });

  it('emits select when header is activated from the keyboard', () => {
    const component = createComponent();
    const select = vi.fn();
    component.select.subscribe(select);
    const header = document.createElement('button');

    component.onHeaderKeyDown({
      key: 'Enter',
      stopPropagation: vi.fn(),
      currentTarget: header,
    } as unknown as KeyboardEvent);
    component.onHeaderClick(sample, { stopPropagation: vi.fn(), currentTarget: header } as unknown as MouseEvent);
    expect(select).toHaveBeenCalledWith(sample);
  });

  it('does not emit select when editor interaction cancels the header press', () => {
    const component = createComponent();
    const select = vi.fn();
    component.select.subscribe(select);
    const header = document.createElement('button');

    component.onHeaderPointerDown({ stopPropagation: vi.fn(), currentTarget: header } as unknown as Event);
    component.onEditInteraction();
    component.onHeaderClick(sample, { stopPropagation: vi.fn(), currentTarget: header } as unknown as MouseEvent);

    expect(select).not.toHaveBeenCalled();
  });
});
