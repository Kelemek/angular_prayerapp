import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef,
  inject,
} from "@angular/core";
import { AsyncPipe, NgClass } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Observable, of } from "rxjs";
import { RichTextViewComponent } from "../rich-text-view/rich-text-view.component";
import { UserSessionService } from "../../services/user-session.service";
import { PrayerEncouragementService } from "../../services/prayer-encouragement.service";
import { PrayerService } from "../../services/prayer.service";
import { AdminAuthService } from "../../services/admin-auth.service";
import { SupabaseService } from "../../services/supabase.service";

const PRAY_FOR_MODAL_DO_NOT_SHOW_KEY = "prayer_encouragement_modal_do_not_show";

type UpdatesAllowed = "everyone" | "original-requestor" | "admin-only";

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  category?: string;
  user_email?: string;
  email?: string;
  prayed_for_count?: number;
  prayer_image?: string | null;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    is_answered?: boolean;
    is_anonymous?: boolean;
  }>;
  updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    is_answered?: boolean;
    is_anonymous?: boolean;
  }>;
}

interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
}

@Component({
  selector: "app-prayer-display-card",
  standalone: true,
  imports: [NgClass, RichTextViewComponent, AsyncPipe, FormsModule],
  template: `
    <!-- Prayer Card -->
    @if (prayer) {
    <div
      class="presentation-card-scroll bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto"
    >
      <!-- Category Badge (Personal Prayers) -->
      @if (prayer.category && isPersonalPrayer()) {
      <div class="mb-6">
        <span
          class="inline-block px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm md:text-base lg:text-lg font-medium"
        >
          {{ prayer.category }}
        </span>
      </div>
      }

      <!-- Prayer For -->
      <div class="mb-6">
        <div class="flex items-center gap-6">
          @if (isMemberPrayer() && prayer.prayer_image) {
          <img
            [src]="prayer.prayer_image"
            [alt]="'Avatar for ' + prayer.prayer_for"
            class="w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900 shadow-xl flex-shrink-0"
          />
          }
          <div>
            <div
              class="text-lg md:text-xl lg:text-2xl font-semibold mb-2 text-blue-600 dark:text-blue-300"
            >
              {{ isMemberPrayer() ? "Member Prayer:" : "Prayer For:" }}
            </div>
            <div
              class="text-2xl md:text-3xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100"
            >
              {{ prayer.prayer_for }}
            </div>
          </div>
        </div>
      </div>

      <!-- Description (Hidden for members since it's just a generated label) -->
      @if (!isMemberPrayer()) {
      <div class="mb-6">
        <app-rich-text-view
          class="block text-lg md:text-2xl lg:text-3xl leading-relaxed text-gray-800 dark:text-gray-100"
          [text]="prayer.description"
        ></app-rich-text-view>
      </div>
      }

      <!-- Meta Info -->
      <div
        class="flex justify-between items-center mb-1 text-sm md:text-base lg:text-xl text-gray-700 dark:text-gray-300 flex-wrap gap-4"
      >
        @if (!isPersonalPrayer() && !isMemberPrayer()) {
        <div>
          <span class="font-semibold">Requested by:</span>
          {{ prayer.requester || "Anonymous" }}
        </div>
        } @if (!isPersonalPrayer() && !isMemberPrayer()) {
        <div [ngClass]="getStatusBadgeClasses(prayer.status)">
          {{ prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1) }}
        </div>
        }
      </div>

      <!-- Date and Time (Hidden for PC members) -->
      @if (!isMemberPrayer()) {
      <div
        class="mb-6 text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300"
      >
        <span class="font-semibold">Date:</span>
        {{ formatDate(prayer.created_at) }}
      </div>
      }

      <!-- Prayer encouragement actions -->
      @if (showAddUpdateButton()) {
      <div class="flex flex-wrap gap-3 items-center mb-6">
        @if ((userSessionService.getShowPrayForButton$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async) && !isMemberPrayer()) {
          @if (canPrayFor$ | async) {
            <button
              type="button"
              (click)="onPrayForClick()"
              title="Record that you prayed for this request"
              class="px-4 py-2 text-base md:text-lg font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-600 dark:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer whitespace-nowrap"
            >
              Pray For
            </button>
          } @else {
            <button
              type="button"
              disabled
              [title]="'You can pray for this again in ' + ((prayerEncouragementService.getCooldownHoursForPrayer$(isPersonalPrayer()) | async) ?? 4) + ' hours'"
              class="px-4 py-2 text-base md:text-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-300 dark:border-gray-600 cursor-not-allowed whitespace-nowrap"
            >
              Prayed For
            </button>
          }
        }
        @if ((userSessionService.getShowPrayingCount$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async) && showPrayedForBadge()) {
          <span
            class="px-3 py-2 text-base md:text-lg font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-600 dark:border-blue-500 whitespace-nowrap"
            title="Number praying for this request"
          >
            {{ (prayer.prayed_for_count ?? 0) }} {{ isPersonalPrayer() ? 'Prayers' : 'Praying' }}
          </span>
        }
      </div>
      }

      <!-- Updates Section -->
      @if (getAllUpdates().length > 0) {
      <div class="border-t border-gray-300 dark:border-gray-600 pt-6">
        <div class="flex items-center justify-between mb-4">
          <div
            class="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100"
          >
            Recent Updates @if (!showAllUpdates && getRecentUpdates().length <
            getAllUpdates().length) {<span
              >({{ getRecentUpdates().length }} of
              {{ getAllUpdates().length }})</span
            >}
          </div>
          @if (shouldShowToggleButton()) {
          <button
            (click)="showAllUpdates = !showAllUpdates"
            class="text-sm md:text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            {{ showAllUpdates ? "Show less" : "Show all" }}
            <svg
              [class]="
                'transform transition-transform ' +
                (showAllUpdates ? 'rotate-180' : '')
              "
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          }
        </div>
        <div class="space-y-4">
          @for (update of getRecentUpdates(); track update.id) {
          <div class="bg-gray-100 dark:bg-gray-700 rounded-xl p-5 relative">
            <div class="flex items-start justify-between mb-2">
              <div
                class="text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300"
              >
                @if (!isPersonalPrayer() && !isMemberPrayer()) { Updated by:
                {{ update.is_anonymous ? "Anonymous" : update.author }} •
                {{ formatDate(update.created_at) }}
                } @else {
                {{ formatDate(update.created_at) }}
                }
              </div>

              @if (isMemberPrayer() && update.is_answered) {
              <span
                class="inline-flex items-center justify-center px-4 py-1.5 bg-green-600 dark:bg-green-700 text-white rounded-full text-base lg:text-lg font-bold whitespace-nowrap shadow-sm"
              >
                Answered
              </span>
              }
            </div>
            <app-rich-text-view
              class="block text-base md:text-lg lg:text-xl text-gray-800 dark:text-gray-200"
              [text]="update.content"
            ></app-rich-text-view>
          </div>
          }
        </div>
      </div>
      }
    </div>

    <!-- Pray For explanation modal -->
    @if (showPrayForModal) {
    <div class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Pray For This Request</h2>
        </div>
        <div class="px-6 py-4">
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            @if (isPersonalPrayer()) {
            When you click Pray For, your personal prayer count increases so you can track how often you have prayed for this request.
            } @else {
            When you click Pray For, the person who submitted this prayer request will see that others have prayed for them. Only the total count is shown—your click is anonymous.
            }
          </p>
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p class="text-sm text-blue-700 dark:text-blue-300">
              @if (isPersonalPrayer()) {
              You can pray for the same personal request again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(true) | async) ?? 4 }} hours. Change this cooldown in Settings under Prayer encouragement on cards.
              } @else {
              This encourages the requester by showing how many times their prayer has been lifted up. You can pray for the same request again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(false) | async) ?? 4 }} hours.
              }
            </p>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              [(ngModel)]="prayForDoNotShowAgain"
              name="prayForDoNotShowAgain"
              class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Do not show this again</span>
          </label>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            type="button"
            (click)="showPrayForModal = false; prayForDoNotShowAgain = false"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="onConfirmPrayForFromModal()"
            class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium cursor-pointer"
          >
            Pray For
          </button>
        </div>
      </div>
    </div>
    }
    }

    <!-- Prompt Card -->
    @if (prompt) {
    <div
      class="presentation-card-scroll bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto"
    >
      <!-- Type Badge -->
      <div class="mb-6">
        <span
          class="inline-block px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 bg-[#988F83] text-white rounded-full text-sm md:text-base lg:text-xl font-semibold"
        >
          {{ prompt.type }}
        </span>
      </div>

      <!-- Title -->
      <div class="mb-6">
        <div
          class="text-2xl md:text-3xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100"
        >
          {{ prompt.title }}
        </div>
      </div>

      <!-- Description -->
      <div class="mb-6">
        <div
          class="text-lg md:text-2xl lg:text-3xl leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap"
        >
          {{ prompt.description }}
        </div>
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: contents;
      }
      .presentation-card-scroll {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .presentation-card-scroll::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class PrayerDisplayCardComponent implements OnInit {
  @Input() set prayer(value: Prayer | undefined) {
    const previousId = this._prayer?.id;
    this._prayer = value;
    if (previousId !== undefined && previousId !== value?.id) {
      this.dismissPrayForModal();
    }
    this.refreshCanPrayFor$();
  }
  get prayer(): Prayer | undefined {
    return this._prayer;
  }
  private _prayer?: Prayer;

  @Input() prompt?: PrayerPrompt;

  readonly userSessionService = inject(UserSessionService);
  readonly prayerEncouragementService = inject(PrayerEncouragementService);
  private readonly prayerService = inject(PrayerService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly cdr = inject(ChangeDetectorRef);

  showAllUpdates = false;
  showPrayForModal = false;
  prayForDoNotShowAgain = false;
  updatesAllowed: UpdatesAllowed = "everyone";
  canPrayFor$ = of(true);

  ngOnInit(): void {
    void this.loadUpdatesAllowed();
    this.refreshCanPrayFor$();
  }

  private refreshCanPrayFor$(): void {
    if (!this._prayer?.id) {
      this.canPrayFor$ = of(true);
      return;
    }
    this.canPrayFor$ = this.prayerEncouragementService.getCanPrayFor$(
      this._prayer.id,
      this.isPersonalPrayer()
    );
  }

  private dismissPrayForModal(): void {
    this.showPrayForModal = false;
    this.prayForDoNotShowAgain = false;
  }

  private async loadUpdatesAllowed(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from("admin_settings")
        .select("updates_allowed")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Error loading admin settings:", error);
        return;
      }

      if (data?.updates_allowed) {
        this.updatesAllowed = data.updates_allowed as UpdatesAllowed;
        this.cdr.markForCheck();
      }
    } catch (err) {
      console.error("Error loading admin settings:", err);
    }
  }

  showAddUpdateButton(): boolean {
    if (this.isPersonalPrayer()) return true;
    if (this.adminAuthService.getIsAdmin()) return true;
    if (this.updatesAllowed === "admin-only") return false;
    if (this.updatesAllowed === "original-requestor") {
      return this.isCurrentUserTheRequester();
    }
    return true;
  }

  showPrayedForBadge(): boolean {
    if (!this.prayer) return false;
    const count = this.prayer.prayed_for_count ?? 0;
    if (count <= 0) return false;
    // Personal prayers are private to the owner; they always see their count.
    if (this.isPersonalPrayer()) return true;
    if (this.adminAuthService.getIsAdmin()) return true;
    return this.isCurrentUserTheRequester();
  }

  onPrayForClick(): void {
    if (localStorage.getItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY) === "true") {
      void this.confirmPrayFor();
      return;
    }
    this.showPrayForModal = true;
    this.cdr.markForCheck();
  }

  onConfirmPrayForFromModal(): void {
    if (this.prayForDoNotShowAgain) {
      try {
        localStorage.setItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY, "true");
      } catch {
        // Ignore quota or disabled localStorage
      }
    }
    this.showPrayForModal = false;
    this.prayForDoNotShowAgain = false;
    void this.confirmPrayFor();
    this.cdr.markForCheck();
  }

  async confirmPrayFor(): Promise<void> {
    const prayedForPrayer = this.prayer;
    if (!prayedForPrayer) return;
    this.showPrayForModal = false;
    const prayerId = prayedForPrayer.id;
    const isPersonal = this.isPersonalPrayer();
    if (!this.prayerEncouragementService.canPrayFor(prayerId, isPersonal)) return;
    this.prayerEncouragementService.recordPrayedFor(prayerId, isPersonal);
    const newCount = isPersonal
      ? await this.prayerService.incrementPersonalPrayedFor(prayerId)
      : await this.prayerService.incrementPrayedFor(prayerId);
    if (newCount !== null) {
      prayedForPrayer.prayed_for_count = newCount;
    } else {
      this.prayerEncouragementService.clearPrayedForCooldown(prayerId, isPersonal);
    }
    this.cdr.markForCheck();
  }

  private isCurrentUserTheRequester(): boolean {
    if (!this.prayer) return false;
    const session = this.userSessionService.getCurrentSession();
    const userEmail = session?.email || "";
    return userEmail.toLowerCase() === (this.prayer.email || "").toLowerCase();
  }

  getStatusBadgeClasses(status: string): string {
    const baseClasses = "px-5 py-2 rounded-full border ";
    switch (status) {
      case "current":
        return (
          baseClasses +
          "bg-blue-50 dark:bg-blue-900/20 text-[#0047AB] dark:text-[#4A90E2] border-[#0047AB] dark:border-[#0047AB]"
        );
      case "answered":
        return (
          baseClasses +
          "bg-green-50 dark:bg-green-900/20 text-[#39704D] dark:text-[#5FB876] border-[#39704D] dark:border-[#39704D]"
        );
      default:
        return (
          baseClasses +
          "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-400 dark:border-gray-600"
        );
    }
  }

  getRecentUpdates() {
    const allUpdates = this.getAllUpdates();
    if (allUpdates.length === 0) return [];

    const sortedUpdates = [...allUpdates].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (this.showAllUpdates) return sortedUpdates;

    // Get updates from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUpdates = sortedUpdates.filter(
      (update) => new Date(update.created_at).getTime() > oneWeekAgo.getTime()
    );

    // If there are updates less than 1 week old, show all of them
    // Otherwise, show only the most recent update
    return recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
  }

  getAllUpdates() {
    if (!this.prayer) return [];
    return (this.prayer.prayer_updates || []).concat(this.prayer.updates || []);
  }

  shouldShowToggleButton(): boolean {
    const allUpdates = this.getAllUpdates();
    if (allUpdates.length === 0) return false;
    const displayed = this.getRecentUpdates();
    return displayed.length < allUpdates.length || this.showAllUpdates;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " at " +
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  }

  isMemberPrayer(): boolean {
    return !!this.prayer?.id?.startsWith("pc-member-");
  }

  isPersonalPrayer(): boolean {
    return !!this.prayer?.user_email;
  }
}
