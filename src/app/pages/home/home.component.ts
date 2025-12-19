import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrayerFormComponent } from '../../components/prayer-form/prayer-form.component';
import { PrayerFiltersComponent, PrayerFilters } from '../../components/prayer-filters/prayer-filters.component';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader/skeleton-loader.component';
import { AppLogoComponent } from '../../components/app-logo/app-logo.component';
import { PrayerCardComponent } from '../../components/prayer-card/prayer-card.component';
import { PromptCardComponent, PrayerPrompt } from '../../components/prompt-card/prompt-card.component';
import { UserSettingsComponent } from '../../components/user-settings/user-settings.component';
import { VerificationDialogComponent } from '../../components/verification-dialog/verification-dialog.component';
import { PrayerService, PrayerRequest } from '../../services/prayer.service';
import { PromptService } from '../../services/prompt.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { ToastService } from '../../services/toast.service';
import { VerificationService } from '../../services/verification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, PrayerFormComponent, PrayerFiltersComponent, SkeletonLoaderComponent, AppLogoComponent, PrayerCardComponent, PromptCardComponent, UserSettingsComponent, VerificationDialogComponent],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div class="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
              <app-logo (logoStatusChange)="hasLogo = $event"></app-logo>
            </div>
            
            <div class="flex flex-col gap-2">
              <!-- Mobile: all buttons in one row -->
              <div class="flex sm:hidden items-center gap-2 flex-wrap">
                <button
                  *ngIf="isAdmin$ | async"
                  routerLink="/admin"
                  class="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm"
                  title="Admin Portal"
                >
                  <span>Admin</span>
                </button>
                <button
                  *ngIf="isAdmin$ | async"
                  (click)="logout()"
                  class="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  title="Logout"
                >
                  <span class="text-sm">Logout</span>
                </button>
                <button
                  (click)="showSettings = true"
                  class="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  title="Settings"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button
                  routerLink="/presentation"
                  class="flex items-center gap-1 bg-[#2F5F54] text-white px-3 py-2 rounded-lg hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-[#2F5F54] transition-colors text-sm"
                  title="Prayer Mode"
                >
                  <span>Pray</span>
                </button>
                <button
                  (click)="showPrayerForm = true"
                  class="flex items-center gap-1 bg-blue-600 dark:bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                >
                  <span>Request</span>
                </button>
              </div>

              <!-- Tablet/Desktop: two rows -->
              <div class="hidden sm:flex flex-col gap-2">
                <!-- First row: settings, presentation, new prayer -->
                <div class="flex items-center gap-2 justify-end">
                  <button
                    (click)="showSettings = true"
                    class="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    title="Settings"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button
                    routerLink="/presentation"
                    class="flex items-center gap-2 bg-[#2F5F54] dark:bg-[#2F5F54] text-white px-4 py-2 rounded-lg hover:bg-[#1a3a2e] dark:hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-[#2F5F54] transition-colors text-base"
                    title="Prayer Mode"
                  >
                    <span>Pray</span>
                  </button>
                  <button
                    (click)="showPrayerForm = true"
                    class="flex items-center gap-2 bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
                  >
                    <span>Add Request</span>
                  </button>
                </div>
                
                <!-- Second row: admin and logout (right-aligned) -->
                <div *ngIf="isAdmin$ | async" class="flex items-center gap-2 justify-end">
                  <button
                    routerLink="/admin"
                    class="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-base"
                    title="Admin Portal"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>Admin</span>
                  </button>
                  <button
                    (click)="logout()"
                    class="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    title="Logout"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span class="text-base">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="w-full flex-1 max-w-6xl mx-auto px-4 py-6">
        <!-- Prayer Form Modal -->
        <app-prayer-form
          [isOpen]="showPrayerForm"
          (close)="showPrayerForm = false"
        ></app-prayer-form>

        <!-- User Settings Modal -->
        <app-user-settings
          [isOpen]="showSettings"
          (onClose)="showSettings = false"
        ></app-user-settings>

        <!-- Prayer Filters -->
        <app-prayer-filters
          [filters]="filters"
          (filtersChange)="onFiltersChange($event)"
        ></app-prayer-filters>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <button
            (click)="setFilter('current')"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'current' ? '!border-[#0047AB] dark:!border-[#0047AB] bg-blue-100 dark:bg-blue-950 ring-3 ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#0047AB] dark:hover:!border-[#0047AB] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ currentPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Current</div>
          </button>
          <button
            (click)="setFilter('answered')"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'answered' ? '!border-[#39704D] dark:!border-[#39704D] bg-green-100 dark:bg-green-950 ring-3 ring-[#39704D] dark:ring-[#39704D] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#39704D] dark:hover:!border-[#39704D] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ answeredPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Answered</div>
          </button>
          <button
            (click)="setFilter('total')"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'total' ? '!border-[#C9A961] dark:!border-[#C9A961] bg-amber-100 dark:bg-amber-900/40 ring-3 ring-[#C9A961] dark:ring-[#C9A961] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#C9A961] dark:hover:!border-[#C9A961] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ totalPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total</div>
          </button>
          <button
            (click)="setFilter('prompts')"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'prompts' ? '!border-[#988F83] dark:!border-[#988F83] bg-stone-100 dark:bg-stone-900/40 ring-3 ring-[#988F83] dark:ring-[#988F83] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#988F83] dark:hover:!border-[#988F83] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ promptsCount }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Prompts</div>
          </button>
        </div>

        <!-- Loading State -->
        <app-skeleton-loader *ngIf="loading$ | async" [count]="5" type="card"></app-skeleton-loader>

        <!-- Error State -->
        <div *ngIf="error$ | async as error" class="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {{ error }}
        </div>

        <!-- Prompt Type Filters -->
        <div *ngIf="activeFilter === 'prompts' && promptsCount > 0" class="flex flex-wrap gap-2 mb-4">
          <!-- All Types Button -->
          <button
            (click)="selectedPromptTypes = []"
            [class]="'flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (selectedPromptTypes.length === 0 ? 'bg-[#988F83] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]')"
          >
            All Types ({{ promptsCount }})
          </button>
          
          <!-- Individual Type Buttons -->
          <button
            *ngFor="let type of getUniquePromptTypes()"
            (click)="togglePromptType(type)"
            [class]="'flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (isPromptTypeSelected(type) ? 'bg-[#988F83] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]')"
          >
            {{ type }} ({{ getPromptCountByType(type) }})
          </button>
        </div>

        <!-- Prayers or Prompts List -->
        <div *ngIf="!(loading$ | async) && !(error$ | async)" class="space-y-4">
          <!-- Empty State for Prayers -->
          <div *ngIf="activeFilter !== 'prompts' && (prayers$ | async)?.length === 0" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
              No prayer requests yet
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              Be the first to add a prayer request to build your church's prayer community.
            </p>
          </div>

          <!-- Prayer Cards (only show when not on prompts filter) -->
          <ng-container *ngIf="activeFilter !== 'prompts'">
            <app-prayer-card
              *ngFor="let prayer of prayers$ | async"
              [prayer]="prayer"
              [isAdmin]="(isAdmin$ | async) || false"
              (delete)="deletePrayer($event)"
              (addUpdate)="addUpdate($event)"
              (deleteUpdate)="deleteUpdate($event)"
              (requestDeletion)="requestDeletion($event)"
            ></app-prayer-card>
          </ng-container>

          <!-- Empty State for Prompts -->
          <div *ngIf="activeFilter === 'prompts' && (prompts$ | async)?.length === 0" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
              No prompts yet
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              Prompts help guide prayer requests.
            </p>
          </div>

          <!-- Prompt Cards (only show when on prompts filter) -->
          <ng-container *ngIf="activeFilter === 'prompts'">
            <app-prompt-card
              *ngFor="let prompt of getDisplayedPrompts()"
              [prompt]="prompt"
              [isAdmin]="(isAdmin$ | async) || false"
              [isTypeSelected]="isPromptTypeSelected(prompt.type)"
              (delete)="deletePrompt($event)"
              (onTypeClick)="togglePromptType($event)"
            ></app-prompt-card>
          </ng-container>
        </div>
      </main>
    </div>

    <!-- Verification Dialog -->
    <app-verification-dialog
      [isOpen]="verificationState.isOpen"
      [email]="verificationState.email"
      [codeId]="verificationState.codeId"
      [expiresAt]="verificationState.expiresAt"
      (onClose)="handleVerificationCancel()"
      (onVerified)="handleVerified($event)"
      (onResend)="handleResendCode()">
    </app-verification-dialog>
  `,
  styles: []
})
export class HomeComponent implements OnInit {
  prayers$!: Observable<PrayerRequest[]>;
  prompts$!: Observable<PrayerPrompt[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  isAdmin$!: Observable<boolean>;

  currentPrayersCount = 0;
  answeredPrayersCount = 0;
  totalPrayersCount = 0;
  promptsCount = 0;

  showPrayerForm = false;
  showSettings = false;
  filters: PrayerFilters = { status: 'current' };
  hasLogo = false;
  activeFilter: 'current' | 'answered' | 'total' | 'prompts' = 'current';
  selectedPromptTypes: string[] = [];
  
  isVerificationEnabled = false;
  isAdmin = false;
  verificationState = {
    isOpen: false,
    codeId: '',
    expiresAt: '',
    email: '',
    actionType: '' as 'update' | 'deletion' | '',
    actionData: null as any
  };

  constructor(
    public prayerService: PrayerService,
    public promptService: PromptService,
    public adminAuthService: AdminAuthService,
    private toastService: ToastService,
    private verificationService: VerificationService
  ) {
    // Load logo state from cache immediately to prevent flash
    const windowCache = (window as any).__cachedLogos;
    const useLogo = windowCache?.useLogo || localStorage.getItem('branding_use_logo') === 'true';
    this.hasLogo = useLogo;
  }

  ngOnInit(): void {
    this.prayers$ = this.prayerService.prayers$;
    this.prompts$ = this.promptService.prompts$;
    this.loading$ = this.prayerService.loading$;
    this.error$ = this.prayerService.error$;
    this.isAdmin$ = this.adminAuthService.isAdmin$;

    // Subscribe to ALL prayers to update counts (not filtered)
    this.prayerService.allPrayers$.subscribe(prayers => {
      this.currentPrayersCount = prayers.filter(p => p.status === 'current').length;
      this.answeredPrayersCount = prayers.filter(p => p.status === 'answered').length;
      this.totalPrayersCount = prayers.length;
    });

    // Subscribe to prompts for count
    this.prompts$.subscribe(prompts => {
      this.promptsCount = prompts.length;
    });
    
    // Subscribe to verification status
    this.verificationService.isEnabled$.subscribe(enabled => {
      this.isVerificationEnabled = enabled;
      console.log('Home Component - Verification enabled status:', enabled);
    });
    
    // Subscribe to admin status
    this.adminAuthService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });

    // Apply default filter
    this.prayerService.applyFilters(this.filters);
  }

  onFiltersChange(filters: PrayerFilters): void {
    // Preserve current filter state when search changes
    this.filters = {
      ...this.filters,
      searchTerm: filters.searchTerm
    };
    this.prayerService.applyFilters({
      status: this.filters.status,
      type: this.filters.type,
      search: this.filters.searchTerm
    });
  }

  setFilter(filter: 'current' | 'answered' | 'total' | 'prompts'): void {
    this.activeFilter = filter;
    
    if (filter === 'prompts') {
      // Clear prayer filters and reset prompt type selections
      this.filters = { searchTerm: this.filters.searchTerm };
      this.selectedPromptTypes = [];
      // Don't show any prayers when prompts filter is active
      this.prayerService.applyFilters({ search: '' }); // Empty results
    } else if (filter === 'total') {
      this.filters = { searchTerm: this.filters.searchTerm };
      this.prayerService.applyFilters({
        search: this.filters.searchTerm
      });
    } else {
      this.filters = { status: filter, searchTerm: this.filters.searchTerm };
      this.prayerService.applyFilters({
        status: this.filters.status,
        search: this.filters.searchTerm
      });
    }
  }

  markAsAnswered(id: string): void {
    this.prayerService.updatePrayerStatus(id, 'answered');
  }

  deletePrayer(id: string): void {
    this.prayerService.deletePrayer(id);
  }

  async addUpdate(updateData: any): Promise<void> {
    try {
      console.log('Home - About to add update. isVerificationEnabled:', this.isVerificationEnabled, 'isAdmin:', this.isAdmin);
      
      if (this.isVerificationEnabled && !this.isAdmin && updateData.author_email) {
        console.log('Home - Requesting verification code for update:', updateData.author_email);
        const verificationResult = await this.verificationService.requestCode(
          updateData.author_email,
          'update_submission',
          updateData
        );

        if (verificationResult === null) {
          await this.submitUpdate(updateData);
          return;
        }

        this.verificationState = {
          isOpen: true,
          codeId: verificationResult.codeId,
          expiresAt: verificationResult.expiresAt,
          email: updateData.author_email,
          actionType: 'update',
          actionData: updateData
        };
      } else {
        await this.submitUpdate(updateData);
      }
    } catch (error) {
      console.error('Error adding update:', error);
      this.toastService.error('Failed to submit update');
    }
  }

  async deleteUpdate(updateId: string): Promise<void> {
    try {
      await this.prayerService.deleteUpdate(updateId);
    } catch (error) {
      console.error('Error deleting update:', error);
      this.toastService.error('Failed to delete update');
    }
  }

  async requestDeletion(requestData: any): Promise<void> {
    try {
      console.log('Home - About to request deletion. isVerificationEnabled:', this.isVerificationEnabled, 'isAdmin:', this.isAdmin);
      
      if (this.isVerificationEnabled && !this.isAdmin && requestData.requester_email) {
        console.log('Home - Requesting verification code for deletion:', requestData.requester_email);
        const verificationResult = await this.verificationService.requestCode(
          requestData.requester_email,
          'deletion_request',
          requestData
        );

        if (verificationResult === null) {
          await this.submitDeletion(requestData);
          return;
        }

        this.verificationState = {
          isOpen: true,
          codeId: verificationResult.codeId,
          expiresAt: verificationResult.expiresAt,
          email: requestData.requester_email,
          actionType: 'deletion',
          actionData: requestData
        };
      } else {
        await this.submitDeletion(requestData);
      }
    } catch (error) {
      console.error('Error requesting deletion:', error);
      this.toastService.error('Failed to submit deletion request');
    }
  }

  async deletePrompt(id: string): Promise<void> {
    await this.promptService.deletePrompt(id);
  }

  togglePromptType(type: string): void {
    const index = this.selectedPromptTypes.indexOf(type);
    if (index > -1) {
      this.selectedPromptTypes.splice(index, 1);
    } else {
      this.selectedPromptTypes.push(type);
    }
  }

  isPromptTypeSelected(type: string): boolean {
    return this.selectedPromptTypes.includes(type);
  }

  getDisplayedPrompts(): PrayerPrompt[] {
    let prompts = this.promptService.promptsSubject.value;
    if (this.activeFilter !== 'prompts') return [];
    
    // Filter by search term if present
    if (this.filters.searchTerm && this.filters.searchTerm.trim()) {
      const searchLower = this.filters.searchTerm.toLowerCase().trim();
      prompts = prompts.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.type.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by selected types
    if (this.selectedPromptTypes.length > 0) {
      prompts = prompts.filter(p => this.selectedPromptTypes.includes(p.type));
    }
    
    return prompts;
  }

  getUniquePromptTypes(): string[] {
    const prompts = this.promptService.promptsSubject.value;
    const seenTypes = new Set<string>();
    const orderedTypes: string[] = [];
    
    prompts.forEach(p => {
      if (!seenTypes.has(p.type)) {
        seenTypes.add(p.type);
        orderedTypes.push(p.type);
      }
    });
    
    return orderedTypes;
  }

  getPromptCountByType(type: string): number {
    const prompts = this.promptService.promptsSubject.value;
    return prompts.filter(p => p.type === type).length;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  async handleVerified(actionData: any): Promise<void> {
    try {
      if (this.verificationState.actionType === 'update') {
        await this.submitUpdate(this.verificationState.actionData);
      } else if (this.verificationState.actionType === 'deletion') {
        await this.submitDeletion(this.verificationState.actionData);
      }
      
      this.verificationState = {
        isOpen: false,
        codeId: '',
        expiresAt: '',
        email: '',
        actionType: '',
        actionData: null
      };
    } catch (error) {
      console.error('Error handling verified action:', error);
      this.toastService.error('Failed to complete action');
    }
  }

  handleVerificationCancel(): void {
    this.verificationState = {
      isOpen: false,
      codeId: '',
      expiresAt: '',
      email: '',
      actionType: '',
      actionData: null
    };
    this.toastService.error('Verification cancelled');
  }

  async handleResendCode(): Promise<void> {
    try {
      if (!this.verificationState.email || !this.verificationState.actionData) return;

      const actionType = this.verificationState.actionType === 'update' ? 'update_submission' : 'deletion_request';
      const verificationResult = await this.verificationService.requestCode(
        this.verificationState.email,
        actionType,
        this.verificationState.actionData
      );

      if (verificationResult) {
        this.verificationState = {
          ...this.verificationState,
          codeId: verificationResult.codeId,
          expiresAt: verificationResult.expiresAt
        };
      }
    } catch (error) {
      console.error('Error resending code:', error);
      this.toastService.error('Failed to resend code');
    }
  }
  
  private async submitUpdate(updateData: any): Promise<void> {
    await this.prayerService.addUpdate(updateData);
  }

  private async submitDeletion(requestData: any): Promise<void> {
    await this.prayerService.requestDeletion(requestData);
  }

  async logout(): Promise<void> {
    await this.adminAuthService.logout();
    this.toastService.success('Logged out successfully');
  }
}
