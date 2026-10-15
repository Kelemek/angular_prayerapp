import { describe, it, expect } from 'vitest';
import { supabaseRestJsonHeaders } from './supabase-rest-bearer';

describe('supabaseRestJsonHeaders', () => {
  it('uses anon apikey and separate authorization bearer', () => {
    expect(supabaseRestJsonHeaders('anon-key', 'user-jwt')).toEqual({
      apikey: 'anon-key',
      Authorization: 'Bearer user-jwt',
      'Content-Type': 'application/json',
    });
  });
});
