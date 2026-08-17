import {
  PROMPT_SEARCH_DEBOUNCE_MS,
  PROMPT_SEARCH_MIN_CHARS,
} from './admin-prompt-manager';

export class PromptManagerSearchDebouncer {
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

export const PROMPT_MANAGER_SEARCH_CONFIG = {
  minChars: PROMPT_SEARCH_MIN_CHARS,
  debounceMs: PROMPT_SEARCH_DEBOUNCE_MS,
};
