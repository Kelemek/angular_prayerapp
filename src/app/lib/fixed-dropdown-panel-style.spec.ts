import { describe, expect, it } from 'vitest';
import { buildFixedDropdownPanelStyle } from './fixed-dropdown-panel-style';

describe('buildFixedDropdownPanelStyle', () => {
  it('anchors the panel to the trigger width and below it', () => {
    const trigger = {
      getBoundingClientRect: () => ({
        top: 100,
        bottom: 140,
        left: 50,
        right: 250,
        width: 200,
        height: 40,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const style = buildFixedDropdownPanelStyle(trigger);

    expect(style.left).toBe('50px');
    expect(style.width).toBe('200px');
    expect(style.top).toBe('144px');
  });
});
