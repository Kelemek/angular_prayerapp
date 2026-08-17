import {
  EMAIL_SUBSCRIBER_LIST_SEARCH_DEBOUNCE_MS,
  EMAIL_SUBSCRIBER_LIST_SEARCH_MIN_CHARS,
} from './admin-email-subscribers';

export class EmailSubscriberListSearchDebouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly debounceMs: number,
    private readonly onSearch: () => void,
  ) {}

  schedule(trimmedQuery: string, minChars: number, onWait?: () => void): void {
    this.clearTimer();
    if (trimmedQuery.length === 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.onSearch();
      }, this.debounceMs);
      return;
    }
    if (trimmedQuery.length < minChars) {
      onWait?.();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.onSearch();
    }, this.debounceMs);
  }

  flush(trimmedQuery: string, minChars: number, onWait?: () => void): void {
    this.clearTimer();
    if (trimmedQuery.length > 0 && trimmedQuery.length < minChars) {
      onWait?.();
      return;
    }
    this.onSearch();
  }

  clear(): void {
    this.clearTimer();
  }

  destroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const EMAIL_SUBSCRIBER_LIST_SEARCH_CONFIG = {
  minChars: EMAIL_SUBSCRIBER_LIST_SEARCH_MIN_CHARS,
  debounceMs: EMAIL_SUBSCRIBER_LIST_SEARCH_DEBOUNCE_MS,
};
