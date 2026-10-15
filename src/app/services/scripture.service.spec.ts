import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { ScriptureService } from './scripture.service';

describe('ScriptureService', () => {
  let service: ScriptureService;
  let supabase: {
    getSupabaseUrl: ReturnType<typeof vi.fn>;
    getSupabaseKey: ReturnType<typeof vi.fn>;
    client: { auth: { getSession: ReturnType<typeof vi.fn> } };
  };

  beforeEach(() => {
    supabase = {
      getSupabaseUrl: vi.fn(() => 'https://example.supabase.co'),
      getSupabaseKey: vi.fn(() => 'anon-key'),
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        },
      },
    };
    wireGatedSupabaseMock(supabase);
    service = new ScriptureService(supabase as never);
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends anon key as Bearer when there is no Supabase session (MFA login)', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ reference: 'John 3:16', text: 'For God…', translation: 'esv' }),
    } as Response);

    await service.getPassage('John 3:16', 'esv');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/scripture?'),
      expect.objectContaining({
        headers: {
          apikey: 'anon-key',
          Authorization: 'Bearer anon-key',
        },
      })
    );
  });

  it('uses the user access token when a Supabase session exists', async () => {
    supabase.client.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'user-jwt' } },
    });
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ reference: 'John 3:16', text: 'For God…', translation: 'esv' }),
    } as Response);

    await service.getPassage('John 3:16', 'esv');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          apikey: 'anon-key',
          Authorization: 'Bearer user-jwt',
        },
      })
    );
  });

  it('getPassage throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    } as Response);

    await expect(service.getPassage('Bad Ref')).rejects.toThrow('Not found');
  });

  it('getAudioUrl returns payload on success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ audioUrl: 'https://audio.example/verse.mp3', useSpeechSynthesis: false }),
    } as Response);

    const result = await service.getAudioUrl('John 3:16', 'esv');
    expect(result.audioUrl).toBe('https://audio.example/verse.mp3');
    expect(result.useSpeechSynthesis).toBe(false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/scripture-audio?'),
      expect.any(Object)
    );
  });

  it('getAudioUrl throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Audio unavailable' }),
    } as Response);

    await expect(service.getAudioUrl('John 3:16')).rejects.toThrow('Audio unavailable');
  });
});
