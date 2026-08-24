export type VerseMemorizationDeepLinkPending = {
  reference: string;
  translation?: string;
};

/** Apply a pending verse memorization deep link (email/push / URL query params). */
export function applyVerseMemorizationDeepLink(options: {
  consumePending: () => VerseMemorizationDeepLinkPending | null;
  stripQueryParams: () => void;
  beginFromCard: (
    reference: string,
    translation?: string | null
  ) => void | Promise<void>;
}): void {
  const pending = options.consumePending();
  if (!pending) {
    return;
  }
  options.stripQueryParams();
  void options.beginFromCard(pending.reference, pending.translation);
}
