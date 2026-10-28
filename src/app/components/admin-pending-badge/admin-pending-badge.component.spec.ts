import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AdminPendingBadgeComponent } from './admin-pending-badge.component';

describe('AdminPendingBadgeComponent', () => {
  async function render(count: number) {
    await TestBed.configureTestingModule({
      imports: [AdminPendingBadgeComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminPendingBadgeComponent);
    fixture.componentRef.setInput('count', count);
    fixture.detectChanges();
    return fixture;
  }

  function label(fixture: { nativeElement: HTMLElement }): string | null {
    const badge = fixture.nativeElement.querySelector(
      '[data-testid="admin-pending-badge"]',
    ) as HTMLElement | null;
    return badge?.textContent?.trim() ?? null;
  }

  it('renders nothing at 0', async () => {
    const fixture = await render(0);
    expect(label(fixture)).toBeNull();
  });

  it('shows the count', async () => {
    const fixture = await render(4);
    expect(label(fixture)).toBe('4');
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="admin-pending-badge"]')
        ?.classList.contains('pointer-events-none'),
    ).toBe(true);
  });

  it('keeps its host out of the parent flex layout so the button does not widen', async () => {
    const fixture = await render(0);
    expect((fixture.nativeElement as HTMLElement).classList.contains('contents')).toBe(true);
  });

  it('shows 99 at 99 and 99+ above 99', async () => {
    const fixture = await render(99);
    expect(label(fixture)).toBe('99');
    fixture.componentRef.setInput('count', 100);
    fixture.detectChanges();
    expect(label(fixture)).toBe('99+');
  });
});
