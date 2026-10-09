import { describe, it, expect } from 'vitest';
import {
  SETTINGS_CHOICE_SELECTED_CLASS,
  SETTINGS_CHOICE_UNSELECTED_CLASS,
  settingsChoiceNgClass,
} from './settings-choice-ui';

describe('settingsChoiceNgClass', () => {
  it('marks selected state', () => {
    const classes = settingsChoiceNgClass(true);
    expect(classes[SETTINGS_CHOICE_SELECTED_CLASS]).toBe(true);
    expect(classes[SETTINGS_CHOICE_UNSELECTED_CLASS]).toBe(false);
  });

  it('marks unselected state', () => {
    const classes = settingsChoiceNgClass(false);
    expect(classes[SETTINGS_CHOICE_SELECTED_CLASS]).toBe(false);
    expect(classes[SETTINGS_CHOICE_UNSELECTED_CLASS]).toBe(true);
  });
});
