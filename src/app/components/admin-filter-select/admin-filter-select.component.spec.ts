import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AdminFilterSelectComponent } from './admin-filter-select.component';

describe('AdminFilterSelectComponent', () => {
  const options = [
    { value: 'all', label: 'All Statuses' },
    { value: 'current', label: 'Current' },
  ] as const;

  it('shows placeholder when no value is selected', async () => {
    await render(AdminFilterSelectComponent, {
      componentInputs: {
        placeholder: 'Select status...',
        options,
        ariaLabel: 'Prayer status filter',
      },
    });

    const trigger = screen.getByRole('button', { name: 'Prayer status filter' });
    expect(trigger.textContent).toContain('Select status...');
  });

  it('emits the chosen option and closes the menu', async () => {
    const user = userEvent.setup();
    const valueChange = vi.fn();

    await render(AdminFilterSelectComponent, {
      componentInputs: {
        placeholder: 'Select status...',
        options,
        ariaLabel: 'Prayer status filter',
      },
      on: { valueChange },
    });

    await user.click(screen.getByRole('button', { name: 'Prayer status filter' }));
    await user.click(screen.getByRole('option', { name: 'Current' }));

    expect(valueChange).toHaveBeenCalledWith('current');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
