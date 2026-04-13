import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import type { AdminHelpSection } from '../types/admin-help-content';

@Injectable({
  providedIn: 'root',
})
export class AdminHelpContentService {
  private sectionsSubject = new BehaviorSubject<AdminHelpSection[]>(this.getDefaultSections());
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  readonly sections$ = this.sectionsSubject.asObservable();
  readonly isLoading$ = this.isLoadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor() {
    this.isLoadingSubject.next(false);
    this.errorSubject.next(null);
  }

  getSections(): Observable<AdminHelpSection[]> {
    return this.sections$;
  }

  private getDefaultSections(): AdminHelpSection[] {
    const now = new Date();
    return [
      {
        id: 'admin_help_email_subscribers_overview',
        title: 'Email Subscribers — list & toolbar',
        description:
          'Start the guided tour — searches app-test, then walks each column on the first row (name through delete) plus pagination. Does not open Add Subscriber.',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/><circle cx="18" cy="18" r="3"/></svg>',
        content: [],
        order: 1,
        isActive: true,
        videoEmbedUrl: undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      },
      {
        id: 'admin_help_email_subscribers',
        title: 'Email subscribers & Planning Center',
        description: 'Start the guided tour — walks Settings → Email, subscribers, Add Subscriber, and Planning Center search.',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        content: [],
        order: 2,
        isActive: true,
        videoEmbedUrl: undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      },
      {
        id: 'admin_help_prayer_editor',
        title: 'Prayer Editor — create a prayer',
        description:
          'Start the guided tour — walks Settings → Tools → Prayer Editor and each field in Create New Prayer, including the subscriber prompt after save.',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        content: [],
        order: 3,
        isActive: true,
        videoEmbedUrl: undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      },
      {
        id: 'admin_help_prayer_editor_manage',
        title: 'Prayer Editor — edit, delete, add update',
        description:
          'Start the guided tour — opens edit and Add Update on the first prayer, walks each field, then cancels (nothing saved).',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        content: [],
        order: 4,
        isActive: true,
        videoEmbedUrl: undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      },
    ];
  }
}
