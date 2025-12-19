import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
      <div class="max-w-md w-full mx-auto space-y-8 p-4 sm:p-8">
        <div class="text-center">
          <!-- Shield Icon -->
          <svg class="mx-auto h-12 w-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <h2 class="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Admin Portal
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in with a magic link sent to your email
          </p>
        </div>

        <!-- Success State -->
        <div *ngIf="success" class="space-y-4">
          <!-- Main success notification -->
          <div class="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6 shadow-lg">
            <div class="flex items-start gap-3 mb-4">
              <!-- CheckCircle Icon -->
              <svg class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="flex-1">
                <h3 class="text-green-900 dark:text-green-100 font-bold text-lg">
                  Magic Link Sent! 📧
                </h3>
                <p class="text-green-800 dark:text-green-200 text-sm mt-1">
                  We've sent a secure sign-in link to:
                </p>
                <p class="text-green-900 dark:text-green-100 font-semibold text-base mt-2">
                  {{email}}
                </p>
              </div>
            </div>

            <!-- Step-by-step instructions -->
            <div class="mt-4 bg-white dark:bg-gray-800 rounded-md p-4 border border-green-200 dark:border-green-800">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                What to do next:
              </h4>
              <ol class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li class="flex items-start gap-2">
                  <span class="flex-shrink-0 w-5 h-5 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Open your email inbox and look for an email from Prayer App</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="flex-shrink-0 w-5 h-5 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Click the <strong>"Sign in to Admin Portal"</strong> button in the email</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="flex-shrink-0 w-5 h-5 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>You'll be automatically signed in to the Admin Portal</span>
                </li>
              </ol>
            </div>

            <!-- Additional info -->
            <div class="mt-4 flex items-start gap-2 text-xs text-green-700 dark:text-green-300">
              <!-- AlertCircle Icon -->
              <svg class="flex-shrink-0 mt-0.5 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p>
                <strong>Don't see the email?</strong> Check your spam/junk folder. The link expires in 60 minutes.
              </p>
            </div>
          </div>

          <button
            (click)="resetForm()"
            class="w-full py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Send to a different email
          </button>
        </div>

        <!-- Login Form -->
        <form *ngIf="!success" class="mt-8 space-y-6" (ngSubmit)="handleSubmit($event)">
          <div>
            <label for="email" class="sr-only">
              Admin Email Address
            </label>
            <div class="relative">
              <!-- Mail Icon -->
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <input
                id="email"
                name="email"
                type="email"
                required
                [(ngModel)]="email"
                class="pl-12 pr-3 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Admin Email Address"
              />
            </div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter your admin email to receive a secure sign-in link
            </p>
          </div>

          <!-- Error Message -->
          <div *ngIf="error" class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <!-- AlertCircle Icon -->
            <svg class="text-red-600 dark:text-red-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-red-800 dark:text-red-200 text-sm">{{error}}</span>
          </div>

          <button
            type="submit"
            [disabled]="loading"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div *ngIf="loading" class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sending magic link...
            </div>
            <span *ngIf="!loading">Send Magic Link</span>
          </button>
        </form>

        <div class="mt-4 text-center">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            🔒 Passwordless authentication via Supabase Magic Link
          </p>
        </div>

        <div class="mt-6 text-center">
          <a
            [routerLink]="['/']"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <!-- ArrowLeft Icon -->
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Main Page
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AdminLoginComponent implements OnInit, OnDestroy {
  email = '';
  error = '';
  success = false;
  loading = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private adminAuthService: AdminAuthService,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if we just sent a magic link (persisted across re-renders)
    const magicLinkSent = sessionStorage.getItem('magic_link_sent');
    const savedEmail = sessionStorage.getItem('magic_link_email');
    
    if (magicLinkSent === 'true' && savedEmail) {
      this.success = true;
      this.email = savedEmail;
    }

    // Check if user is already authenticated
    this.adminAuthService.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => {
        if (isAdmin) {
          this.router.navigate(['/admin']);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    this.error = '';
    this.success = false;
    this.loading = true;

    // Clear any previous success state
    sessionStorage.removeItem('magic_link_sent');
    sessionStorage.removeItem('magic_link_email');

    try {
      // Check if email is admin
      const adminCheckPromise = this.supabaseService.directQuery<{ is_admin: boolean }>(
        'email_subscribers',
        {
          select: 'is_admin',
          eq: { 
            email: this.email.toLowerCase().trim(),
            is_admin: true
          },
          limit: 1
        }
      ).then(result => ({
        data: (result.data && Array.isArray(result.data) && result.data.length > 0) ? result.data[0] : null,
        error: result.error
      }));

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Admin status check timed out. Please try again.')), 10000)
      );

      const { data: adminCheck, error: checkError } = await Promise.race([
        adminCheckPromise,
        timeoutPromise
      ]);

      if (checkError) {
        console.error('Error checking admin status:', checkError);
        this.error = 'An error occurred. Please try again.';
        this.loading = false;
        return;
      }

      if (!adminCheck) {
        this.error = 'This email address does not have admin access.';
        this.loading = false;
        return;
      }

      // Email is an admin, send magic link
      const result = await this.adminAuthService.sendMagicLink(this.email);
      
      if (result.success) {
        // Save to sessionStorage to persist across re-renders
        sessionStorage.setItem('magic_link_sent', 'true');
        sessionStorage.setItem('magic_link_email', this.email);
        this.success = true;
      } else {
        this.error = result.error || 'Failed to send magic link. Please try again.';
      }
    } catch (err) {
      console.error('Error sending magic link:', err);
      this.error = 'An error occurred. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  resetForm() {
    // Clear sessionStorage
    sessionStorage.removeItem('magic_link_sent');
    sessionStorage.removeItem('magic_link_email');
    this.success = false;
    this.email = '';
  }
}
