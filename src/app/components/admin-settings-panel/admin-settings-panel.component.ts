import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { AppBrandingComponent } from '../app-branding/app-branding.component';
import { PromptManagerComponent } from '../prompt-manager/prompt-manager.component';
import { PrayerTypesManagerComponent } from '../prayer-types-manager/prayer-types-manager.component';
import { EmailSettingsComponent } from '../email-settings/email-settings.component';
import { AdminUserManagementComponent } from '../admin-user-management/admin-user-management.component';
import type { PrayerSearchComponent } from '../prayer-search/prayer-search.component';
import { SecurityPolicySettingsComponent } from '../security-policy-settings/security-policy-settings.component';
import { TestAccountSettingsComponent } from '../test-account-settings/test-account-settings.component';
import { EmailVerificationSettingsComponent } from '../email-verification-settings/email-verification-settings.component';
import { GitHubSettingsComponent } from '../github-settings/github-settings.component';
import { PrayerEncouragementSettingsComponent } from '../prayer-encouragement-settings/prayer-encouragement-settings.component';
import { RichTextEditorsSettingsComponent } from '../rich-text-editors-settings/rich-text-editors-settings.component';
import { PlanningCenterListMapperComponent } from '../planning-center-list-mapper/planning-center-list-mapper.component';
import { MemorizationRecommendationsManagerComponent } from '../memorization-recommendations-manager/memorization-recommendations-manager.component';
import { VerseMemorizationPrayerManagerComponent } from '../verse-memorization-prayer-manager/verse-memorization-prayer-manager.component';
import { MemorizationReciteSettingsComponent } from '../memorization-recite-settings/memorization-recite-settings.component';
import { AdminSiteAnalyticsPanelComponent } from '../admin-site-analytics-panel/admin-site-analytics-panel.component';
import { AdminSettingsToolsPanelComponent } from '../admin-settings-tools-panel/admin-settings-tools-panel.component';
import { ADMIN_SETTINGS_TABS, type AdminSettingsTab } from '../../lib/admin-settings-tabs';
import type { AnalyticsStats } from '../../services/analytics.service';

@Component({
  selector: 'app-admin-settings-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminSiteAnalyticsPanelComponent,
    AppBrandingComponent,
    PromptManagerComponent,
    PrayerTypesManagerComponent,
    EmailSettingsComponent,
    AdminUserManagementComponent,
    SecurityPolicySettingsComponent,
    TestAccountSettingsComponent,
    EmailVerificationSettingsComponent,
    GitHubSettingsComponent,
    PrayerEncouragementSettingsComponent,
    RichTextEditorsSettingsComponent,
    PlanningCenterListMapperComponent,
    MemorizationRecommendationsManagerComponent,
    MemorizationReciteSettingsComponent,
    VerseMemorizationPrayerManagerComponent,
    AdminSettingsToolsPanelComponent,
  ],
  template: `
    <div>
      <div class="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        @for (tab of settingsTabs; track tab.id) {
          <button
            type="button"
            [id]="tab.domId"
            (click)="settingsTabChange.emit(tab.id)"
            [class]="
              'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ' +
              (activeSettingsTab === tab.id
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')
            "
          >
            @switch (tab.id) {
              @case ('analytics') {
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              }
              @case ('content') {
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              }
              @case ('email') {
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              }
              @case ('tools') {
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                  ></path>
                </svg>
              }
              @case ('security') {
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              }
            }
            {{ tab.label }}
          </button>
        }
      </div>

      @if (activeSettingsTab === 'analytics') {
        <div class="space-y-6">
          <app-admin-site-analytics-panel [stats]="analyticsStats"></app-admin-site-analytics-panel>
        </div>
      }

      @if (activeSettingsTab === 'content') {
        <div class="space-y-6">
          <div class="mb-4">
            <app-prayer-encouragement-settings></app-prayer-encouragement-settings>
          </div>
          <div class="mb-4">
            <app-rich-text-editors-settings></app-rich-text-editors-settings>
          </div>
          <div class="mb-4">
            <app-github-settings></app-github-settings>
          </div>
          <div class="mb-4">
            <app-branding></app-branding>
          </div>
          <div class="mb-4">
            <app-prompt-manager #promptManager></app-prompt-manager>
          </div>
          <div class="mb-4">
            <app-prayer-types-manager #prayerTypesManager></app-prayer-types-manager>
          </div>
          <div class="mb-4">
            <app-memorization-recommendations-manager
              #memorizeRecommendationsManager
            ></app-memorization-recommendations-manager>
          </div>
          <div class="mb-4">
            <app-verse-memorization-prayer-manager
              #verseMemorizationPrayerManager
            ></app-verse-memorization-prayer-manager>
          </div>
          <div class="mb-4">
            <app-memorization-recite-settings></app-memorization-recite-settings>
          </div>
          <div class="mb-4">
            <app-planning-center-list-mapper></app-planning-center-list-mapper>
          </div>
        </div>
      }

      @if (activeSettingsTab === 'email') {
        <div class="space-y-6">
          <div class="mb-4">
            <app-email-settings #emailSettings></app-email-settings>
          </div>
        </div>
      }

      @if (activeSettingsTab === 'tools') {
        <app-admin-settings-tools-panel #toolsPanel></app-admin-settings-tools-panel>
      }

      @if (activeSettingsTab === 'security') {
        <div class="space-y-6">
          <div class="mb-4">
            <app-admin-user-management></app-admin-user-management>
          </div>
          <div class="mb-4">
            <app-email-verification-settings></app-email-verification-settings>
          </div>
          <div class="mb-4">
            <app-security-policy-settings></app-security-policy-settings>
          </div>
          <div class="mb-4">
            <app-test-account-settings></app-test-account-settings>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminSettingsPanelComponent {
  readonly settingsTabs = ADMIN_SETTINGS_TABS;

  @Input({ required: true }) activeSettingsTab!: AdminSettingsTab;
  @Input({ required: true }) analyticsStats!: AnalyticsStats;

  @Output() settingsTabChange = new EventEmitter<AdminSettingsTab>();

  @ViewChild('emailSettings') emailSettingsRef?: EmailSettingsComponent;
  @ViewChild('toolsPanel') toolsPanelRef?: AdminSettingsToolsPanelComponent;
  @ViewChild('promptManager') promptManagerRef?: PromptManagerComponent;
  @ViewChild('prayerTypesManager') prayerTypesManagerRef?: PrayerTypesManagerComponent;
  @ViewChild('memorizeRecommendationsManager')
  memorizeRecommendationsManagerRef?: MemorizationRecommendationsManagerComponent;

  get prayerSearchRef(): PrayerSearchComponent | undefined {
    return this.toolsPanelRef?.prayerSearchRef;
  }
}
