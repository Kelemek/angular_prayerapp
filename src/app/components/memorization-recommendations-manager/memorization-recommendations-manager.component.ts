import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { BiblePassagePickerModalComponent } from '../bible-passage-picker-modal/bible-passage-picker-modal.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { ScriptureHoverPreviewComponent } from '../scripture-hover-preview/scripture-hover-preview.component';
import { MemorizationRecommendationsService } from '../../services/memorization-recommendations.service';
import { MemorizationService } from '../../services/memorization.service';
import { ScriptureService } from '../../services/scripture.service';
import { ToastService } from '../../services/toast.service';
import type {
  BibleTranslation,
  MemorizationRecommendation,
  MemorizationRecommendationCategory,
  MemorizationRecommendationCategoryGroup,
} from '../../types/memorization';

@Component({
  selector: 'app-memorization-recommendations-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    BiblePassagePickerModalComponent,
    ConfirmationDialogComponent,
    ScriptureHoverPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors dark:hover:bg-gray-700/40"
      [class.cursor-pointer]="!sectionExpanded"
      (click)="!sectionExpanded && onSectionToggle()"
    >
      <button
        type="button"
        id="memorization-recommendations-manager-trigger"
        class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle(); $event.stopPropagation()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="memorization-recommendations-manager-panel"
      >
        <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
          <svg
            class="text-blue-600 dark:text-blue-400 shrink-0"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          Memorize Recommendations
        </span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
          [class.rotate-180]="sectionExpanded"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      @if (sectionExpanded) {
        <div
          id="memorization-recommendations-manager-panel"
          role="region"
          aria-labelledby="memorization-recommendations-manager-trigger"
          class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-6"
          (click)="$event.stopPropagation()"
        >
          <p
            id="tour-memorize-rec-intro"
            class="text-sm text-gray-600 dark:text-gray-300"
          >
            Manage categories and curated verses for the Memorize <strong>Recommended</strong> modal.
            Every verse must belong to a category. Drag to reorder categories, reorder verses, or move verses between categories.
          </p>

          @if (loading) {
            <div class="text-center py-6">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          } @else {
            <!-- Categories -->
            <div>
              <div
                id="tour-memorize-rec-categories-toolbar"
                class="flex flex-wrap items-center justify-between gap-2 mb-3"
              >
                <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Categories
                </h3>
                <button
                  type="button"
                  (click)="showAddCategory = !showAddCategory"
                  class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Add Category
                </button>
              </div>

              @if (showAddCategory) {
                <form class="flex gap-2 mb-3" (ngSubmit)="submitAddCategory()">
                  <input
                    type="text"
                    [(ngModel)]="newCategoryName"
                    name="newCategoryName"
                    placeholder="Category name"
                    class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    required
                  />
                  <button
                    type="submit"
                    [disabled]="!newCategoryName.trim() || savingCategory"
                    class="px-3 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50 cursor-pointer"
                  >
                    Save
                  </button>
                </form>
              }

              @if (groups.length === 0) {
                <p class="text-sm text-gray-500 dark:text-gray-400 py-2">
                  Create a category before adding verses.
                </p>
              } @else {
                <div
                  id="tour-memorize-rec-categories-list"
                  cdkDropList
                  [cdkDropListData]="groups"
                  (cdkDropListDropped)="onCategoryDrop($event)"
                  class="space-y-2"
                  [class.opacity-60]="reorderingCategories"
                >
                  @for (group of groups; track group.category.id) {
                    <div
                      cdkDrag
                      class="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                    >
                      <button
                        type="button"
                        cdkDragHandle
                        class="p-1 text-gray-400 cursor-grab active:cursor-grabbing"
                        aria-label="Drag to reorder category"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5"></circle>
                          <circle cx="15" cy="6" r="1.5"></circle>
                          <circle cx="9" cy="12" r="1.5"></circle>
                          <circle cx="15" cy="12" r="1.5"></circle>
                          <circle cx="9" cy="18" r="1.5"></circle>
                          <circle cx="15" cy="18" r="1.5"></circle>
                        </svg>
                      </button>
                      @if (editingCategoryId === group.category.id) {
                        <input
                          type="text"
                          [(ngModel)]="editingCategoryName"
                          [name]="'editCat-' + group.category.id"
                          class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                        />
                        <button type="button" (click)="saveRenameCategory(group.category)" class="text-sm text-blue-600 cursor-pointer">Save</button>
                        <button type="button" (click)="cancelRename()" class="text-sm text-gray-500 cursor-pointer">Cancel</button>
                      } @else {
                        <button
                          type="button"
                          class="min-w-0 flex-1 text-left font-medium text-gray-900 dark:text-gray-100 truncate cursor-pointer"
                          [class.ring-2]="addTargetCategoryId === group.category.id"
                          [class.ring-blue-500]="addTargetCategoryId === group.category.id"
                          [class.rounded]="addTargetCategoryId === group.category.id"
                          (click)="selectAddTarget(group.category.id)"
                          [title]="'Select for adding verses'"
                        >
                          {{ group.category.name }}
                          <span class="text-xs font-normal text-gray-500 dark:text-gray-400">
                            ({{ group.items.length }})
                          </span>
                        </button>
                        <button type="button" (click)="startRename(group.category)" class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Rename">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="confirmRemoveCategory(group.category)"
                          class="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Verses by category -->
            <div>
              <div
                id="tour-memorize-rec-verses-toolbar"
                class="flex flex-wrap items-center justify-between gap-2 mb-3"
              >
                <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Verses
                </h3>
                <button
                  type="button"
                  (click)="openPicker()"
                  [disabled]="adding || !addTargetCategoryId"
                  class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  [title]="addTargetCategoryId ? 'Add verse to selected category' : 'Select a category first'"
                >
                  Add Recommendation
                </button>
              </div>

              @if (!addTargetCategoryId && groups.length > 0) {
                <p class="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  Select a category above (click its name) before adding verses.
                </p>
              }

              <div
                id="tour-memorize-rec-verses-list"
                cdkDropListGroup
                [class.opacity-60]="reorderingVerses"
              >
                @for (group of groups; track group.category.id) {
                  <div class="mb-4">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {{ group.category.name }}
                    </p>
                    <div
                      cdkDropList
                      [id]="'rec-verses-' + group.category.id"
                      [cdkDropListData]="group.items"
                      (cdkDropListDropped)="onVerseDrop($event, group.category.id)"
                      class="space-y-2 min-h-12 rounded-lg p-1"
                      [class.border]="group.items.length === 0"
                      [class.border-dashed]="group.items.length === 0"
                      [class.border-gray-300]="group.items.length === 0"
                      [class.dark:border-gray-600]="group.items.length === 0"
                    >
                      @if (group.items.length === 0) {
                        <p class="text-xs text-gray-500 dark:text-gray-400 py-3 px-2 text-center pointer-events-none">
                          Drop verses here
                        </p>
                      }
                      @for (item of group.items; track item.id) {
                        <div
                          cdkDrag
                          class="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                        >
                          <button
                            type="button"
                            cdkDragHandle
                            class="p-1 text-gray-400 cursor-grab active:cursor-grabbing"
                            aria-label="Drag to reorder or move verse"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="9" cy="6" r="1.5"></circle>
                              <circle cx="15" cy="6" r="1.5"></circle>
                              <circle cx="9" cy="12" r="1.5"></circle>
                              <circle cx="15" cy="12" r="1.5"></circle>
                              <circle cx="9" cy="18" r="1.5"></circle>
                              <circle cx="15" cy="18" r="1.5"></circle>
                            </svg>
                          </button>
                          <app-scripture-hover-preview
                            class="min-w-0 flex-1"
                            [reference]="item.reference"
                            [translation]="item.translation"
                          >
                            <div
                              class="min-w-0 font-medium text-gray-900 dark:text-gray-100 truncate"
                            >
                              {{ item.reference }}
                            </div>
                          </app-scripture-hover-preview>
                          <button
                            type="button"
                            (click)="confirmRemoveVerse(item)"
                            class="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                            [attr.aria-label]="'Remove ' + item.reference"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <app-bible-passage-picker-modal
      [isOpen]="showPicker"
      [busy]="adding"
      confirmLabel="Add recommendation"
      (close)="showPicker = false; mark()"
      (confirmed)="onPassageConfirmed($event)"
      (translationChange)="pickerTranslation = $event"
    />

    @if (pendingRemoveVerse) {
      <app-confirmation-dialog
        title="Remove recommendation?"
        [message]="'Remove ' + pendingRemoveVerse.reference + ' from Memorize recommendations?'"
        confirmText="Remove"
        [isDangerous]="true"
        (confirm)="doRemoveVerse()"
        (cancel)="pendingRemoveVerse = null; mark()"
      />
    }

    @if (pendingRemoveCategory) {
      <app-confirmation-dialog
        title="Delete category?"
        [message]="'Delete category “' + pendingRemoveCategory.name + '”? It must be empty.'"
        confirmText="Delete"
        [isDangerous]="true"
        (confirm)="doRemoveCategory()"
        (cancel)="pendingRemoveCategory = null; mark()"
      />
    }
  `,
})
export class MemorizationRecommendationsManagerComponent {
  sectionExpanded = false;
  loadedOnce = false;
  loading = false;
  adding = false;
  savingCategory = false;
  reorderingCategories = false;
  reorderingVerses = false;
  showPicker = false;
  showAddCategory = false;
  newCategoryName = '';
  addTargetCategoryId: string | null = null;
  editingCategoryId: string | null = null;
  editingCategoryName = '';
  groups: MemorizationRecommendationCategoryGroup[] = [];
  pendingRemoveVerse: MemorizationRecommendation | null = null;
  pendingRemoveCategory: MemorizationRecommendationCategory | null = null;
  pickerTranslation: BibleTranslation = 'esv';

  constructor(
    private recommendations: MemorizationRecommendationsService,
    private memorization: MemorizationService,
    private scripture: ScriptureService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.loadedOnce) {
      void this.fetchAll();
    }
    this.mark();
  }

  /** Admin help tour: expand section, close forms/picker, load categories and verses. */
  async prepareTourInitialState(): Promise<boolean> {
    this.showPicker = false;
    this.showAddCategory = false;
    this.pendingRemoveVerse = null;
    this.pendingRemoveCategory = null;
    this.editingCategoryId = null;
    this.editingCategoryName = '';

    if (!this.sectionExpanded) {
      this.sectionExpanded = true;
    }
    if (!this.loadedOnce) {
      await this.fetchAll();
    } else if (this.loading) {
      await this.fetchAll();
    } else {
      this.syncFromService();
      if (!this.addTargetCategoryId && this.groups.length > 0) {
        this.addTargetCategoryId = this.groups[0].category.id;
      }
      this.mark();
    }

    return this.groups.length > 0;
  }

  selectAddTarget(categoryId: string): void {
    this.addTargetCategoryId = categoryId;
    this.mark();
  }

  openPicker(): void {
    if (!this.addTargetCategoryId) {
      this.toast.error('Select a category first.');
      return;
    }
    this.pickerTranslation = this.memorization.getPreferredTranslation();
    this.showPicker = true;
    this.mark();
  }

  async submitAddCategory(): Promise<void> {
    if (this.savingCategory) return;
    this.savingCategory = true;
    this.mark();
    const result = await this.recommendations.addCategory(this.newCategoryName);
    this.savingCategory = false;
    if (result.ok) {
      this.toast.success('Category added.');
      this.newCategoryName = '';
      this.showAddCategory = false;
      this.syncFromService();
      this.addTargetCategoryId = result.category.id;
    } else if (result.reason === 'duplicate') {
      this.toast.error('A category with that name already exists.');
    } else if (result.reason === 'empty_name') {
      this.toast.error('Enter a category name.');
    } else {
      this.toast.error('Could not add category.');
    }
    this.mark();
  }

  startRename(category: MemorizationRecommendationCategory): void {
    this.editingCategoryId = category.id;
    this.editingCategoryName = category.name;
    this.mark();
  }

  cancelRename(): void {
    this.editingCategoryId = null;
    this.editingCategoryName = '';
    this.mark();
  }

  async saveRenameCategory(category: MemorizationRecommendationCategory): Promise<void> {
    const result = await this.recommendations.renameCategory(
      category.id,
      this.editingCategoryName
    );
    if (result.ok) {
      this.toast.success('Category renamed.');
      this.cancelRename();
      this.syncFromService();
    } else if (result.reason === 'duplicate') {
      this.toast.error('A category with that name already exists.');
    } else {
      this.toast.error('Could not rename category.');
    }
    this.mark();
  }

  confirmRemoveCategory(category: MemorizationRecommendationCategory): void {
    this.pendingRemoveCategory = category;
    this.mark();
  }

  async doRemoveCategory(): Promise<void> {
    const category = this.pendingRemoveCategory;
    this.pendingRemoveCategory = null;
    if (!category) return;

    const result = await this.recommendations.deleteCategory(category.id);
    if (result.ok) {
      this.toast.success('Category deleted.');
      if (this.addTargetCategoryId === category.id) {
        this.addTargetCategoryId = null;
      }
      this.syncFromService();
    } else if (result.reason === 'not_empty') {
      this.toast.error('Move or remove verses before deleting this category.');
    } else {
      this.toast.error('Could not delete category.');
    }
    this.mark();
  }

  async onPassageConfirmed(reference: string): Promise<void> {
    if (this.adding || !this.addTargetCategoryId) return;
    this.adding = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.appRef.tick();

    try {
      const translation = this.pickerTranslation || this.memorization.getPreferredTranslation();
      const passage = await this.scripture.getPassage(reference, translation);
      const text = passage.text?.trim();
      if (!text) {
        this.toast.error('No text returned for this passage.');
        return;
      }

      const result = await this.recommendations.addRecommendation(
        reference,
        this.addTargetCategoryId,
        translation
      );
      if (result.ok) {
        this.toast.success('Recommendation added.');
        this.showPicker = false;
        this.syncFromService();
      } else if (result.reason === 'duplicate') {
        this.toast.error('That passage is already in recommendations.');
      } else if (result.reason === 'missing_category') {
        this.toast.error('Select a category first.');
      } else {
        this.toast.error('Could not save this recommendation.');
      }
    } catch (e) {
      console.error(e);
      this.toast.error('Could not validate this passage.');
    } finally {
      this.adding = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
    }
  }

  confirmRemoveVerse(item: MemorizationRecommendation): void {
    this.pendingRemoveVerse = item;
    this.mark();
  }

  async doRemoveVerse(): Promise<void> {
    const item = this.pendingRemoveVerse;
    this.pendingRemoveVerse = null;
    if (!item) return;

    const ok = await this.recommendations.removeRecommendation(item.id);
    if (ok) {
      this.toast.success('Recommendation removed.');
      this.syncFromService();
    } else {
      this.toast.error('Could not remove recommendation.');
    }
    this.mark();
  }

  async onCategoryDrop(
    event: CdkDragDrop<MemorizationRecommendationCategoryGroup[]>
  ): Promise<void> {
    if (this.reorderingCategories || this.reorderingVerses) return;
    if (event.previousIndex === event.currentIndex) return;
    const original = [...this.groups];
    this.reorderingCategories = true;
    moveItemInArray(this.groups, event.previousIndex, event.currentIndex);
    this.mark();

    const ok = await this.recommendations.reorderCategories(
      this.groups.map((g) => g.category.id)
    );
    if (ok) {
      this.syncFromService();
    } else {
      this.groups = original;
      this.toast.error('Could not reorder categories.');
    }
    this.reorderingCategories = false;
    this.mark();
  }

  async onVerseDrop(
    event: CdkDragDrop<MemorizationRecommendation[]>,
    categoryId: string
  ): Promise<void> {
    if (this.reorderingVerses || this.reorderingCategories) return;

    const targetGroup = this.groups.find((g) => g.category.id === categoryId);
    if (!targetGroup) return;

    const sameList = event.previousContainer === event.container;
    if (sameList && event.previousIndex === event.currentIndex) return;

    this.reorderingVerses = true;

    if (sameList) {
      moveItemInArray(targetGroup.items, event.previousIndex, event.currentIndex);
    } else {
      // Empty lists show a placeholder; CDK may report currentIndex past the end.
      const currentIndex = Math.min(event.currentIndex, targetGroup.items.length);
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        currentIndex
      );
      const moved = targetGroup.items[currentIndex];
      if (moved) {
        moved.categoryId = categoryId;
      }
    }

    this.mark();

    const sourceCategoryId = sameList
      ? categoryId
      : this.categoryIdForDropList(event.previousContainer.id);
    const affectedCategoryIds = new Set(
      [categoryId, sourceCategoryId].filter((id): id is string => !!id)
    );
    const placements = this.groups
      .filter((g) => affectedCategoryIds.has(g.category.id))
      .flatMap((g) =>
        g.items.map((item, displayOrder) => ({
          id: item.id,
          categoryId: g.category.id,
          displayOrder,
        }))
      );

    const ok = await this.recommendations.persistVersePlacements(placements);
    if (ok) {
      this.syncFromService();
    } else {
      // Restore from service. groupedSnapshot clones items, so the service cache
      // was never mutated by the optimistic UI drag.
      this.syncFromService();
      this.toast.error(
        sameList ? 'Could not reorder verses.' : 'Could not move verse to that category.'
      );
    }
    this.reorderingVerses = false;
    this.mark();
  }

  private categoryIdForDropList(dropListId: string): string | null {
    const prefix = 'rec-verses-';
    return dropListId.startsWith(prefix) ? dropListId.slice(prefix.length) : null;
  }

  private async fetchAll(): Promise<void> {
    this.loading = true;
    this.mark();
    await this.recommendations.load(true);
    this.syncFromService();
    if (!this.addTargetCategoryId && this.groups.length > 0) {
      this.addTargetCategoryId = this.groups[0].category.id;
    }
    this.loadedOnce = true;
    this.loading = false;
    this.mark();
  }

  private syncFromService(): void {
    this.groups = this.recommendations.groupedSnapshot;
  }

  mark(): void {
    this.cdr.markForCheck();
  }
}
