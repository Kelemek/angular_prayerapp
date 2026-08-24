import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerseMemorizationPrayerService } from './verse-memorization-prayer.service';

describe('VerseMemorizationPrayerService', () => {
  let service: VerseMemorizationPrayerService;
  let mockSupabase: {
    client: { from: ReturnType<typeof vi.fn> };
  };
  let mockScripture: { getPassage: ReturnType<typeof vi.fn> };
  let mockBranding: { getBranding: ReturnType<typeof vi.fn> };
  let mockEmail: {
    getEmailBaseUrl: ReturnType<typeof vi.fn>;
    sendVerseMemorizationPrayerNotification: ReturnType<typeof vi.fn>;
  };
  let mockPush: { sendPushToSubscribers: ReturnType<typeof vi.fn> };
  let mockPrayerService: { loadPrayers: ReturnType<typeof vi.fn> };
  let mockUserSession: { getUserEmail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn(),
      },
    };
    mockScripture = {
      getPassage: vi.fn().mockResolvedValue({ text: 'For God so loved the world.' }),
    };
    mockBranding = {
      getBranding: vi.fn().mockReturnValue({ appTitle: 'Prayer App', appSubtitle: '' }),
    };
    mockEmail = {
      getEmailBaseUrl: vi.fn().mockReturnValue('https://app.example.com'),
      sendVerseMemorizationPrayerNotification: vi.fn().mockResolvedValue(undefined),
    };
    mockPush = {
      sendPushToSubscribers: vi.fn().mockResolvedValue(undefined),
    };
    mockPrayerService = {
      loadPrayers: vi.fn().mockResolvedValue(undefined),
    };
    mockUserSession = {
      getUserEmail: vi.fn().mockReturnValue('admin@example.com'),
    };

    service = new VerseMemorizationPrayerService(
      mockSupabase as any,
      mockScripture as any,
      mockBranding as any,
      mockEmail as any,
      mockPush as any,
      mockPrayerService as any,
      mockUserSession as any
    );
  });

  it('createVerseMemorizationPrayer inserts approved verse memorization prayer without notifying', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'prayer-verse-1' }, error: null }),
      }),
    });
    mockSupabase.client.from.mockReturnValue({ insert });

    const result = await service.createVerseMemorizationPrayer({
      reference: 'John 3:16',
      translation: 'esv',
      adminMessage: 'Focus on this week.',
    });

    expect(result).toEqual({
      ok: true,
      prayerId: 'prayer-verse-1',
      verseText: 'For God so loved the world.',
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        approval_status: 'approved',
        status: 'current',
        content_kind: 'verse_memorization',
        description: 'For God so loved the world. John 3:16',
        verse_reference: 'John 3:16',
        verse_translation: 'esv',
        prayer_for: 'Verse Memorization',
        admin_message: 'Focus on this week.',
      })
    );
    expect(mockEmail.sendVerseMemorizationPrayerNotification).not.toHaveBeenCalled();
    expect(mockPush.sendPushToSubscribers).not.toHaveBeenCalled();
    expect(mockPrayerService.loadPrayers).toHaveBeenCalledWith(false);
  });

  it('broadcastVerseMemorizationPrayerNotifications sends email and push', async () => {
    await service.broadcastVerseMemorizationPrayerNotifications({
      prayerId: 'prayer-verse-1',
      verseReference: 'John 3:16',
      verseTranslation: 'esv',
      verseText: 'For God so loved the world.',
      adminMessage: 'Focus on this week.',
    });

    expect(mockEmail.sendVerseMemorizationPrayerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        prayerId: 'prayer-verse-1',
        verseReference: 'John 3:16',
        verseTranslation: 'esv',
      })
    );
    expect(mockPush.sendPushToSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'verse_memorization_prayer',
          prayerId: 'prayer-verse-1',
          verseRef: 'John 3:16',
          verseTranslation: 'esv',
        }),
      })
    );
  });

  it('returns no_admin_email when session email is missing', async () => {
    mockUserSession.getUserEmail.mockReturnValue(null);

    const result = await service.createVerseMemorizationPrayer({
      reference: 'John 3:16',
      translation: 'esv',
    });

    expect(result).toEqual({ ok: false, reason: 'no_admin_email' });
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });
});
