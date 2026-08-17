import { PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS } from './admin-prayer-editor-search';

export class PrayerEditorSearchDebouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly debounceMs = PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS,
    private readonly onSearch: () => void,
  ) {}

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.clear();
  }

  schedule(trimmedTerm: string, minChars: number, onTooShort: () => void): void {
    this.clear();

    if (trimmedTerm.length === 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.onSearch();
      }, this.debounceMs);
      return;
    }

    if (trimmedTerm.length < minChars) {
      onTooShort();
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      this.onSearch();
    }, this.debounceMs);
  }

  flush(trimmedTerm: string, minChars: number, onTooShort: () => void): void {
    this.clear();
    if (trimmedTerm.length > 0 && trimmedTerm.length < minChars) {
      onTooShort();
      return;
    }
    this.onSearch();
  }
}
