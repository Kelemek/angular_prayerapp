import { describe, it, expect, vi } from 'vitest';
import { searchPrayerPrompts } from './admin-prompt-manager-fetch';

describe('admin-prompt-manager-fetch', () => {
  it('filters prompts by query client-side', async () => {
    const supabase = {
      directQuery: vi.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Alpha',
            type: 'Guidance',
            description: 'one',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
          {
            id: '2',
            title: 'Beta',
            type: 'Healing',
            description: 'two',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
        error: null,
      }),
    };

    const results = await searchPrayerPrompts(supabase as never, 'healing');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Beta');
  });
});
