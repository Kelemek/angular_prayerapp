import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wireGatedSupabaseMock } from '../../testing/supabase-service-mock';
import { ChangeDetectorRef } from '@angular/core';
import { PrayerListBookletPrintComponent } from './prayer-list-booklet-print.component';
import { PrintService } from '../../services/print.service';
import { SupabaseService } from '../../services/supabase.service';

describe('PrayerListBookletPrintComponent', () => {
  let mockPrint: { downloadPrintableBookletPrayerList: ReturnType<typeof vi.fn> };
  let mockSupabase: { client: { from: ReturnType<typeof vi.fn> } };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };
  let originalOpen: typeof window.open;
  let capHolder: { Capacitor?: unknown };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrint = {
      downloadPrintableBookletPrayerList: vi.fn().mockResolvedValue(undefined),
    };
    mockSupabase = wireGatedSupabaseMock({
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'new-id',
                  sort_order: 0,
                  label: 'test.png',
                  mime_type: 'image/png',
                  image_data: 'data:image/png;base64,xx',
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      },
    });
    mockCdr = {
      markForCheck: vi.fn(),
    };
    originalOpen = window.open;
    capHolder = window as unknown as { Capacitor?: unknown };
    delete capHolder.Capacitor;
    window.open = vi.fn().mockReturnValue({ close: vi.fn() });
  });

  afterEach(() => {
    window.open = originalOpen;
    delete capHolder.Capacitor;
    vi.restoreAllMocks();
  });

  function createComponent(): PrayerListBookletPrintComponent {
    return new PrayerListBookletPrintComponent(
      mockPrint as unknown as PrintService,
      mockSupabase as unknown as SupabaseService,
      mockCdr as unknown as ChangeDetectorRef
    );
  }

  it('should create', () => {
    expect(createComponent()).toBeTruthy();
  });

  describe('onSectionToggle', () => {
    it('loads insert pages on first expand', async () => {
      const c = createComponent();
      c.onSectionToggle();
      await vi.waitFor(() => {
        expect(mockSupabase.client.from).toHaveBeenCalledWith('booklet_insert_pages');
        expect(c.insertPagesLoading).toBe(false);
      });
    });
  });

  describe('onInsertPageDrop', () => {
    it('updates sort_order after reorder', async () => {
      const c = createComponent();
      c.insertPages = [
        { id: 'a', sort_order: 0, label: 'A', mime_type: 'image/png', image_data: 'data:1' },
        { id: 'b', sort_order: 1, label: 'B', mime_type: 'image/png', image_data: 'data:2' },
      ];
      await c.onInsertPageDrop({
        previousIndex: 0,
        currentIndex: 1,
      } as never);
      expect(c.insertPages[0].id).toBe('b');
      expect(mockSupabase.client.from).toHaveBeenCalled();
    });
  });

  describe('openBookletPrint', () => {
    it('calls download with range and a new window on web', async () => {
      const newWin = { close: vi.fn() };
      (window.open as ReturnType<typeof vi.fn>).mockReturnValue(newWin);

      const c = createComponent();
      c.bookletRange = 'twoweeks';

      await c.openBookletPrint();

      expect(mockPrint.downloadPrintableBookletPrayerList).toHaveBeenCalledWith('twoweeks', newWin);
      expect(c.isPrinting).toBe(false);
    });

    it('closes print window when download fails', async () => {
      const newWin = { close: vi.fn() };
      (window.open as ReturnType<typeof vi.fn>).mockReturnValue(newWin);
      mockPrint.downloadPrintableBookletPrayerList.mockRejectedValue(new Error('print failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const c = createComponent();
      await c.openBookletPrint();

      expect(newWin.close).toHaveBeenCalled();
      expect(c.isPrinting).toBe(false);
      consoleSpy.mockRestore();
    });

    it('skips opening a window on native platforms', async () => {
      capHolder.Capacitor = { getPlatform: () => 'ios' };
      const c = createComponent();
      await c.openBookletPrint();
      expect(window.open).not.toHaveBeenCalled();
      expect(mockPrint.downloadPrintableBookletPrayerList).toHaveBeenCalledWith('month', null);
    });
  });

  describe('setBookletRange', () => {
    it('updates bookletRange and marks for check', () => {
      const c = createComponent();
      c.setBookletRange('twomonths');
      expect(c.bookletRange).toBe('twomonths');
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });

  describe('loadInsertPages', () => {
    it('surfaces migration hint when table is missing', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'relation booklet_insert_pages does not exist' },
          }),
        }),
      });
      const c = createComponent();
      await c.loadInsertPages();
      expect(c.insertPagesError).toContain('Apply the latest Supabase migrations');
    });
  });

  describe('onInsertFileSelected', () => {
    it('rejects unsupported mime types', () => {
      const c = createComponent();
      c.onInsertFileSelected({
        target: {
          files: [new File(['x'], 'bad.gif', { type: 'image/gif' })],
          value: 'x',
        },
      } as unknown as Event);
      expect(c.insertPagesError).toContain('PNG and JPEG');
    });

    it('rejects files larger than 2 MB', () => {
      const c = createComponent();
      const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
      c.onInsertFileSelected({
        target: { files: [big], value: 'x' },
      } as unknown as Event);
      expect(c.insertPagesError).toContain('2 MB');
    });

    it('saves a valid PNG via FileReader', async () => {
      const c = createComponent();
      const file = new File(['png'], 'page.png', { type: 'image/png' });
      const readAsDataURL = vi
        .spyOn(FileReader.prototype, 'readAsDataURL')
        .mockImplementation(function (this: FileReader) {
          this.onload?.({ target: { result: 'data:image/png;base64,abc' } } as ProgressEvent<FileReader>);
        });

      c.onInsertFileSelected({
        target: { files: [file], value: 'x' },
      } as unknown as Event);

      await vi.waitFor(() => {
        expect(c.insertPages).toHaveLength(1);
        expect(c.insertPagesBusy).toBe(false);
      });
      readAsDataURL.mockRestore();
    });
  });

  describe('deleteInsertPage', () => {
    it('removes page and normalizes sort order', async () => {
      const c = createComponent();
      c.insertPages = [
        { id: 'a', sort_order: 0, label: 'A', mime_type: 'image/png', image_data: 'data:1' },
        { id: 'b', sort_order: 1, label: 'B', mime_type: 'image/png', image_data: 'data:2' },
      ];
      await c.deleteInsertPage(c.insertPages[0]);
      expect(c.insertPages).toHaveLength(1);
      expect(c.insertPages[0].id).toBe('b');
    });
  });
});
