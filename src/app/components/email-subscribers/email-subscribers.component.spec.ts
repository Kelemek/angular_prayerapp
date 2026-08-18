import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { EmailSubscribersComponent } from './email-subscribers.component';

describe('EmailSubscribersComponent', () => {
  let component: EmailSubscribersComponent;
  let mockBreakpointObserver: {
    observe: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBreakpointObserver = {
      observe: vi.fn().mockReturnValue({
        subscribe: vi.fn().mockImplementation((fn: (v: { matches: boolean }) => void) => {
          fn({ matches: false });
          return { unsubscribe: vi.fn() };
        }),
      }),
    };

    const mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    } as unknown as ChangeDetectorRef;

    component = new EmailSubscribersComponent(
      {
        client: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
            }),
          }),
        },
      } as never,
      { success: vi.fn(), error: vi.fn() } as never,
      mockChangeDetectorRef,
      {
        sendSubscriberWelcomeEmail: vi.fn().mockResolvedValue(undefined),
      } as never,
      mockBreakpointObserver as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit sets maxPaginationButtons from breakpoint observer', () => {
    mockBreakpointObserver.observe.mockReturnValue({
      subscribe: vi.fn().mockImplementation((fn: (v: { matches: boolean }) => void) => {
        fn({ matches: true });
        return { unsubscribe: vi.fn() };
      }),
    });

    const mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    } as unknown as ChangeDetectorRef;

    const shell = new EmailSubscribersComponent(
      { client: { from: vi.fn() } } as never,
      { success: vi.fn(), error: vi.fn() } as never,
      mockChangeDetectorRef,
      { sendSubscriberWelcomeEmail: vi.fn() } as never,
      mockBreakpointObserver as never,
    );

    shell.ngOnInit();
    expect(shell.maxPaginationButtons).toBe(3);
    expect(mockBreakpointObserver.observe).toHaveBeenCalledWith('(max-width: 640px)');
  });

  it('ngOnDestroy unsubscribes breakpoint, debouncer, and orientation', () => {
    const unsubscribe = vi.fn();
    mockBreakpointObserver.observe.mockReturnValue({
      subscribe: vi.fn().mockReturnValue({ unsubscribe }),
    });

    const mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    } as unknown as ChangeDetectorRef;

    const shell = new EmailSubscribersComponent(
      { client: { from: vi.fn() } } as never,
      { success: vi.fn(), error: vi.fn() } as never,
      mockChangeDetectorRef,
      { sendSubscriberWelcomeEmail: vi.fn() } as never,
      mockBreakpointObserver as never,
    );

    vi.useFakeTimers();
    const spy = vi.spyOn(shell, 'handleSearch').mockResolvedValue();
    shell.onListSearchQueryChange('ab');
    vi.advanceTimersByTime(100);

    shell.ngOnInit();
    shell.ngOnDestroy();

    vi.advanceTimersByTime(400);
    expect(unsubscribe).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
