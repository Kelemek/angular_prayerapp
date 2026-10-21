import { describe, expect, it, vi } from 'vitest';
import { AdminEmailTemplatesSectionComponent } from './admin-email-templates-section.component';

describe('AdminEmailTemplatesSectionComponent', () => {
  it('toggles only when pointerdown started on the section trigger', () => {
    const component = new AdminEmailTemplatesSectionComponent();
    const toggle = vi.fn();
    component.toggle.subscribe(toggle);

    component.onTriggerPointerDown(new PointerEvent('pointerdown'));
    component.onTriggerClick(new MouseEvent('click'));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('toggles when the section trigger is activated from the keyboard', () => {
    const component = new AdminEmailTemplatesSectionComponent();
    const toggle = vi.fn();
    component.toggle.subscribe(toggle);

    component.onTriggerKeyDown({
      key: 'Enter',
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    component.onTriggerClick(new MouseEvent('click'));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('does not toggle when pointerdown started in the panel (e.g. text selection)', () => {
    const component = new AdminEmailTemplatesSectionComponent();
    const toggle = vi.fn();
    component.toggle.subscribe(toggle);

    component.stopPanelClick(new PointerEvent('pointerdown'));
    component.onTriggerClick(new MouseEvent('click'));

    expect(toggle).not.toHaveBeenCalled();
  });
});
