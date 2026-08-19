import {
  SCRIPTURE_HOVER_PREVIEW_ANCHOR_GAP_PX,
  SCRIPTURE_HOVER_PREVIEW_MIN_POPOVER_MAX_HEIGHT_PX,
  SCRIPTURE_HOVER_PREVIEW_MODAL_LAYOUT_HEIGHT_CAP_PX,
  SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_BREAKPOINT_DESKTOP,
  SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_BREAKPOINT_TABLET,
  SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DEFAULT_PX,
  SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DESKTOP_PX,
  SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_TABLET_PX,
  SCRIPTURE_HOVER_PREVIEW_PLACEMENT_PROBE_HEIGHT_PX,
  SCRIPTURE_HOVER_PREVIEW_VIEWPORT_PADDING_PX,
} from './scripture-hover-preview-constants';

export interface ScriptureHoverPreviewPlacement {
  positionX: number;
  positionY: number;
  popoverWidthPx: number;
  popoverMaxHeightPx: number;
  isAbove: boolean;
}

export function scriptureHoverPreviewModalWidthCapPx(viewportWidth: number): number {
  if (viewportWidth >= SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_BREAKPOINT_DESKTOP) {
    return SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DESKTOP_PX;
  }
  if (viewportWidth >= SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_BREAKPOINT_TABLET) {
    return SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_TABLET_PX;
  }
  return SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DEFAULT_PX;
}

export function scriptureHoverPreviewModalMaxHeightPx(
  viewportHeight: number,
  pad: number
): number {
  const usable = viewportHeight - 2 * pad;
  return Math.min(
    SCRIPTURE_HOVER_PREVIEW_MODAL_LAYOUT_HEIGHT_CAP_PX,
    Math.max(1, usable)
  );
}

export function scriptureHoverPreviewLayoutViewportSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  const rawW = vv?.width ?? document.documentElement?.clientWidth ?? window.innerWidth;
  const rawH = vv?.height ?? document.documentElement?.clientHeight ?? window.innerHeight;
  const w = Math.round(rawW > 0 ? rawW : window.innerWidth);
  const h = Math.round(rawH > 0 ? rawH : window.innerHeight);
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

export function computeScriptureHoverPreviewPlacement(
  centerX: number,
  centerY: number
): ScriptureHoverPreviewPlacement {
  const { w: sw, h: sh } = scriptureHoverPreviewLayoutViewportSize();
  const pad = SCRIPTURE_HOVER_PREVIEW_VIEWPORT_PADDING_PX;
  const inner = sw - 2 * pad;
  const widthCap = scriptureHoverPreviewModalWidthCapPx(sw);
  const modalWidth = inner <= 0 ? Math.min(widthCap, sw) : Math.min(widthCap, inner);
  const viewportMaxH = scriptureHoverPreviewModalMaxHeightPx(sh, pad);
  const fitProbe = Math.min(SCRIPTURE_HOVER_PREVIEW_PLACEMENT_PROBE_HEIGHT_PX, viewportMaxH);
  const gap = SCRIPTURE_HOVER_PREVIEW_ANCHOR_GAP_PX;

  const halfW = modalWidth / 2;
  const x = Math.min(Math.max(centerX, pad + halfW), sw - pad - halfW);

  const aboveBottom = centerY - gap;
  const aboveTop = aboveBottom - fitProbe;
  const belowTop = centerY + gap;
  const belowBottom = belowTop + fitProbe;
  const spaceAbove = centerY - gap - pad;
  const spaceBelow = sh - pad - centerY - gap;

  let y: number;
  let positionAbove: boolean;
  let maxH: number;

  if (aboveTop >= pad) {
    positionAbove = true;
    maxH = Math.min(
      viewportMaxH,
      Math.max(SCRIPTURE_HOVER_PREVIEW_MIN_POPOVER_MAX_HEIGHT_PX, centerY - gap - pad)
    );
    y = aboveBottom;
    y = Math.min(y, sh - pad);
    y = Math.max(y, pad + maxH);
  } else if (belowBottom <= sh - pad) {
    positionAbove = false;
    maxH = Math.min(
      viewportMaxH,
      Math.max(SCRIPTURE_HOVER_PREVIEW_MIN_POPOVER_MAX_HEIGHT_PX, sh - pad - centerY - gap)
    );
    y = belowTop;
    y = Math.max(pad, Math.min(y, sh - pad - maxH));
  } else if (spaceBelow >= spaceAbove) {
    positionAbove = false;
    maxH = Math.min(
      viewportMaxH,
      Math.max(SCRIPTURE_HOVER_PREVIEW_MIN_POPOVER_MAX_HEIGHT_PX, spaceBelow)
    );
    y = belowTop;
    y = Math.max(pad, Math.min(y, sh - pad - maxH));
  } else {
    positionAbove = true;
    maxH = Math.min(
      viewportMaxH,
      Math.max(SCRIPTURE_HOVER_PREVIEW_MIN_POPOVER_MAX_HEIGHT_PX, spaceAbove)
    );
    y = aboveBottom;
    y = Math.min(y, sh - pad);
    y = Math.max(y, pad + maxH);
  }

  return {
    positionX: x,
    positionY: y,
    popoverWidthPx: modalWidth,
    popoverMaxHeightPx: maxH,
    isAbove: positionAbove,
  };
}

export function nudgeScriptureHoverPreviewPosition(
  positionX: number,
  positionY: number,
  popoverEl: HTMLElement
): { positionX: number; positionY: number } | null {
  const pad = SCRIPTURE_HOVER_PREVIEW_VIEWPORT_PADDING_PX;
  const { w: sw, h: sh } = scriptureHoverPreviewLayoutViewportSize();
  const r = popoverEl.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;

  let dx = 0;
  if (r.left < pad - 0.5) dx = pad - r.left;
  else if (r.right > sw - pad + 0.5) dx = sw - pad - r.right;

  let dy = 0;
  if (r.top < pad - 0.5) dy = pad - r.top;
  else if (r.bottom > sh - pad + 0.5) dy = sh - pad - r.bottom;

  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;

  return { positionX: positionX + dx, positionY: positionY + dy };
}
