import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import {
  lookupPersonByEmail,
  searchPlanningCenterByName,
  type PlanningCenterPerson,
} from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';
import {
  EMAIL_SUBSCRIBER_PC_SEARCH_DEBOUNCE_MS,
  EMAIL_SUBSCRIBER_PC_SEARCH_MIN_CHARS,
} from '../../lib/admin-email-subscribers';

export interface EmailSubscriberAddedEvent {
  email: string;
  successMessage: string;
}

@Component({
  selector: 'app-admin-email-subscribers-add-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-add-form.component.html',
})
export class AdminEmailSubscribersAddFormComponent {
  @Output() subscriberAdded = new EventEmitter<EmailSubscriberAddedEvent>();
  @Output() cancel = new EventEmitter<void>();
  @Output() reportError = new EventEmitter<string>();

  newName = '';
  newEmail = '';
  submitting = false;

  pcSearchTab = false;
  pcSearchQuery = '';
  pcSearching = false;
  pcSearchSearched = false;
  pcSearchResults: PlanningCenterPerson[] = [];
  pcSelectedPerson: PlanningCenterPerson | null = null;

  readonly pcSearchMinChars = EMAIL_SUBSCRIBER_PC_SEARCH_MIN_CHARS;
  readonly pcSearchDebounceMs = EMAIL_SUBSCRIBER_PC_SEARCH_DEBOUNCE_MS;

  private pcSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pcSearchTourDemoActive = false;
  private pcSearchTourDemoBlockManualSubmit = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly appRef: ApplicationRef,
  ) {}

  resetForm(): void {
    this.newName = '';
    this.newEmail = '';
    this.submitting = false;
    this.pcSearchTab = false;
    this.pcSearchQuery = '';
    this.pcSearchResults = [];
    this.pcSelectedPerson = null;
    this.pcSearchSearched = false;
    this.pcSearchTourDemoActive = false;
    this.pcSearchTourDemoBlockManualSubmit = false;
    if (this.pcSearchDebounceTimer) {
      clearTimeout(this.pcSearchDebounceTimer);
      this.pcSearchDebounceTimer = null;
    }
    this.cdr.markForCheck();
  }

  showManualTab(): void {
    this.pcSearchTab = false;
    this.cdr.markForCheck();
  }

  showPlanningCenterTab(): void {
    this.pcSearchTab = true;
    this.cdr.markForCheck();
  }

  runTourDemoSearch(): Promise<void> {
    this.pcSearchTourDemoActive = true;
    this.pcSearchQuery = 'Mark Larson';
    this.cdr.markForCheck();
    return this.runTourDemoPlanningCenterSearchOnly();
  }

  selectTourDemoMatch(): void {
    const match =
      this.findMarkLarsonTourDemoMatch() ??
      (this.pcSearchResults.length > 0 ? this.pcSearchResults[0] : null);
    if (match) {
      this.selectPlanningCenterPerson(match);
    } else {
      this.toast.info('Tour: No Planning Center results to select.');
    }
    this.cdr.markForCheck();
  }

  applyTourDemoPlanningCenterAdd(): void {
    if (!this.pcSelectedPerson) {
      this.toast.info('Tour: No person selected — search may have had no match for “Mark Larson”.');
      return;
    }
    void this.handleAddSelectedPlanningCenterPerson();
  }

  clearTourDemo(): void {
    this.resetForm();
    this.reportError.emit('');
    this.cdr.markForCheck();
  }

  onCancelClick(): void {
    this.resetForm();
    this.cancel.emit();
  }

  onPcSearchQueryChange(value: string): void {
    if (this.pcSearchDebounceTimer) {
      clearTimeout(this.pcSearchDebounceTimer);
      this.pcSearchDebounceTimer = null;
    }

    const trimmed = value.trim();
    if (trimmed.length < this.pcSearchMinChars) {
      this.cdr.markForCheck();
      return;
    }

    this.pcSearchDebounceTimer = setTimeout(() => {
      this.pcSearchDebounceTimer = null;
      void this.handleSearchPlanningCenter();
    }, this.pcSearchDebounceMs);
  }

  onPcSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.flushPcSearchNow();
    }
  }

  flushPcSearchNow(): void {
    if (this.pcSearchDebounceTimer) {
      clearTimeout(this.pcSearchDebounceTimer);
      this.pcSearchDebounceTimer = null;
    }
    const trimmed = this.pcSearchQuery.trim();
    if (trimmed.length > 0 && trimmed.length < this.pcSearchMinChars) {
      this.cdr.markForCheck();
      return;
    }
    void this.handleSearchPlanningCenter();
  }

  onManualAddFieldEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.key !== 'Enter') return;
    ke.preventDefault();
    void this.handleAddSubscriber();
  }

  async handleAddSubscriber(): Promise<void> {
    if (!this.newName.trim() || !this.newEmail.trim()) {
      this.reportError.emit('Name and email are required');
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
      return;
    }

    if (this.pcSearchTourDemoBlockManualSubmit) {
      this.toast.info(
        'Tour preview: close and reopen Add Subscriber, or refresh the page, to add a real subscriber.',
      );
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
      return;
    }

    try {
      this.submitting = true;
      this.reportError.emit('');
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
      await Promise.resolve();

      const normalizedEmail = this.newEmail.toLowerCase().trim();
      const { data: existing } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        this.reportError.emit('This email address is already subscribed');
        this.submitting = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        this.appRef.tick();
        return;
      }

      let inPlanningCenter: boolean | null = null;
      let planningCenterCheckedAt: string | null = null;

      try {
        const pcResult = await lookupPersonByEmail(
          normalizedEmail,
          environment.supabaseUrl,
          environment.supabaseAnonKey,
        );
        inPlanningCenter = pcResult.count > 0;
        planningCenterCheckedAt = new Date().toISOString();
      } catch (pcError) {
        console.error('[Email Subscribers] Planning Center check failed:', pcError);
      }

      const { error } = await this.supabase.client.from('email_subscribers').insert({
        name: this.newName.trim(),
        email: normalizedEmail,
        is_active: true,
        is_admin: false,
        receive_admin_emails: false,
        in_planning_center: inPlanningCenter,
        planning_center_checked_at: planningCenterCheckedAt,
      });

      if (error) throw error;

      this.subscriberAdded.emit({
        email: normalizedEmail,
        successMessage: 'Subscriber added successfully!',
      });
      this.resetForm();
    } catch (err: unknown) {
      console.error('Error adding subscriber:', err);
      const message = err instanceof Error ? err.message : 'Failed to add subscriber';
      this.reportError.emit(message);
      this.cdr.markForCheck();
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
    }
  }

  async handleSearchPlanningCenter(): Promise<void> {
    const trimmed = this.pcSearchQuery.trim();
    if (!trimmed) {
      this.reportError.emit('Please enter a name to search');
      this.cdr.markForCheck();
      return;
    }
    if (trimmed.length < this.pcSearchMinChars) {
      this.reportError.emit(
        `Enter at least ${this.pcSearchMinChars} characters to search Planning Center`,
      );
      this.cdr.markForCheck();
      return;
    }

    this.pcSearching = true;
    this.pcSearchSearched = true;
    this.pcSearchResults = [];
    this.pcSelectedPerson = null;
    this.reportError.emit('');
    this.cdr.markForCheck();

    try {
      const result = await searchPlanningCenterByName(
        trimmed,
        environment.supabaseUrl,
        environment.supabaseAnonKey,
      );

      if (result.error) {
        this.reportError.emit(result.error);
        this.pcSearchResults = [];
      } else {
        this.pcSearchResults = result.people;
      }
    } catch (err: unknown) {
      console.error('Error searching Planning Center:', err);
      const message =
        err instanceof Error ? err.message : 'An error occurred while searching Planning Center';
      this.reportError.emit(message);
      this.pcSearchResults = [];
    } finally {
      this.pcSearching = false;
      this.cdr.markForCheck();
    }
  }

  selectPlanningCenterPerson(person: PlanningCenterPerson): void {
    this.pcSelectedPerson = person;
    this.newName =
      person.attributes.name ||
      `${person.attributes.first_name} ${person.attributes.last_name}`;
    this.cdr.markForCheck();
  }

  async handleAddSelectedPlanningCenterPerson(): Promise<void> {
    const tourDemo = this.pcSearchTourDemoActive;

    if (!this.pcSelectedPerson) {
      this.reportError.emit('Please select a person from Planning Center');
      this.cdr.markForCheck();
      return;
    }

    const selectedName =
      this.pcSelectedPerson.attributes.name ||
      `${this.pcSelectedPerson.attributes.first_name} ${this.pcSelectedPerson.attributes.last_name}`.trim();

    this.newName = selectedName;
    this.newEmail = this.pcSelectedPerson.attributes.primary_email_address || '';
    this.reportError.emit('');

    if (this.newName && this.newEmail) {
      if (tourDemo) {
        this.pcSearchTourDemoActive = false;
        this.pcSearchTourDemoBlockManualSubmit = true;
        this.toast.info(
          'Tour: Name and email are filled in below. No subscriber was saved — this is a preview.',
        );
      } else {
        this.toast.info('Name and email filled in! Click "Add Subscriber" to complete.');
      }
      this.pcSearchTab = false;
    } else if (this.newName && !this.newEmail) {
      if (tourDemo) {
        this.pcSearchTourDemoActive = false;
        this.pcSearchTourDemoBlockManualSubmit = true;
        this.toast.info(
          'Tour: Name is filled in; add an email if needed. This tour does not save subscribers.',
        );
      } else {
        this.toast.info('Name filled in! Please enter the email address for this contact.');
      }
      this.pcSearchTab = false;
    }

    this.cdr.markForCheck();
  }

  private async runTourDemoPlanningCenterSearchOnly(): Promise<void> {
    if (this.pcSearchDebounceTimer) {
      clearTimeout(this.pcSearchDebounceTimer);
      this.pcSearchDebounceTimer = null;
    }
    await this.handleSearchPlanningCenter();
    if (!this.pcSearchTourDemoActive) {
      return;
    }
    if (this.pcSearchResults.length === 0) {
      this.pcSearchTourDemoActive = false;
      this.toast.info(
        'Tour: No Planning Center results for “Mark Larson” in this environment. Try your own search.',
      );
    }
    this.cdr.markForCheck();
  }

  private findMarkLarsonTourDemoMatch(): PlanningCenterPerson | null {
    for (const p of this.pcSearchResults) {
      const attrs = p.attributes;
      const name = (attrs.name || `${attrs.first_name || ''} ${attrs.last_name || ''}`)
        .trim()
        .toLowerCase();
      if (name.includes('mark larson') || (name.includes('mark') && name.includes('larson'))) {
        return p;
      }
    }
    return null;
  }
}
