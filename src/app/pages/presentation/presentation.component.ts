import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { PrayerService } from '../../services/prayer.service';
import { CacheService } from '../../services/cache.service';
import { ThemeService } from '../../services/theme.service';
import { PresentationToolbarComponent } from '../../components/presentation-toolbar/presentation-toolbar.component';
import { PrayerDisplayCardComponent } from '../../components/prayer-display-card/prayer-display-card.component';
import { PresentationSettingsModalComponent } from '../../components/presentation-settings-modal/presentation-settings-modal.component';

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
}

interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
}

type ContentType = 'prayers' | 'prompts' | 'personal' | 'all';
type ThemeOption = 'light' | 'dark' | 'system';
type TimeFilter = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [
    PresentationToolbarComponent,
    PrayerDisplayCardComponent,
    PresentationSettingsModalComponent
  ],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white relative">
      <!-- Loading State -->
      @if (loading) {
      <div class="w-full min-h-screen flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div class="text-gray-900 dark:text-white text-xl">
            Loading {{ contentType === 'prayers' ? 'prayers' : contentType === 'prompts' ? 'prompts' : contentType === 'personal' ? 'personal prayers' : 'all content' }}...
          </div>
        </div>
      </div>
      }

      <!-- Main Content Display -->
      @if (!loading && items.length > 0) {
      <div 
        [class]="'h-screen flex flex-col justify-center px-3 md:px-6 py-6 transition-all duration-300 relative z-0 ' + (showControls ? 'pb-28' : 'pb-6')">
        <div class="w-full max-w-6xl mx-auto h-full">
          <div class="h-full overflow-y-auto flex items-center px-2">
            <app-prayer-display-card
              [prayer]="isPrayer(currentItem) ? currentItem : undefined"
              [prompt]="isPrompt(currentItem) ? currentItem : undefined">
            </app-prayer-display-card>
          </div>
        </div>
      </div>
      }

      <!-- No Content Message -->
      @if (!loading && items.length === 0) {
      <div class="w-full min-h-screen flex items-center justify-center">
        <div class="text-center p-8">
          <div class="text-6xl mb-4">🙏</div>
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Content Available</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ contentType === 'prayers' ? 'No prayers match your current filters' : 
               contentType === 'prompts' ? 'No prayer prompts available' :
               contentType === 'personal' ? 'No personal prayers available' :
               'No content available' }}
          </p>
          <button
            (click)="exitPresentation()"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Return to Home
          </button>
        </div>
      </div>
      }

      <!-- Toolbar -->
      <app-presentation-toolbar
        [visible]="showControls"
        [isPlaying]="isPlaying"
        [showTimer]="true"
        [countdownRemaining]="countdownRemaining"
        [currentDuration]="currentDuration"
        (previous)="previousSlide()"
        (next)="nextSlide()"
        (togglePlay)="togglePlay()"
        (settingsToggle)="showSettings = !showSettings"
        (exit)="exitPresentation()">
      </app-presentation-toolbar>

      <!-- Settings Modal -->
      <app-presentation-settings-modal
        [visible]="showSettings"
        [theme]="theme"
        [smartMode]="smartMode"
        [displayDuration]="displayDuration"
        [contentType]="contentType"
        [randomize]="randomize"
        [timeFilter]="timeFilter"
        [statusFiltersCurrent]="statusFilters.current"
        [statusFiltersAnswered]="statusFilters.answered"
        [prayerTimerMinutes]="prayerTimerMinutes"
        (close)="showSettings = false"
        (themeChange)="handleThemeChange($event)"
        (smartModeChange)="smartMode = $event"
        (displayDurationChange)="displayDuration = $event"
        (contentTypeChange)="contentType = $event; handleContentTypeChange()"
        (randomizeChange)="randomize = $event; handleRandomizeChange()"
        (timeFilterChange)="timeFilter = $event; handleTimeFilterChange()"
        (statusFiltersChange)="statusFilters = $event; handleStatusFilterChange()"
        (prayerTimerMinutesChange)="prayerTimerMinutes = $event"
        (startPrayerTimer)="startPrayerTimer()"
        (refresh)="refreshContent()">
      </app-presentation-settings-modal>

      <!-- Timer Notification -->
      @if (showTimerNotification) {
      <div
        class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-12 shadow-2xl border-4 border-green-400 text-center max-w-2xl mx-4 animate-pulse relative">
          <button
            (click)="showTimerNotification = false"
            class="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-6 text-white">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <h2 class="text-6xl font-bold mb-4 text-white">Prayer Timer Complete! 🙏</h2>
          <p class="text-2xl opacity-90 text-white">Your prayer time has ended</p>
        </div>
      </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class PresentationComponent implements OnInit, OnDestroy {
  prayers: Prayer[] = [];
  prompts: PrayerPrompt[] = [];
  personalPrayers: any[] = [];
  currentIndex = 0;
  isPlaying = false;
  displayDuration = 10;
  smartMode = true;
  showSettings = false;
  loading = true;
  showControls = true;
  contentType: ContentType = 'prayers';
  statusFilters = { current: true, answered: true };
  timeFilter: TimeFilter = 'month';
  theme: ThemeOption = 'system';
  randomize = false;
  countdownRemaining = 0;
  currentDuration = 10;
  
  prayerTimerMinutes = 10;
  prayerTimerActive = false;
  prayerTimerRemaining = 0;
  showTimerNotification = false;
  showSmartModeDetails = false;
  
  private autoAdvanceInterval: any;
  private countdownSubscription: Subscription | null = null;
  private prayerTimerSubscription: Subscription | null = null;
  private initialTimerHandle: any;
  private initialPeriodElapsed = false;
  
  // Touch/swipe handling
  private touchStart: number | null = null;
  private touchEnd: number | null = null;
  private lastTap = 0;
  private readonly minSwipeDistance = 50;
  private readonly doubleTapThreshold = 300;

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private prayerService: PrayerService,
    private cacheService: CacheService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadTheme();
    this.loadContent();
    this.setupControlsAutoHide();
  }

  ngOnDestroy(): void {
    this.clearIntervals();
    if (this.initialTimerHandle) {
      clearTimeout(this.initialTimerHandle);
    }
    if (this.prayerTimerSubscription) {
      this.prayerTimerSubscription.unsubscribe();
    }
  }

  setupControlsAutoHide(): void {
    // Detect if device is non-mobile (has mouse/pointer)
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // On non-mobile devices, show controls for 5 seconds initially
    if (!isMobile) {
      this.initialTimerHandle = setTimeout(() => {
        this.initialPeriodElapsed = true;
        this.showControls = false;
      }, 5000);
    } else {
      this.initialPeriodElapsed = true; // Skip initial period on mobile
    }
  }

  @HostListener('window:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent): void {
    // Don't apply auto-hide logic during the initial 5-second period
    if (!this.initialPeriodElapsed) {
      return;
    }
    
    const windowHeight = window.innerHeight;
    const mouseY = event.clientY;
    
    // Show controls if mouse is in bottom 20% of screen, hide if not
    if (mouseY > windowHeight * 0.8) {
      this.showControls = true;
    } else if (mouseY < windowHeight * 0.75) {
      // Only hide if mouse is well away from the control area
      this.showControls = false;
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.touchEnd = null;
    this.touchStart = event.touches[0].clientX;
    
    // Handle double-tap to toggle controls
    const now = Date.now();
    if (now - this.lastTap < this.doubleTapThreshold) {
      // Double tap detected
      this.showControls = !this.showControls;
      this.lastTap = 0; // reset to prevent triple-tap triggering
    } else {
      this.lastTap = now;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    this.touchEnd = event.touches[0].clientX;
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    if (!this.touchStart || !this.touchEnd) return;
    
    const distance = this.touchStart - this.touchEnd;
    const isLeftSwipe = distance > this.minSwipeDistance;
    const isRightSwipe = distance < -this.minSwipeDistance;
    
    if (isLeftSwipe) {
      this.nextSlide();
    } else if (isRightSwipe) {
      this.previousSlide();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.previousSlide();
        break;
      case 'ArrowRight':
      case ' ':
        event.preventDefault();
        this.nextSlide();
        break;
      case 'Escape':
        event.preventDefault();
        this.exitPresentation();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        this.togglePlay();
        break;
    }
  }

  loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as ThemeOption;
    if (savedTheme) {
      this.theme = savedTheme;
    }
    this.applyTheme();
  }

  applyTheme(): void {
    const root = document.documentElement;
    let effectiveTheme: 'light' | 'dark';
    
    if (this.theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      effectiveTheme = this.theme;
    }
    
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  async loadContent(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    
    try {
      if (this.contentType === 'prayers') {
        await this.fetchPrayers();
      } else if (this.contentType === 'prompts') {
        await this.fetchPrompts();
      } else if (this.contentType === 'personal') {
        await this.fetchPersonalPrayers();
      } else {
        await Promise.all([this.fetchPrayers(), this.fetchPrompts(), this.fetchPersonalPrayers()]);
      }
      
      if (this.randomize) {
        this.shuffleItems();
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async fetchPrayers(): Promise<void> {
    try {
      let query = this.supabase.client
        .from('prayers')
        .select(`
          *,
          prayer_updates(
            id,
            content,
            author,
            created_at,
            approval_status
          )
        `)
        .eq('approval_status', 'approved');
      
      if (this.contentType === 'prayers') {
        const statuses: string[] = [];
        if (this.statusFilters.current) statuses.push('current');
        if (this.statusFilters.answered) statuses.push('answered');
        
        if (statuses.length > 0) {
          query = query.in('status', statuses);
        }
      }
      
      // Don't filter by date at database level - we need all prayers to check their updates
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter to only include approved updates (client-side filtering needed for left join)
      let prayersWithApprovedUpdates = (data || []).map(prayer => ({
        ...prayer,
        prayer_updates: (prayer.prayer_updates || []).filter((update: any) => 
          update.approval_status === 'approved'
        )
      }));
      
      // Apply time filter client-side to include prayers with recent updates
      if (this.contentType === 'prayers' && this.timeFilter !== 'all') {
        const now = new Date();
        const startDate = new Date();
        
        switch (this.timeFilter) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'twoweeks':
            startDate.setDate(now.getDate() - 14);
            break;
          case 'month':
            startDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            startDate.setDate(now.getDate() - 365);
            break;
        }
        
        const startTime = startDate.getTime();
        
        // Keep prayers where either the prayer OR any approved update is within the time range
        prayersWithApprovedUpdates = prayersWithApprovedUpdates.filter(prayer => {
          const prayerTime = new Date(prayer.created_at).getTime();
          if (prayerTime >= startTime) return true;
          
          // Check if any approved update is within the time range
          return prayer.prayer_updates.some((update: any) => 
            new Date(update.created_at).getTime() >= startTime
          );
        });
      }
      
      // Sort by most recent activity (prayer creation or latest update)
      const sortedPrayers = prayersWithApprovedUpdates
        .map(prayer => ({
          prayer,
          latestActivity: Math.max(
            new Date(prayer.created_at).getTime(),
            prayer.prayer_updates && prayer.prayer_updates.length > 0
              ? Math.max(...prayer.prayer_updates.map((u: any) => new Date(u.created_at).getTime()))
              : 0
          )
        }))
        .sort((a, b) => b.latestActivity - a.latestActivity)
        .map(({ prayer }) => prayer);
      
      this.prayers = sortedPrayers;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error fetching prayers:', error);
      this.prayers = [];
      this.cdr.markForCheck();
    }
  }

  async fetchPrompts(): Promise<void> {
    try {
      // Execute both queries in parallel for better performance
      const [typesResult, promptsResult] = await Promise.all([
        this.supabase.client
          .from('prayer_types')
          .select('name, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        
        this.supabase.client
          .from('prayer_prompts')
          .select('*')
          .order('created_at', { ascending: false})
      ]);

      if (typesResult.error) throw typesResult.error;
      if (promptsResult.error) throw promptsResult.error;

      const activeTypeNames = new Set((typesResult.data || []).map((t: any) => t.name));
      const typeOrderMap = new Map(typesResult.data?.map((t: any) => [t.name, t.display_order]) || []);

      this.prompts = (promptsResult.data || [])
        .filter((p: any) => activeTypeNames.has(p.type))
        .sort((a: any, b: any) => {
          const orderA = typeOrderMap.get(a.type) ?? 999;
          const orderB = typeOrderMap.get(b.type) ?? 999;
          return orderA - orderB;
        });
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error fetching prompts:', error);
      this.prompts = [];
      this.cdr.markForCheck();
    }
  }

  async fetchPersonalPrayers(): Promise<void> {
    try {
      // Subscribe to the observable which handles caching automatically
      const allPersonalPrayers = await new Promise<any[]>((resolve) => {
        this.prayerService.allPersonalPrayers$.subscribe(prayers => {
          resolve(prayers);
        }).unsubscribe();
      });

      if (!allPersonalPrayers || allPersonalPrayers.length === 0) {
        this.personalPrayers = [];
        this.cdr.markForCheck();
        return;
      }

      // Apply time filter
      if (this.timeFilter !== 'all') {
        const now = new Date();
        const startDate = new Date();
        
        switch (this.timeFilter) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'twoweeks':
            startDate.setDate(now.getDate() - 14);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        this.personalPrayers = allPersonalPrayers.filter((prayer: any) => {
          const prayerDate = new Date(prayer.created_at);
          if (prayerDate >= startDate && prayerDate <= now) return true;
          if (prayer.updates && Array.isArray(prayer.updates)) {
            return prayer.updates.some((update: any) => {
              const updateDate = new Date(update.created_at);
              return updateDate >= startDate && updateDate <= now;
            });
          }
          return false;
        });
      } else {
        this.personalPrayers = allPersonalPrayers;
      }

      // Apply status filters
      const statuses: string[] = [];
      if (this.statusFilters.current) statuses.push('current');
      if (this.statusFilters.answered) statuses.push('answered');
      
      if (statuses.length > 0) {
        this.personalPrayers = this.personalPrayers.filter((p: any) => statuses.includes(p.status));
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error fetching personal prayers:', error);
      this.personalPrayers = [];
      this.cdr.markForCheck();
    }
  }

  get items(): any[] {
    if (this.contentType === 'prayers') return this.prayers;
    if (this.contentType === 'prompts') return this.prompts;
    if (this.contentType === 'personal') return this.personalPrayers;
    return [...this.prayers, ...this.prompts, ...this.personalPrayers];
  }

  get currentItem(): any {
    return this.items[this.currentIndex];
  }

  isPrayer(item: any): item is Prayer {
    return item && 'prayer_for' in item;
  }

  isPrompt(item: any): item is PrayerPrompt {
    return item && 'type' in item && !('prayer_for' in item);
  }

  togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    
    if (this.isPlaying) {
      this.startAutoAdvance();
    } else {
      this.clearIntervals();
    }
  }

  startAutoAdvance(): void {
    this.clearIntervals();
    
    const duration = this.calculateCurrentDuration();
    this.currentDuration = duration;
    this.countdownRemaining = duration;
    
    this.autoAdvanceInterval = setTimeout(() => {
      this.nextSlide();
      if (this.isPlaying) {
        this.startAutoAdvance();
      }
    }, duration * 1000);
    
    this.countdownSubscription = interval(1000).subscribe(() => {
      this.ngZone.run(() => {
        if (this.countdownRemaining > 0) {
          this.countdownRemaining--;
          this.cdr.detectChanges();
        }
      });
    });
  }

  calculateCurrentDuration(): number {
    if (!this.smartMode) return this.displayDuration;
    
    const item = this.currentItem;
    if (!item) return this.displayDuration;
    
    if (this.isPrayer(item)) {
      let totalChars = (item.description?.length || 0);
      
      if (item.prayer_updates && item.prayer_updates.length > 0) {
        const recentUpdates = item.prayer_updates
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3);
        
        recentUpdates.forEach(update => {
          totalChars += (update.content?.length || 0);
        });
      }
      
      return Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
    } else {
      const totalChars = (item.description?.length || 0);
      return Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
    }
  }

  clearIntervals(): void {
    if (this.autoAdvanceInterval) {
      clearTimeout(this.autoAdvanceInterval);
      this.autoAdvanceInterval = null;
    }
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.countdownSubscription = null;
    }
  }

  nextSlide(): void {
    if (this.items.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.cdr.markForCheck();
    
    if (this.isPlaying) {
      this.startAutoAdvance();
    }
  }

  previousSlide(): void {
    if (this.items.length === 0) return;
    this.currentIndex = this.currentIndex === 0 ? this.items.length - 1 : this.currentIndex - 1;
    this.cdr.markForCheck();
    
    if (this.isPlaying) {
      this.startAutoAdvance();
    }
  }

  async refreshContent(): Promise<void> {
    await this.loadContent();
    this.currentIndex = 0;
    this.cdr.markForCheck();
  }

  async handleContentTypeChange(): Promise<void> {
    this.currentIndex = 0;
    await this.loadContent();
    this.cdr.markForCheck();
  }

  async handleStatusFilterChange(): Promise<void> {
    this.currentIndex = 0;
    if (this.contentType === 'prayers') {
      await this.fetchPrayers();
    } else if (this.contentType === 'personal') {
      await this.fetchPersonalPrayers();
    } else if (this.contentType === 'all') {
      await Promise.all([this.fetchPrayers(), this.fetchPersonalPrayers()]);
    }
    this.cdr.markForCheck();
  }

  async handleTimeFilterChange(): Promise<void> {
    this.currentIndex = 0;
    if (this.contentType === 'prayers') {
      await this.fetchPrayers();
    } else if (this.contentType === 'personal') {
      await this.fetchPersonalPrayers();
    } else if (this.contentType === 'all') {
      await Promise.all([this.fetchPrayers(), this.fetchPersonalPrayers()]);
    }
    this.cdr.markForCheck();
  }

  async handleRandomizeChange(): Promise<void> {
    if (this.randomize) {
      this.shuffleItems();
    } else {
      await this.loadContent();
    }
    this.currentIndex = 0;
    this.cdr.markForCheck();
  }

  shuffleItems(): void {
    if (this.contentType === 'prayers') {
      this.prayers = this.shuffleArray([...this.prayers]);
    } else if (this.contentType === 'prompts') {
      this.prompts = this.shuffleArray([...this.prompts]);
    } else if (this.contentType === 'personal') {
      this.personalPrayers = this.shuffleArray([...this.personalPrayers]);
    } else {
      this.prayers = this.shuffleArray([...this.prayers]);
      this.prompts = this.shuffleArray([...this.prompts]);
      this.personalPrayers = this.shuffleArray([...this.personalPrayers]);
    }
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  handleThemeChange(newTheme: ThemeOption): void {
    this.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    this.applyTheme();
  }

  startPrayerTimer(): void {
    // Clear any existing prayer timer
    if (this.prayerTimerSubscription) {
      this.prayerTimerSubscription.unsubscribe();
    }

    // Close settings modal
    this.showSettings = false;

    // Set up the timer
    this.prayerTimerActive = true;
    this.prayerTimerRemaining = this.prayerTimerMinutes * 60; // Convert minutes to seconds

    // Start countdown
    this.prayerTimerSubscription = interval(1000).subscribe(() => {
      this.ngZone.run(() => {
        this.prayerTimerRemaining--;
        this.cdr.detectChanges();
        
        if (this.prayerTimerRemaining <= 0) {
          this.prayerTimerSubscription?.unsubscribe();
          this.prayerTimerSubscription = null;
          this.prayerTimerActive = false;
          this.showTimerNotification = true;
          this.cdr.detectChanges();
        }
      });
    });
  }

  exitPresentation(): void {
    this.router.navigate(['/']);
  }
}
