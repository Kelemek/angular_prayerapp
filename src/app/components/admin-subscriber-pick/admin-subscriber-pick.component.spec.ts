import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminSubscriberPickComponent } from './admin-subscriber-pick.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef } from '@angular/core';

describe('AdminSubscriberPickComponent', () => {
  let component: AdminSubscriberPickComponent;
  let mockSupabase: { getClient: ReturnType<typeof vi.fn> };
  let mockToast: { error: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSupabase = {
      getClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [{ email: 'jane@example.com', name: 'Jane Doe' }],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      })),
    };
    mockToast = { error: vi.fn() };
    mockCdr = { markForCheck: vi.fn() };

    component = new AdminSubscriberPickComponent(
      mockSupabase as unknown as SupabaseService,
      mockToast as unknown as ToastService,
      mockCdr as unknown as ChangeDetectorRef,
    );
  });

  it('clears results when query is below min chars', () => {
    component.results = [{ email: 'a@b.com', name: 'A B' }];
    component.onQueryChange('a');
    expect(component.results).toEqual([]);
    expect(component.hasSearched).toBe(false);
    expect(component.showDropdown).toBe(false);
  });

  it('reset clears search state', () => {
    component.searchQuery = 'test';
    component.results = [{ email: 'a@b.com', name: 'A B' }];
    component.reset();
    expect(component.searchQuery).toBe('');
    expect(component.results).toEqual([]);
  });
});
