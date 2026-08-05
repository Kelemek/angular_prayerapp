import { describe, expect, it } from 'vitest';
import {
  buildPrayerSpotlightAppLink,
  spotlightKeyToPrayerId,
} from './hourly-prayer-spotlight-deep-link';

describe('spotlightKeyToPrayerId', () => {
  it('maps community spotlight key to prayer id', () => {
    expect(spotlightKeyToPrayerId('c:abc-123')).toBe('abc-123');
  });

  it('maps personal spotlight key to prayer id', () => {
    expect(spotlightKeyToPrayerId('p:personal-99')).toBe('personal-99');
  });

  it('returns null for empty or malformed keys', () => {
    expect(spotlightKeyToPrayerId(null)).toBeNull();
    expect(spotlightKeyToPrayerId('')).toBeNull();
    expect(spotlightKeyToPrayerId('abc')).toBeNull();
    expect(spotlightKeyToPrayerId('c:')).toBeNull();
    expect(spotlightKeyToPrayerId('x:uuid')).toBeNull();
  });
});

describe('buildPrayerSpotlightAppLink', () => {
  it('returns home link when spotlight key is missing', () => {
    expect(buildPrayerSpotlightAppLink('https://app.example.com', null)).toBe(
      'https://app.example.com/'
    );
  });

  it('returns deep link when spotlight key resolves to a prayer id', () => {
    expect(
      buildPrayerSpotlightAppLink('https://app.example.com', 'c:prayer-1')
    ).toBe('https://app.example.com/?prayerId=prayer-1');
  });

  it('encodes prayer id query values', () => {
    expect(
      buildPrayerSpotlightAppLink('https://app.example.com/', 'p:id with spaces')
    ).toBe('https://app.example.com/?prayerId=id%20with%20spaces');
  });
});
