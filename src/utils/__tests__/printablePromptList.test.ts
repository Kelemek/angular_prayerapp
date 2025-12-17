import 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase module with a hoist-safe async factory, then import the module under test
vi.mock('../../lib/supabase', async () => {
  return {
    supabase: {
      from: vi.fn(),
      channel: vi.fn(),
      removeChannel: vi.fn()
    },
    handleSupabaseError: vi.fn()
  } as any;
});

import { supabase } from '../../lib/supabase';

describe('downloadPrintablePromptList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    if ((window.open as any).mockRestore) {
      try { (window.open as any).mockRestore() } catch (e) { /* ignore */ }
    }
  });

  it('alerts and closes provided window when supabase returns an error', async () => {
    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith('Failed to fetch prayer prompts. Please try again.');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('alerts and closes when no prompts are returned', async () => {
    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith('No prayer prompts found.');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('writes HTML to provided window when prompts exist and focuses window', async () => {
    const now = new Date().toISOString();
    const samplePrompt = {
      id: 'pp1',
      title: 'Pray for City',
      type: 'Supplication',
      description: 'Pray for safety',
      created_at: now
    } as any;

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrompt], error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ name: 'Supplication', display_order: 1 }], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const focusSpy = vi.fn();
    const fakeWin: any = { document: fakeDoc, focus: focusSpy };

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], fakeWin as any);

    expect(fakeDoc.open).toHaveBeenCalled();
    expect(fakeDoc.write).toHaveBeenCalled();
    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    expect(written).toContain('Pray for City');
    expect(written).toContain('Supplication');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('falls back to download when popup blocked', async () => {
    const now = new Date().toISOString();
    const samplePrompt = {
      id: 'pp2',
      title: 'Pray for Neighbors',
      type: 'Praise',
      description: 'Thanks',
      created_at: now
    } as any;

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrompt], error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    // simulate popup blocked
    vi.spyOn(window, 'open').mockReturnValue(null as any);

    // JSDOM may not implement URL.createObjectURL — provide a stub on global
    const createUrlSpy = vi.fn().mockReturnValue('blob:fake');
    const revokeUrlSpy = vi.fn();
    (globalThis as any).URL = { createObjectURL: createUrlSpy, revokeObjectURL: revokeUrlSpy };
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], null);

    expect(createUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Prayer prompts downloaded. Please open the file to view and print.');

    createUrlSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('continues with default sorting when prayer types fetch fails', async () => {
    const now = new Date().toISOString();
    const prompts = [
      { id: 'pp3', title: 'Z Title', type: 'Confession', description: 'Confess', created_at: now },
      { id: 'pp4', title: 'A Title', type: 'Praise', description: 'Praise', created_at: now }
    ];

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: prompts, error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Types error' } })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const fakeWin: any = { document: fakeDoc, focus: vi.fn() };

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], fakeWin as any);

    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    // Should still generate HTML even with types error
    expect(written).toContain('Z Title');
    expect(written).toContain('A Title');
  });

  it('sorts prompts by prayer type display order when types are available', async () => {
    const now = new Date().toISOString();
    const prompts = [
      { id: 'pp5', title: 'First', type: 'Praise', description: 'Praise God', created_at: now },
      { id: 'pp6', title: 'Second', type: 'Confession', description: 'Confess sins', created_at: now },
      { id: 'pp7', title: 'Third', type: 'Supplication', description: 'Ask for needs', created_at: now }
    ];

    const types = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 },
      { name: 'Supplication', display_order: 3 }
    ];

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: prompts, error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: types, error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const fakeWin: any = { document: fakeDoc, focus: vi.fn() };

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], fakeWin as any);

    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    // Should appear in order: Praise (1), Confession (2), Supplication (3)
    const firstIndex = written.indexOf('First');
    const secondIndex = written.indexOf('Second');
    const thirdIndex = written.indexOf('Third');
    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(-1);
    expect(thirdIndex).toBeGreaterThan(-1);
    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  it('handles multiple prompts of same type and different types', async () => {
    const now = new Date().toISOString();
    const prompts = [
      { id: 'pp8', title: 'Morning Praise', type: 'Praise', description: 'Morning praise', created_at: now },
      { id: 'pp9', title: 'Evening Praise', type: 'Praise', description: 'Evening praise', created_at: now },
      { id: 'pp10', title: 'Daily Confession', type: 'Confession', description: 'Daily confession', created_at: now }
    ];

    const types = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 }
    ];

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: prompts, error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: types, error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const fakeWin: any = { document: fakeDoc, focus: vi.fn() };

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], fakeWin as any);

    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    expect(written).toContain('Morning Praise');
    expect(written).toContain('Evening Praise');
    expect(written).toContain('Daily Confession');
  });

  it('filters prompts by selected types', async () => {
    const now = new Date().toISOString();
    const prompts = [
      { id: 'pp11', title: 'Praise Prompt', type: 'Praise', description: 'Praise God', created_at: now },
      { id: 'pp12', title: 'Confession Prompt', type: 'Confession', description: 'Confess sins', created_at: now },
      { id: 'pp13', title: 'Thanksgiving Prompt', type: 'Thanksgiving', description: 'Give thanks', created_at: now }
    ];

    const types = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 },
      { name: 'Thanksgiving', display_order: 3 }
    ];

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: prompts, error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: types, error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const fakeWin: any = { document: fakeDoc, focus: vi.fn() };

    const mod = await import('../printablePromptList');
    // Only request Praise and Thanksgiving types
    await mod.downloadPrintablePromptList(['Praise', 'Thanksgiving'], fakeWin as any);

    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    // Should include Praise and Thanksgiving
    expect(written).toContain('Praise Prompt');
    expect(written).toContain('Thanksgiving Prompt');
    // Should NOT include Confession (not in selected types)
    expect(written).not.toContain('Confession Prompt');
  });

  it('alerts and closes window when no prompts match selected types', async () => {
    const now = new Date().toISOString();
    const prompts = [
      { id: 'pp14', title: 'Praise Prompt', type: 'Praise', description: 'Praise God', created_at: now },
      { id: 'pp15', title: 'Confession Prompt', type: 'Confession', description: 'Confess sins', created_at: now }
    ];

    const types = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 }
    ];

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: prompts, error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: types, error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePromptList');
    // Request a type that doesn't exist in the data
    await mod.downloadPrintablePromptList(['Thanksgiving'], fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith('No prayer prompts found for the selected types.');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('handles unexpected errors in the catch block', async () => {
    // Make supabase.from throw an error
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('Unexpected database error');
    });

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList([], fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith('An error occurred while generating the prayer prompts list.');
    expect(closeSpy).toHaveBeenCalled();
  });
});
