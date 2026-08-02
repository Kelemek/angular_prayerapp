import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { PersonalCategoryColorPickerComponent } from './personal-category-color-picker.component';

describe('PersonalCategoryColorPickerComponent', () => {
  it('applies stack layout classes to the Custom label', async () => {
    const { container } = await render(PersonalCategoryColorPickerComponent, {
      componentInputs: { layout: 'stack', categoryLabel: 'Family' },
    });
    const customLabel = screen.getByLabelText('Choose custom color');
    expect(customLabel.className).toContain('text-sm');
    expect(customLabel.className).toContain('font-semibold');
    expect(customLabel.className).toContain('mt-2');
    expect(container.textContent).toContain('Family');
  });

  it('applies inline layout classes to the Custom label', async () => {
    await render(PersonalCategoryColorPickerComponent, {
      componentInputs: { layout: 'inline', categoryLabel: 'Family' },
    });
    const customLabel = screen.getByLabelText('Choose custom color');
    expect(customLabel.className).toContain('text-xs');
    expect(customLabel.className).not.toContain('font-semibold');
    expect(customLabel.className).not.toContain('mt-2');
  });
});
