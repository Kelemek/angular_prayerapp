import { describe } from 'vitest';
import { it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import {
  registerPracticeSessionSpecHooks,
  renderSession,
  revealAllHiddenViaTyping,
  correctReorderOrder,
  makeKeyEvent,
  makePointerEvent,
  verseItem,
  mockScriptureService,
  mockReciteService,
  mockReciteSettingsService,
  trackMemorizationPracticeSessionStartMock,
  trackMemorizationPracticeCompletedMock,
} from './memorization-practice-session.spec-setup';

registerPracticeSessionSpecHooks();

describe('MemorizationPracticeSessionComponent', () => {
  describe('recite mode', () => {
    async function waitForReciteSettings(
      component: MemorizationPracticeSessionComponent
    ): Promise<void> {
      await vi.waitFor(() => expect(component.reciteSettingsLoaded).toBe(true));
    }

    it('exposes recite in mode picker for enabled single-verse items', async () => {
      const { component, getByTestId, cdr } = await renderSession({ reciteEnabled: true });
      await waitForReciteSettings(component);
      expect(component.reciteModeAvailable).toBe(true);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();
    });

    it('allows recite for multi-verse references within the verse limit', async () => {
      const { component, getByTestId, cdr } = await renderSession({
        reciteEnabled: true,
        item: { ...verseItem, reference: 'John 3:16-18' },
      });
      await waitForReciteSettings(component);
      expect(component.reciteModeVisible).toBe(true);
      expect(component.reciteModeAvailable).toBe(true);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();

      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      expect(component.practiceMode).toBe('recite');
      expect(component.modePickerOpen).toBe(false);
    });

    it('shows inline warning when reference exceeds the verse limit', async () => {
      const { component, getByTestId, cdr } = await renderSession({
        reciteEnabled: true,
        item: { ...verseItem, reference: 'John 3:16-22' },
      });
      await waitForReciteSettings(component);
      expect(component.reciteModeVisible).toBe(true);
      expect(component.reciteModeAvailable).toBe(false);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();

      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      expect(component.practiceMode).toBeNull();
      expect(component.modePickerOpen).toBe(true);
      expect(getByTestId('memorize-recite-blocked-message')).toBeTruthy();
      expect(getByTestId('memorize-recite-blocked-message').textContent).toContain(
        '5 verses'
      );
    });

    it('exposes recite for bible books items and can start practice', async () => {
      const bibleBooksItem: MemorizedItem = {
        id: 'bb-recite',
        reference: 'Bible Books (OT)',
        text: 'Genesis Exodus Leviticus',
        translation: 'esv',
        dateAdded: Date.now(),
        lastPracticedAt: null,
        practiceSessions: [],
        kind: 'bibleBooks',
        bibleBooksScope: 'ot',
      };
      const { component, getByTestId, cdr } = await renderSession({
        reciteEnabled: true,
        item: bibleBooksItem,
      });
      await waitForReciteSettings(component);
      expect(component.reciteModeVisible).toBe(true);
      expect(component.reciteModeAvailable).toBe(true);

      await component.openModePicker();
      cdr.detectChanges();
      expect(getByTestId('memorize-practice-mode-recite')).toBeTruthy();

      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      expect(component.practiceMode).toBe('recite');
      expect(component.modePickerOpen).toBe(false);
    });

    it('enables Record when parent settings loaded before child refresh completes', async () => {
      const { component, cdr } = await renderSession({ reciteEnabled: true });
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());
      component.recitePractice!.settingsLoaded = false;

      expect(component.reciteSettingsLoadedForRecord).toBe(true);
    });

    it('records, transcribes, and shows alignment results', async () => {
      const { component, cdr } = await renderSession({
        reciteEnabled: true,
        reciteTranscript: 'For God so loved the world John 3 16',
      });
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());

      await component.startReciteRecording();
      cdr.detectChanges();
      expect(component.recitePhase).toBe('recording');
      expect(mockReciteService.startRecording).toHaveBeenCalled();

      await component.stopReciteRecording();
      cdr.detectChanges();
      expect(component.recitePhase).toBe('results');
      expect(component.reciteAlignment).not.toBeNull();
      expect(mockReciteService.stopRecordingCapture).toHaveBeenCalled();
      expect(mockReciteService.transcribeCapturedRecording).toHaveBeenCalledWith(
        expect.objectContaining({
          memorizedItemId: verseItem.id,
          prompt: expect.any(String),
          blob: expect.any(Blob),
          audioSeconds: expect.any(Number),
        })
      );
    });

    it('shows Recite feedback help and can open settings', async () => {
      const { component, cdr } = await renderSession({
        reciteEnabled: true,
        reciteTranscript: 'For God so loved the world John 3 16',
      });
      const openSettingsSpy = vi.spyOn(component.openSettings, 'emit');
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());
      await component.startReciteRecording();
      await component.stopReciteRecording();
      cdr.detectChanges();

      expect(screen.queryByTestId('memorize-recite-help')).toBeTruthy();
      component.openReciteFeedbackHelp();
      cdr.detectChanges();
      expect(screen.getByTestId('memorize-recite-feedback-help-dialog')).toBeTruthy();
      expect(screen.getByText(/Settings → Send Feedback/)).toBeTruthy();

      const closedSpy = vi.spyOn(component.closed, 'emit');
      await component.openSettingsForReciteFeedback();
      expect(closedSpy).toHaveBeenCalled();
      expect(openSettingsSpy).toHaveBeenCalled();
      expect(component.reciteFeedbackHelpOpen).toBe(false);
    });

    it('retry resets recite results without applying errors', async () => {
      const { component, cdr } = await renderSession({
        reciteEnabled: true,
        reciteTranscript: 'For so loved the world',
      });
      await waitForReciteSettings(component);
      component.beginPracticeWithMode('recite');
      cdr.detectChanges();
      await vi.waitFor(() => expect(component.recitePractice).toBeTruthy());
      await component.startReciteRecording();
      await component.stopReciteRecording();
      cdr.detectChanges();
      expect(component.displayPracticeErrors).toBeGreaterThan(0);

      component.onReciteRepeatRound();
      cdr.detectChanges();
      expect(component.recitePhase).toBe('ready');
      expect(component.displayPracticeErrors).toBe(0);
    });
  });
});
