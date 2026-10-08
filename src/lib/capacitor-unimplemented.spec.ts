import { describe, it, expect } from 'vitest';
import { isCapacitorUnimplementedError } from './capacitor-unimplemented';

describe('isCapacitorUnimplementedError', () => {
  it('detects object and JSON string UNIMPLEMENTED', () => {
    expect(isCapacitorUnimplementedError({ code: 'UNIMPLEMENTED' })).toBe(true);
    expect(isCapacitorUnimplementedError('{"code":"UNIMPLEMENTED"}')).toBe(true);
    expect(isCapacitorUnimplementedError({ code: 'OTHER' })).toBe(false);
  });
});
