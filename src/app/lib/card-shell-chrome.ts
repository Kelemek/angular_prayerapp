/** Shared shell padding tokens for prayer and prompt cards. */
export interface CardShellPaddingTokens {
  shellPaddingClasses: string;
  shellTopPadding?: string;
  shellBottomPadding?: string;
  shellOuterMargin?: string;
}

export function joinCardShellClassParts(
  shellBaseClasses: string,
  padding: CardShellPaddingTokens,
  extra = ''
): string {
  return [
    shellBaseClasses,
    padding.shellPaddingClasses,
    padding.shellTopPadding,
    padding.shellBottomPadding,
    padding.shellOuterMargin,
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Regression guard: card modals must render outside the isolated shell subtree.
 * Used by prayer-card and prompt-card template specs.
 */
export function cardModalsRenderOutsideShell(
  templateHtml: string,
  shellMarker: string,
  modalsComponentTag: string,
  insideShellContentMarker: string
): boolean {
  const shellOpen = templateHtml.indexOf(shellMarker);
  const outsideMarker = templateHtml.indexOf(
    'Outside bg-card-shell-fill (isolation: isolate)'
  );
  const modalsPos = templateHtml.indexOf(modalsComponentTag);

  if (shellOpen < 0 || outsideMarker < 0 || modalsPos < 0) {
    return false;
  }
  if (outsideMarker <= shellOpen || modalsPos <= outsideMarker) {
    return false;
  }

  const shellSubtree = templateHtml.slice(shellOpen, outsideMarker);
  return (
    shellSubtree.includes(insideShellContentMarker) &&
    !shellSubtree.includes(modalsComponentTag)
  );
}
