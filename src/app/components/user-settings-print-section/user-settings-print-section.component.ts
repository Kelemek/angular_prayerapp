import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { PrintService } from '../../services/print.service';
import { PrayerService } from '../../services/prayer.service';
import { PromptService } from '../../services/prompt.service';
import type { MemorizationPrintSheetStyle } from '../../lib/print-memorization-cards';
import { isPrintNativeApp } from '../../lib/print-native';
import {
  SETTINGS_CHOICE_ACTION_ROW_CLASS,
  SETTINGS_CHOICE_DROPDOWN_SHELL_CLASS,
  SETTINGS_CHOICE_SPLIT_TILE_BTN_CLASS,
  settingsChoiceNgClass,
} from '../../lib/settings-choice-ui';

export type PrintRange = 'week' | 'twoweeks' | 'month' | 'year' | 'all';
export type PrintOptionsModal = 'prayers' | 'verses';
export type PrayerPrintSource = 'church' | 'prompts' | 'personal';
export type PrayerPrintStep = 'source' | 'prompts' | 'category' | 'timeframe';
type PrintBusyJob = 'church' | 'prompts' | 'personal' | 'verses';

const MEMORIZATION_PRINT_PREPARING_HTML =
  '<!DOCTYPE html><html><head><title>Preparing verse cards</title></head><body style="font-family:system-ui,sans-serif;padding:2rem">Preparing verse cards…</body></html>';

@Component({
  selector: 'app-user-settings-print-section',
  standalone: true,
  imports: [NgClass, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-settings-print-section.component.html',
  styles: [
    ':host { display: flex; flex-direction: column; gap: 0.5rem; }',
    ':host:not(:has(.settings-modal-section-card)) { display: none; }',
  ],
})
export class UserSettingsPrintSectionComponent implements OnChanges {
  readonly choiceShellClass = SETTINGS_CHOICE_DROPDOWN_SHELL_CLASS;
  readonly choiceSplitTileClass = SETTINGS_CHOICE_SPLIT_TILE_BTN_CLASS;
  readonly choiceState = settingsChoiceNgClass;
  readonly printModalActionBtnClass = `${SETTINGS_CHOICE_ACTION_ROW_CLASS} mt-4`;
  /** Fixed height so label ↔ spinner does not resize print tiles. */
  readonly printTileContentClass =
    'grid h-5 w-full shrink-0 place-items-center sm:h-5';
  readonly printTileSpinnerClass =
    'h-[18px] w-[18px] text-gray-600 dark:text-gray-400 sm:h-5 sm:w-5 animate-spin';
  readonly printOptionRowClass =
    'w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer';
  readonly prayerPrintSources: Array<{ value: PrayerPrintSource; label: string }> = [
    { value: 'church', label: 'Church' },
    { value: 'personal', label: 'Personal' },
    { value: 'prompts', label: 'Prompts' },
  ];

  @Input() isOpen = false;

  private settingsDataLoadGeneration = 0;

  printBusyJob: PrintBusyJob | null = null;
  printRange: PrintRange = 'week';
  printOptionsModal: PrintOptionsModal | null = null;
  prayerPrintStep: PrayerPrintStep = 'source';
  prayerPrintSource: PrayerPrintSource | null = null;
  promptTypes: string[] = [];
  selectedPromptTypes: string[] = [];
  personalCategories: string[] = [];
  selectedPersonalCategories: string[] = [];
  memorizationSheetStyle: MemorizationPrintSheetStyle = 'duplex';

  readonly memorizationSheetStyleOptions: Array<{
    value: MemorizationPrintSheetStyle;
    label: string;
    description: string;
  }> = [
    {
      value: 'duplex',
      label: 'Duplex',
      description: 'Two-sided — print front, flip on the long edge, print back',
    },
    {
      value: 'foldable',
      label: 'Foldable',
      description: 'One-sided — reference left, verse right; fold on the center line',
    },
  ];

  readonly printRangeOptions = [
    { value: 'week' as PrintRange, label: 'Last Week' },
    { value: 'twoweeks' as PrintRange, label: 'Last 2 Weeks' },
    { value: 'month' as PrintRange, label: 'Last Month' },
    { value: 'year' as PrintRange, label: 'Last Year' },
    { value: 'all' as PrintRange, label: 'All Prayers' },
  ];

  constructor(
    private printService: PrintService,
    private prayerService: PrayerService,
    private promptService: PromptService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen']) {
      return;
    }
    if (!this.isOpen) {
      this.settingsDataLoadGeneration += 1;
      this.closePrintOptionsModal();
      return;
    }
    void this.reloadSettingsPrintData();
  }

  get prayersTileBusy(): boolean {
    return (
      this.printBusyJob === 'church' ||
      this.printBusyJob === 'prompts' ||
      this.printBusyJob === 'personal'
    );
  }

  /** Prayer-specific print choices (not verse card format). */
  get prayersChoiceSelected(): boolean {
    return (
      this.printRange !== 'week' ||
      this.selectedPromptTypes.length > 0 ||
      this.selectedPersonalCategories.length > 0
    );
  }

  get isPrintingMemorization(): boolean {
    return this.printBusyJob === 'verses';
  }

  get printOptionsModalTitle(): string {
    if (this.printOptionsModal === 'verses') {
      return 'Verse card format';
    }
    if (this.printOptionsModal !== 'prayers') {
      return '';
    }
    switch (this.prayerPrintStep) {
      case 'source':
        return 'What to print';
      case 'prompts':
        return 'Prompt category';
      case 'category':
        return 'Personal category';
      case 'timeframe':
        return 'Time period';
      default: {
        const _exhaustive: never = this.prayerPrintStep;
        return _exhaustive;
      }
    }
  }

  get prayerPrintActionLabel(): string {
    switch (this.prayerPrintSource) {
      case 'church':
        return 'Print Church';
      case 'prompts':
        return 'Print Prompts';
      case 'personal':
        return 'Print Personal';
      case null:
        return 'Print';
      default: {
        const _exhaustive: never = this.prayerPrintSource;
        return _exhaustive;
      }
    }
  }

  get prayerPrintActionDisabled(): boolean {
    switch (this.prayerPrintSource) {
      case 'prompts':
        return this.printBusyJob === 'prompts';
      case 'personal':
        return this.printBusyJob === 'personal';
      case 'church':
      case null:
        return this.printBusyJob === 'church';
      default: {
        const _exhaustive: never = this.prayerPrintSource;
        return _exhaustive;
      }
    }
  }

  openPrintOptionsModal(mode: PrintOptionsModal): void {
    this.printOptionsModal = mode;
    if (mode === 'prayers') {
      this.resetPrayerPrintWizard();
    }
    this.cdr.markForCheck();
  }

  closePrintOptionsModal(): void {
    if (!this.printOptionsModal) {
      return;
    }
    this.printOptionsModal = null;
    this.resetPrayerPrintWizard();
    this.cdr.markForCheck();
  }

  choosePrayerPrintSource(source: PrayerPrintSource): void {
    this.prayerPrintSource = source;
    switch (source) {
      case 'church':
        // Church: source → timeframe (no category/prompts step).
        this.prayerPrintStep = 'timeframe';
        break;
      case 'prompts':
        this.prayerPrintStep = 'prompts';
        break;
      case 'personal':
        this.prayerPrintStep = 'category';
        break;
      default: {
        const _exhaustive: never = source;
        break;
      }
    }
    this.cdr.markForCheck();
  }

  choosePrintPersonalCategory(category: string | null): void {
    this.selectedPersonalCategories = category ? [category] : [];
    this.prayerPrintStep = 'timeframe';
    this.cdr.markForCheck();
  }

  backPrayerPrintStep(): void {
    switch (this.prayerPrintStep) {
      case 'source':
        this.closePrintOptionsModal();
        return;
      case 'prompts':
      case 'category':
        this.prayerPrintStep = 'source';
        break;
      case 'timeframe':
        this.prayerPrintStep = this.stepBeforeTimeframe();
        break;
      default: {
        const _exhaustive: never = this.prayerPrintStep;
        break;
      }
    }
    this.cdr.markForCheck();
  }

  setPrintRange(range: PrintRange): void {
    this.printRange = range;
    this.cdr.markForCheck();
  }

  setMemorizationSheetStyle(style: MemorizationPrintSheetStyle): void {
    this.memorizationSheetStyle = style;
    this.cdr.markForCheck();
  }

  selectAllPromptTypes(): void {
    this.selectedPromptTypes = [];
    this.cdr.markForCheck();
  }

  async printFromOptionsModal(): Promise<void> {
    const mode = this.printOptionsModal;
    const source = this.prayerPrintSource;
    if (!mode) {
      return;
    }
    this.printOptionsModal = null;
    this.cdr.markForCheck();
    try {
      switch (mode) {
        case 'prayers':
          await this.printChosenPrayerSource(source);
          break;
        case 'verses':
          await this.handlePrintMemorizationCards();
          break;
        default: {
          const _exhaustive: never = mode;
          break;
        }
      }
    } finally {
      this.resetPrayerPrintWizard();
      this.cdr.markForCheck();
    }
  }

  async handlePrint(): Promise<void> {
    await this.runPrintJob('church', async (newWindow) => {
      await this.printService.downloadPrintablePrayerList(this.printRange, newWindow);
    }, 'Error printing prayer list:');
  }

  async handlePrintPrompts(): Promise<void> {
    await this.runPrintJob('prompts', async (newWindow) => {
      await this.printService.downloadPrintablePromptList(
        this.selectedPromptTypes,
        newWindow,
      );
    }, 'Error printing prompts:');
  }

  async handlePrintPersonalPrayers(): Promise<void> {
    await this.runPrintJob('personal', async (newWindow) => {
      await this.printService.downloadPrintablePersonalPrayerList(
        this.selectedPersonalCategories.length > 0
          ? this.selectedPersonalCategories
          : undefined,
        newWindow,
        this.printRange,
      );
    }, 'Error printing personal prayers:');
  }

  async handlePrintMemorizationCards(): Promise<void> {
    await this.runPrintJob(
      'verses',
      async (newWindow) => {
        await this.printService.downloadPrintableMemorizationCards(
          newWindow,
          this.memorizationSheetStyle,
        );
      },
      'Error printing memorization verse cards:',
      MEMORIZATION_PRINT_PREPARING_HTML,
    );
  }

  togglePromptType(type: string): void {
    const index = this.selectedPromptTypes.indexOf(type);
    if (index > -1) {
      this.selectedPromptTypes = this.selectedPromptTypes.filter((t) => t !== type);
    } else {
      this.selectedPromptTypes = [...this.selectedPromptTypes, type];
    }
    this.cdr.markForCheck();
  }

  private async runPrintJob(
    job: PrintBusyJob,
    action: (newWindow: Window | null) => Promise<void>,
    errorContext: string,
    preparingDocumentHtml?: string,
  ): Promise<void> {
    this.printBusyJob = job;
    this.cdr.markForCheck();

    const newWindow = isPrintNativeApp() ? null : window.open('', '_blank');
    if (newWindow && preparingDocumentHtml) {
      newWindow.document.open();
      newWindow.document.write(preparingDocumentHtml);
      newWindow.document.close();
      newWindow.focus();
    }

    try {
      await action(newWindow);
    } catch (error) {
      console.error(errorContext, error);
      newWindow?.close();
    } finally {
      this.printBusyJob = null;
      this.cdr.markForCheck();
    }
  }

  private resetPrayerPrintWizard(): void {
    this.prayerPrintStep = 'source';
    this.prayerPrintSource = null;
  }

  private stepBeforeTimeframe(): PrayerPrintStep {
    switch (this.prayerPrintSource) {
      case 'personal':
        return 'category';
      case 'church':
      case 'prompts':
      case null:
        return 'source';
      default: {
        const _exhaustive: never = this.prayerPrintSource;
        return _exhaustive;
      }
    }
  }

  private async printChosenPrayerSource(source: PrayerPrintSource | null): Promise<void> {
    switch (source) {
      case 'church':
        await this.handlePrint();
        break;
      case 'prompts':
        await this.handlePrintPrompts();
        break;
      case 'personal':
        await this.handlePrintPersonalPrayers();
        break;
      case null:
        break;
      default: {
        const _exhaustive: never = source;
        break;
      }
    }
  }

  private async reloadSettingsPrintData(): Promise<void> {
    const generation = ++this.settingsDataLoadGeneration;
    try {
      const [promptTypes, personalCategories] = await Promise.all([
        this.promptService.getActivePromptTypeNames(),
        this.prayerService.getUniqueCategoriesForUser(),
      ]);
      if (!this.isSettingsDataLoadCurrent(generation)) {
        return;
      }
      this.promptTypes = promptTypes;
      this.personalCategories = personalCategories;
      this.cdr.markForCheck();
    } catch (err) {
      if (!this.isSettingsDataLoadCurrent(generation)) {
        return;
      }
      console.error('Error loading print settings data:', err);
    }
  }

  private isSettingsDataLoadCurrent(generation: number): boolean {
    return generation === this.settingsDataLoadGeneration;
  }
}
