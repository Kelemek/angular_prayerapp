import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { EnabledDisabledToggleComponent } from './enabled-disabled-toggle.component';

describe('EnabledDisabledToggleComponent', () => {
  let fixture: ComponentFixture<EnabledDisabledToggleComponent>;
  let component: EnabledDisabledToggleComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EnabledDisabledToggleComponent],
    });
    fixture = TestBed.createComponent(EnabledDisabledToggleComponent);
    component = fixture.componentInstance;
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  it('shows skeleton placeholders when not loaded', () => {
    component.loaded = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.animate-pulse')).toHaveLength(2);
  });

  it('shows Enabled and Disabled buttons when loaded', () => {
    component.loaded = true;
    component.value = true;
    fixture.detectChanges();

    expect(buttons()).toHaveLength(2);
    expect(buttons()[0].textContent?.trim()).toBe('Enabled');
    expect(buttons()[1].textContent?.trim()).toBe('Disabled');
  });

  it('applies selected styling to the enabled tile when value is true', () => {
    component.loaded = true;
    component.value = true;
    fixture.detectChanges();

    expect(buttons()[0].className).toContain('border-blue-500');
    expect(buttons()[1].className).toContain('border-church-surface-inactive-border');
  });

  it('applies selected styling to the disabled tile when value is false', () => {
    component.loaded = true;
    component.value = false;
    fixture.detectChanges();

    expect(buttons()[0].className).toContain('border-church-surface-inactive-border');
    expect(buttons()[1].className).toContain('border-blue-500');
  });

  it('disables buttons while saving', () => {
    component.loaded = true;
    component.value = true;
    component.saving = true;
    fixture.detectChanges();

    expect(buttons()[0].disabled).toBe(true);
    expect(buttons()[1].disabled).toBe(true);
  });

  it('emits valueChange when selecting a different value', () => {
    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    component.loaded = true;
    component.value = false;
    fixture.detectChanges();

    buttons()[0].click();

    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('does not emit when clicking the already-selected tile', () => {
    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    component.loaded = true;
    component.value = true;
    fixture.detectChanges();

    buttons()[0].click();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('uses custom labels and titles when provided', () => {
    component.loaded = true;
    component.value = null;
    component.enabledLabel = 'On';
    component.disabledLabel = 'Off';
    component.enabledTitle = 'Turn on';
    component.disabledTitle = 'Turn off';
    fixture.detectChanges();

    expect(buttons()[0].textContent?.trim()).toBe('On');
    expect(buttons()[1].textContent?.trim()).toBe('Off');
    expect(buttons()[0].getAttribute('title')).toBe('Turn on');
    expect(buttons()[1].getAttribute('title')).toBe('Turn off');
  });
});
