import { Observable, Subscription } from 'rxjs';

/**
 * Resolves when auth `loading$` emits false, or when `timeoutMs` elapses.
 * A BehaviorSubject that is already false emits inside `subscribe`, before the
 * subscription binding exists. Unsubscribing in that turn throws
 * `Cannot access 'subscription' before initialization` and aborts bootstrap,
 * which leaves the native WebView on an empty page.
 */
export function whenAuthLoadingFinishes(
  loading$: Observable<boolean>,
  options: {
    timeoutMs: number;
    onReady: () => void;
    onTimeout: () => void;
  }
): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (timedOut: boolean) => {
      if (resolved) {
        return;
      }
      resolved = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (timedOut) {
        options.onTimeout();
      } else {
        options.onReady();
      }
      queueMicrotask(() => subscription.unsubscribe());
      resolve();
    };

    timer = setTimeout(() => finish(true), options.timeoutMs);

    const subscription: Subscription = loading$.subscribe((isLoading) => {
      if (!isLoading) {
        finish(false);
      }
    });
  });
}
