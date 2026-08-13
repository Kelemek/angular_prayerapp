import { describe, expect, it } from 'vitest';
import { CardMetaHeaderBandComponent } from './card-meta-header-band.component';

describe('CardMetaHeaderBandComponent', () => {
  it('uses symmetric flanking columns so presentation date/time stay centered', () => {
    const component = new CardMetaHeaderBandComponent();
    component.bandSize = 'sm';
    component.centerDate = 'Apr 18, 2026';
    component.centerTime = '08:48 AM';

    expect(component.centerClass).toContain('text-center');
    expect(component.centerClass).not.toContain('max-w-');
  });

  it('stacks home date/time below sm', () => {
    const component = new CardMetaHeaderBandComponent();
    component.bandSize = 'sm';
    component.centerDate = 'Apr 18, 2026';
    component.centerTime = '08:48 AM';

    expect(component.centerClass).not.toContain('whitespace-nowrap');
  });
});
