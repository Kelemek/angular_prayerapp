import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { PrayerCardMetaHeaderComponent } from './prayer-card-meta-header.component';
import { PersonalCategoryColorService } from '../../services/personal-category-color.service';

describe('PrayerCardMetaHeaderComponent overflow items', () => {
  it('includes reminder, answered, edit, and delete for a personal card', () => {
    const component = new PrayerCardMetaHeaderComponent();
    component.prayerCreatedAt = '2026-01-01T00:00:00Z';
    component.isPersonal = true;
    component.showReminder = true;
    component.hasReminder = false;
    component.showDelete = true;
    component.category = 'Health';
    component.reminderBellTourId = 'tour-prayer-reminder-bell';
    component.personalAnsweredTourId = 'tour-walkthrough-personal-answered';
    component.personalEditTourId = 'tour-walkthrough-personal-edit';
    component.personalDeleteTourId = 'tour-walkthrough-personal-delete';

    expect(component.overflowItems.map((item) => item.id)).toEqual([
      'reminder',
      'answered',
      'edit',
      'delete',
    ]);
    expect(component.overflowItems[0]?.tourAnchorId).toBe(
      'tour-prayer-reminder-bell'
    );
    expect(component.overflowItems[1]?.tourAnchorId).toBe(
      'tour-walkthrough-personal-answered'
    );
    expect(component.overflowItems[1]?.tone).toBe('blue');
    expect(component.overflowItems[2]?.tourAnchorId).toBe(
      'tour-walkthrough-personal-edit'
    );
    expect(component.overflowItems[3]?.tourAnchorId).toBe(
      'tour-walkthrough-personal-delete'
    );
  });

  it('uses the group prayer status for the answered label', () => {
    const component = new PrayerCardMetaHeaderComponent();
    component.prayerCreatedAt = '2026-01-01T00:00:00Z';
    component.groupName = 'Family';
    component.canEditGroupPrayer = true;
    component.canMarkGroupPrayerAnswered = true;
    component.status = 'answered';
    component.showDelete = true;
    component.showReminder = true;

    expect(component.isAnswered).toBe(true);
    expect(component.overflowItems.map((item) => item.id)).toEqual([
      'reminder',
      'answered',
      'edit',
      'delete',
    ]);
    expect(component.overflowItems[1]?.label).toBe('Mark as unanswered');
    expect(component.overflowItems[1]?.tone).toBe('green');
  });

  it('uses blue for unanswered mark-as-answered and green once answered', () => {
    const personal = new PrayerCardMetaHeaderComponent();
    personal.prayerCreatedAt = '2026-01-01T00:00:00Z';
    personal.isPersonal = true;
    personal.category = 'Health';
    expect(personal.overflowItems.find((item) => item.id === 'answered')?.tone).toBe(
      'blue'
    );
    personal.category = 'Answered';
    expect(personal.overflowItems.find((item) => item.id === 'answered')?.tone).toBe(
      'green'
    );

    const group = new PrayerCardMetaHeaderComponent();
    group.prayerCreatedAt = '2026-01-01T00:00:00Z';
    group.groupName = 'Family';
    group.canEditGroupPrayer = true;
    group.canMarkGroupPrayerAnswered = true;
    group.status = 'current';
    expect(group.overflowItems.find((item) => item.id === 'answered')?.tone).toBe(
      'blue'
    );
    group.status = 'answered';
    expect(group.overflowItems.find((item) => item.id === 'answered')?.tone).toBe(
      'green'
    );
  });

  it('replaces the group name with the personal Answered header when the prayer is answered', async () => {
    const { container } = await render(PrayerCardMetaHeaderComponent, {
      componentInputs: {
        prayerCreatedAt: '2026-01-01T00:00:00Z',
        groupName: 'testing',
        groupId: 'group-1',
        canChangeGroupColor: true,
        status: 'answered',
      },
      providers: [
        {
          provide: PersonalCategoryColorService,
          useValue: {
            colors$: of({ Answered: '#39704D' }),
            loadColors: vi.fn().mockResolvedValue({}),
            getColorsSnapshot: () => ({ Answered: '#39704D' }),
            getColor: (category: string) =>
              category === 'Answered' ? '#39704D' : '#2563EB',
          },
        },
      ],
    });

    const label = screen.getByText('Answered');
    const band = label.closest('button.personal-category-header-band');
    expect(band?.className).toContain('items-center');
    expect(band?.getAttribute('style')).toContain('#39704D');
    expect(band?.getAttribute('aria-label')).toBe('Change category color');
    expect(screen.queryByText('testing')).toBeNull();
    expect(
      container.querySelector('[data-group-prayer-header-pill]')
    ).toBeNull();
  });

  it('keeps the group name when the prayer is not answered', async () => {
    await render(PrayerCardMetaHeaderComponent, {
      componentInputs: {
        prayerCreatedAt: '2026-01-01T00:00:00Z',
        groupName: 'testing',
        status: 'current',
      },
    });

    expect(screen.getByText('testing').textContent?.trim()).toBe('testing');
    expect(screen.queryByText('Answered')).toBeNull();
  });

  it('hides group edit and answered for non-requesters', () => {
    const component = new PrayerCardMetaHeaderComponent();
    component.prayerCreatedAt = '2026-01-01T00:00:00Z';
    component.groupName = 'Family';
    component.isPersonal = true;
    component.showDelete = true;

    expect(component.overflowItems.map((item) => item.id)).toEqual(['delete']);
  });

  it('runs the matching action from overflow item onSelect', () => {
    const component = new PrayerCardMetaHeaderComponent();
    const emitted: string[] = [];
    component.edit.subscribe(() => emitted.push('edit'));
    component.delete.subscribe(() => emitted.push('delete'));
    component.reminder.subscribe(() => emitted.push('reminder'));
    component.toggleAnswered.subscribe(() => emitted.push('answered'));
    component.isPersonal = true;
    component.showReminder = true;
    component.showDelete = true;
    component.prayerCreatedAt = '2026-01-01T00:00:00Z';

    for (const item of component.overflowItems) {
      item.onSelect();
    }
    expect(emitted).toEqual(['reminder', 'answered', 'edit', 'delete']);
  });
});
