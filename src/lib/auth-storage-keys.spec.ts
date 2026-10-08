import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOGIN_PATH, openLoginPageNow } from './auth-storage-keys';

describe('openLoginPageNow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('replaces the document when the wiped home page is still showing', () => {
    const replace = vi.fn();
    vi.stubGlobal('window', {
      location: {
        pathname: '/',
        search: '',
        replace,
      },
    });

    openLoginPageNow();

    expect(replace).toHaveBeenCalledWith(LOGIN_PATH);
  });

  it('does not replace when login is already open', () => {
    const replace = vi.fn();
    vi.stubGlobal('window', {
      location: {
        pathname: LOGIN_PATH,
        search: '',
        replace,
      },
    });

    openLoginPageNow();

    expect(replace).not.toHaveBeenCalled();
  });
});
