import { describe, it, expect } from 'vitest';
import { normalizeAdminHelpVideoEmbedUrl } from './admin-help-video-url';

describe('normalizeAdminHelpVideoEmbedUrl', () => {
  it('returns null for empty input', () => {
    expect(normalizeAdminHelpVideoEmbedUrl(undefined)).toBeNull();
    expect(normalizeAdminHelpVideoEmbedUrl(null)).toBeNull();
    expect(normalizeAdminHelpVideoEmbedUrl('')).toBeNull();
    expect(normalizeAdminHelpVideoEmbedUrl('   ')).toBeNull();
  });

  it('returns null for non-https URLs', () => {
    expect(normalizeAdminHelpVideoEmbedUrl('http://www.youtube.com/embed/abc')).toBeNull();
  });

  it('returns null for disallowed hosts', () => {
    expect(normalizeAdminHelpVideoEmbedUrl('https://evil.com/embed/foo')).toBeNull();
  });

  it('normalizes YouTube watch URL to nocookie embed', () => {
    expect(
      normalizeAdminHelpVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    ).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('accepts existing YouTube embed URL', () => {
    const url = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    expect(normalizeAdminHelpVideoEmbedUrl(url)).toBe(url);
  });

  it('accepts Vimeo player URL', () => {
    const url = 'https://player.vimeo.com/video/123456789';
    expect(normalizeAdminHelpVideoEmbedUrl(url)).toBe(url);
  });
});
