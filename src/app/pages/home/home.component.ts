import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
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
import { UserSessionService } from '../../services/user-session.service';
import { SupabaseService } from '../../services/supabase.service';
import { Observable, take, Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, PrayerFormComponent, PrayerFiltersComponent, SkeletonLoaderComponent, AppLogoComponent, PrayerCardComponent, PromptCardComponent, UserSettingsComponent],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div class="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <!-- Mobile layout: indicator in top row with logo -->
          <div class="sm:hidden flex items-start justify-between mb-3">
            <!-- Logo on left -->
            <div class="flex items-center gap-3">
              <app-logo (logoStatusChange)="hasLogo = $event"></app-logo>
            </div>
            
            <!-- Email Indicator - Top Right -->
            @if ((userSessionService.userSession$ | async); as session) {
              <div class="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded">
                {{ session.email }}
              </div>
            } @else {
              <div class="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded">
                {{ getUserEmail() }}
              </div>
            }
          </div>
          
          <!-- Mobile buttons row -->
          <div class="sm:hidden flex items-center gap-2 flex-wrap">
                  @if (hasAdminEmail$ | async) {
                    <button
                      (click)="navigateToAdmin()"
                      class="flex items-center gap-1 border border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-2 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm"
                      title="Admin Portal"
                    >
                      <span>Admin</span>
                    </button>
                  }
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
          
          <!-- Desktop layout: single row -->
          <div class="hidden sm:flex items-start justify-between">
            <!-- Logo on left -->
            <div class="flex items-center gap-3">
              <app-logo (logoStatusChange)="hasLogo = $event"></app-logo>
            </div>
            
            <!-- Email and buttons stacked on right -->
            <div class="flex flex-col items-end gap-2">
              <!-- Email Indicator -->
              @if ((userSessionService.userSession$ | async); as session) {
                <div class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded">
                  {{ session.email }}
                </div>
              } @else {
                <div class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded">
                  {{ getUserEmail() }}
                </div>
              }
              
              <!-- Desktop buttons -->
              <div class="flex items-center gap-2">
                    @if (hasAdminEmail$ | async) {
                      <button
                        (click)="navigateToAdmin()"
                        class="flex items-center gap-2 border border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-base"
                        title="Admin Portal"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span>Admin</span>
                      </button>
                    }
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
                      title="Create a new prayer request"
                      class="flex items-center gap-2 bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
                    >
                      <span>Add Request</span>
                    </button>
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
            title="Show current prayers"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'current' ? '!border-[#0047AB] dark:!border-[#0047AB] bg-blue-100 dark:bg-blue-950 ring-3 ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#0047AB] dark:hover:!border-[#0047AB] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ currentPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Current</div>
          </button>
          <button
            (click)="setFilter('answered')"
            title="Show answered prayers"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'answered' ? '!border-[#39704D] dark:!border-[#39704D] bg-green-100 dark:bg-green-950 ring-3 ring-[#39704D] dark:ring-[#39704D] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#39704D] dark:hover:!border-[#39704D] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ answeredPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Answered</div>
          </button>
          <button
            (click)="setFilter('total')"
            title="Show all prayers"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'total' ? '!border-[#C9A961] dark:!border-[#C9A961] bg-amber-100 dark:bg-amber-900/40 ring-3 ring-[#C9A961] dark:ring-[#C9A961] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#C9A961] dark:hover:!border-[#C9A961] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ totalPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total</div>
          </button>
          <button
            (click)="setFilter('prompts')"
            title="Show prayer prompts"
            [class]="'rounded-lg shadow-md p-4 text-center border-[2px] transition-all duration-200 cursor-pointer ' + (activeFilter === 'prompts' ? '!border-[#988F83] dark:!border-[#988F83] bg-stone-100 dark:bg-stone-900/40 ring-3 ring-[#988F83] dark:ring-[#988F83] ring-offset-0' : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#988F83] dark:hover:!border-[#988F83] hover:shadow-lg')"
          >
            <div class="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ promptsCount }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Prompts</div>
          </button>
        </div>

        <!-- Loading State -->
        @if (loading$ | async) {
          <app-skeleton-loader [count]="5" type="card"></app-skeleton-loader>
        }

        <!-- Error State -->
        @if ((error$ | async); as error) {
          <div class="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {{ error }}
          </div>
        }

        <!-- Prompt Type Filters -->
        @if (activeFilter === 'prompts' && promptsCount > 0) {
          <div class="flex flex-wrap gap-2 mb-4">
            <!-- All Types Button -->
            <button
              (click)="selectedPromptTypes = []"
              [class]="'flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (selectedPromptTypes.length === 0 ? 'bg-[#988F83] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]')"
            >
              All Types ({{ promptsCount }})
            </button>
            
            <!-- Individual Type Buttons -->
            @for (type of getUniquePromptTypes(); track type) {
              <button
                (click)="togglePromptType(type)"
                [class]="'flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (isPromptTypeSelected(type) ? 'bg-[#988F83] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]')"
              >
                {{ type }} ({{ getPromptCountByType(type) }})
              </button>
            }
          </div>
        }

        <!-- Prayers or Prompts List -->
        @if (!(loading$ | async) && !(error$ | async)) {
          <div class="space-y-4">
            <!-- Empty State for Prayers -->
            @if (activeFilter !== 'prompts' && (prayers$ | async)?.length === 0) {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  @if (activeFilter === 'current') {
                    <span>No current prayer requests yet</span>
                  }
                  @if (activeFilter === 'answered') {
                    <span>No answered prayers yet</span>
                  }
                  @if (activeFilter === 'total') {
                    <span>No prayer requests yet</span>
                  }
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  Be the first to add a prayer request to build your church's prayer community.
                </p>
              </div>
            }

            <!-- Prayer Cards (only show when not on prompts filter) -->
            @if (activeFilter !== 'prompts') {
              @for (prayer of prayers$ | async; track prayer.id) {
                <app-prayer-card
                  [prayer]="prayer"
                  [isAdmin]="(isAdmin$ | async) || false"
                  [activeFilter]="activeFilter"
                  [deletionsAllowed]="deletionsAllowed"
                  [updatesAllowed]="updatesAllowed"
                  (delete)="deletePrayer($event)"
                  (addUpdate)="addUpdate($event)"
                  (deleteUpdate)="deleteUpdate($event)"
                  (requestDeletion)="requestDeletion($event)"
                  (requestUpdateDeletion)="requestUpdateDeletion($event)"
                ></app-prayer-card>
              }
            }

            <!-- Empty State for Prompts -->
            @if (activeFilter === 'prompts' && (prompts$ | async)?.length === 0) {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No prayer prompts yet
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  Prompts help guide prayer requests.
                </p>
              </div>
            }

            <!-- Prompt Cards (only show when on prompts filter) -->
            @if (activeFilter === 'prompts') {
              @for (prompt of getDisplayedPrompts(); track prompt.id) {
                <app-prompt-card
                  [prompt]="prompt"
                  [isAdmin]="(isAdmin$ | async) || false"
                  [isTypeSelected]="isPromptTypeSelected(prompt.type)"
                  (delete)="deletePrompt($event)"
                  (onTypeClick)="togglePromptType($event)"
                ></app-prompt-card>
              }
            }
          </div>
        }
      </main>

      <!-- No Footer Links -->
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  prayers$!: Observable<PrayerRequest[]>;
  prompts$!: Observable<PrayerPrompt[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  isAdmin$!: Observable<boolean>;
  hasAdminEmail$!: Observable<boolean>;

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
  
  isAdmin = false;
  // Admin settings for access control policies
  // These are loaded from admin_settings and control who can delete prayers/updates
  deletionsAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';
  updatesAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';

  // Subject for managing subscriptions
  private destroy$ = new Subject<void>();

  constructor(
    public prayerService: PrayerService,
    public promptService: PromptService,
    public adminAuthService: AdminAuthService,
    public userSessionService: UserSessionService,
    private toastService: ToastService,
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    // Load logo state from cache immediately to prevent flash
    const windowCache = (window as any).__cachedLogos;
    const useLogo = windowCache?.useLogo || localStorage.getItem('branding_use_logo') === 'true';
    this.hasLogo = useLogo;
  }

  ngOnInit(): void {
    // Track page view on home component load
    this.analyticsService.trackPageView();

    this.prayers$ = this.prayerService.prayers$;
    this.prompts$ = this.promptService.prompts$;
    this.loading$ = this.prayerService.loading$;
    this.error$ = this.prayerService.error$;
    this.isAdmin$ = this.adminAuthService.isAdmin$;
    this.hasAdminEmail$ = this.adminAuthService.hasAdminEmail$;

    // Load admin settings (deletion and update policies)
    this.loadAdminSettings();

    // Subscribe to ALL prayers to update counts (not filtered) - with cleanup
    this.prayerService.allPrayers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prayers => {
        this.currentPrayersCount = prayers.filter(p => p.status === 'current').length;
        this.answeredPrayersCount = prayers.filter(p => p.status === 'answered').length;
        this.totalPrayersCount = prayers.length;
      });

    // Subscribe to prompts for count - with cleanup
    this.prompts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prompts => {
        this.promptsCount = prompts.length;
        this.cdr.markForCheck();
      });
    
    // Subscribe to admin status - with cleanup
    this.adminAuthService.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => {
        this.isAdmin = isAdmin;
      });

    // Apply default filter
    this.prayerService.applyFilters(this.filters);
  }

  ngOnDestroy(): void {
    // Complete the subject to unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadAdminSettings(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('admin_settings')
        .select('deletions_allowed, updates_allowed')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading admin settings:', error);
        return;
      }

      if (data) {
        // Load deletion and update policies from admin settings
        // These control who can delete prayers/updates and who can submit updates
        this.deletionsAllowed = data.deletions_allowed || 'everyone';
        this.updatesAllowed = data.updates_allowed || 'everyone';
        this.cdr.markForCheck();
      }
    } catch (err) {
      console.error('Error loading admin settings:', err);
    }
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
      // User is logged in - submit directly without verification
      await this.submitUpdate(updateData);
    } catch (error) {
      console.error('Error adding update:', error);
      this.toastService.error('Failed to submit update');
    }
  }

  async deleteUpdate(updateId: string): Promise<void> {
    try {
      // User is logged in - submit directly without verification
      await this.prayerService.deleteUpdate(updateId);
      this.toastService.success('Update deleted successfully');
    } catch (error) {
      console.error('Error deleting update:', error);
      this.toastService.error('Failed to delete update');
    }
  }

  async requestDeletion(requestData: any): Promise<void> {
    try {
      // User is logged in - submit directly without verification
      await this.submitDeletion(requestData);
    } catch (error) {
      console.error('Error requesting deletion:', error);
      this.toastService.error('Failed to submit deletion request');
    }
  }
  async requestUpdateDeletion(requestData: any): Promise<void> {
    try {
      // User is logged in - submit directly without verification
      await this.submitUpdateDeletion(requestData);
    } catch (error) {
      console.error('Error requesting update deletion:', error);
      this.toastService.error('Failed to submit update deletion request');
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
  
  private async submitUpdate(updateData: any): Promise<void> {
    await this.prayerService.addUpdate(updateData);
  }

  private async submitDeletion(requestData: any): Promise<void> {
    await this.prayerService.requestDeletion(requestData);
  }

  private async submitUpdateDeletion(requestData: any): Promise<void> {
    await this.prayerService.requestUpdateDeletion(requestData);
  }

  async logout(): Promise<void> {
    await this.adminAuthService.logout();
    this.toastService.success('Logged out successfully');
  }

  navigateToAdmin(): void {
    // Check if admin session is still active
    this.adminAuthService.isAdmin$.pipe(take(1)).subscribe(isAdmin => {
      if (isAdmin) {
        // Session is active, navigate to admin panel
        this.router.navigate(['/admin']);
      } else {
        // Admin session has expired - show MFA modal to re-authenticate
        // Trigger verification flow similar to requestDeletion
        this.showAdminMfaModal();
      }
    });
  }

  private showAdminMfaModal(): void {
    // Get user email from localStorage
    let userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      userEmail = localStorage.getItem('prayerapp_user_email');
    }
    if (!userEmail) {
      userEmail = localStorage.getItem('approvalAdminEmail');
    }

    if (!userEmail) {
      this.toastService.error('Email not found. Please log in again.');
      return;
    }

    // Navigate to admin login to re-authenticate with MFA
    this.router.navigate(['/login'], {
      queryParams: { 
        email: userEmail,
        sessionExpired: true
      }
    });
  }

  getUserEmail(): string {
    // Get email from cached UserSessionService
    const cachedEmail = this.userSessionService.getUserEmail();
    if (cachedEmail) return cachedEmail;
    
    // Fall back to localStorage if service doesn't have it yet
    const approvalEmail = localStorage.getItem('approvalAdminEmail');
    if (approvalEmail) return approvalEmail;
    
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) return userEmail;
    
    const prayerappEmail = localStorage.getItem('prayerapp_user_email');
    if (prayerappEmail) return prayerappEmail;
    
    return 'Not logged in';
  }
}
