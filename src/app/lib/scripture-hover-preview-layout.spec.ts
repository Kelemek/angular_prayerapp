import { describe, it, expect } from 'vitest';
import {
  computeScriptureHoverPreviewPlacement,
  scriptureHoverPreviewModalWidthCapPx,
} from './scripture-hover-preview-layout';
import { SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DEFAULT_PX } from './scripture-hover-preview-constants';

describe('scriptureHoverPreviewModalWidthCapPx', () => {
  it('uses default cap on narrow viewports', () => {
    expect(scriptureHoverPreviewModalWidthCapPx(400)).toBe(
      SCRIPTURE_HOVER_PREVIEW_MODAL_WIDTH_CAP_DEFAULT_PX
    );
  });
});

describe('computeScriptureHoverPreviewPlacement', () => {
  it('places popover within viewport bounds', () => {
    const placement = computeScriptureHoverPreviewPlacement(200, 300);
    expect(placement.popoverWidthPx).toBeGreaterThan(0);
    expect(placement.popoverMaxHeightPx).toBeGreaterThan(0);
    expect(placement.positionX).toBeGreaterThan(0);
    expect(placement.positionY).toBeGreaterThan(0);
  });
});
