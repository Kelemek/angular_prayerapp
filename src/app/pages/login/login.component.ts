import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { UserSessionService } from '../../services/user-session.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { Subject, takeUntil } from 'rxjs';
import { lookupPersonByEmail } from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule],
  template: `
    <div class="w-full min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors">
      <div class="max-w-md w-full mx-auto space-y-8 p-4 sm:p-8">
        <div class="text-center">
          <!-- Logo or Heart Icon -->
          @if (useLogo && logoUrl) {
          <div class="flex justify-center mb-4">
            <img 
              [src]="logoUrl" 
              alt="Prayer Community Logo" 
              class="h-16 w-auto max-w-xs object-contain"
            />
          </div>
          }
          @if (!useLogo || !logoUrl) {
          <svg class="mx-auto h-16 w-16 text-[#2F5F54] dark:text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          }
          <h2 class="mt-6 text-4xl font-bold text-[#2F5F54] dark:text-[#2F5F54]">
            Prayer Community
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ requireSiteLogin ? 'Sign in to join our community' : 'Secure access with verification code' }}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-500 italic">
            "Where prayer brings us together"
          </p>
        </div>

        <!-- Success State -->
        @if (success) {
        <div class="space-y-4">
          <!-- Main success notification -->
          @if (waitingForMfaCode) {
          <div class="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-6 shadow-lg">
            <div class="flex items-start gap-3 mb-4">
              <!-- CheckCircle Icon -->
              <svg class="text-[#2F5F54] dark:text-emerald-400 flex-shrink-0 mt-0.5 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="flex-1">
                <h3 class="text-[#2F5F54] dark:text-emerald-100 font-bold text-lg">
                  Check Your Email ✉️
                </h3>
                <p class="text-[#3a7566] dark:text-emerald-200 text-sm mt-1">
                  We've sent a verification code to:
                </p>
                <p class="text-[#2F5F54] dark:text-emerald-100 font-semibold text-base mt-2">
                  {{email}}
                </p>
              </div>
            </div>

            <!-- MFA Code Input Form -->
            @if (waitingForMfaCode) {
            <div class="mt-4">
              <div class="bg-white dark:bg-gray-800 rounded-md p-4 border border-emerald-200 dark:border-emerald-800 space-y-4">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Enter Your Verification Code
                </h4>
                @if (!loading) {
                <!-- Code input uses dynamic maxlength from admin settings (4, 6, or 8 digits) -->
                <input
                  #codeField
                  id="mfa-code-input"
                  type="text"
                  inputmode="numeric"
                  [maxlength]="codeLength"
                  name="mfa-code-input"
                  [(ngModel)]="mfaCodeInput"
                  (input)="onCodeInput()"
                  (blur)="sanitizeCodeInput()"
                  (keydown.enter)="handleSubmit($event)"
                  autocomplete="one-time-code"
                  placeholder="Code"
                  autofocus
                  class="w-full px-4 py-3 text-center text-2xl font-semibold letter-spacing tracking-widest border-2 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         border-emerald-400 dark:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                         disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60
                         transition-opacity duration-200"
                />
                }
                
                @if (loading) {
                <div class="w-full py-4 px-4 text-center bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-400 dark:border-emerald-500 rounded-lg flex flex-col items-center justify-center gap-4">
                  <div class="relative w-12 h-12">
                    <div class="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-emerald-500 dark:border-t-emerald-400 border-r-emerald-500 dark:border-r-emerald-400"></div>
                    <div class="absolute inset-1 animate-spin rounded-full border-4 border-transparent border-b-emerald-300 dark:border-b-emerald-600" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
                  </div>
                  <span class="text-sm font-semibold text-[#2F5F54] dark:text-emerald-300">Verifying code...</span>
                </div>
                }

                <!-- Error Message for Code Verification -->
                @if (error && waitingForMfaCode) {
                <div class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <!-- AlertCircle Icon -->
                  <svg class="text-red-600 dark:text-red-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span class="text-red-800 dark:text-red-200 text-sm">{{error}}</span>
                </div>
                }

                <!-- Resend Code Button -->
                <button
                  (click)="handleResendCode()"
                  [disabled]="resendLoading"
                  type="button"
                  class="w-full py-2 px-4 text-sm font-medium text-[#2F5F54] dark:text-emerald-400 hover:text-[#1a3a2e] dark:hover:text-emerald-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {{ resendLoading ? 'Sending...' : 'Resend Code' }}
                </button>
              </div>
            </div>
            }

            </div>
            }

            <!-- Subscriber Information Form (New Users) -->
            @if (showSubscriberForm && !showPendingApproval) {
            <div class="mt-4">
              <div class="bg-white dark:bg-gray-800 rounded-md p-4 border border-emerald-200 dark:border-emerald-800 space-y-4">
                <div>
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Welcome! Please provide your information
                  </h4>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mb-4">
                    We need your name to complete your account registration.
                  </p>
                  
                  <!-- Approval Required Warning -->
                  @if (requiresApproval) {
                  <div class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md mb-4">
                    <svg class="text-amber-600 dark:text-amber-400 w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <div class="text-xs text-amber-800 dark:text-amber-200">
                      <p class="font-medium mb-1">Admin Approval Required</p>
                      <p>Your email was not found in our system. After submitting your information, an administrator will need to approve your account before you can access the application.</p>
                    </div>
                  </div>
                  }
                </div>

                <!-- First Name -->
                <div>
                  <label for="first-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name <span class="text-red-600">*</span>
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    [(ngModel)]="firstName"
                    placeholder="Your first name"
                    [disabled]="loading"
                    required
                    class="w-full px-4 py-3 border-2 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           border-emerald-400 dark:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <!-- Last Name -->
                <div>
                  <label for="last-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name <span class="text-red-600">*</span>
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    [(ngModel)]="lastName"
                    placeholder="Your last name"
                    [disabled]="loading"
                    required
                    class="w-full px-4 py-3 border-2 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           border-emerald-400 dark:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <!-- Church Affiliation / Reason (Only if approval required) -->
                @if (requiresApproval) {
                <div>
                  <label for="affiliation-reason" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How are you affiliated with the church? <span class="text-red-600">*</span>
                  </label>
                  <textarea
                    id="affiliation-reason"
                    [(ngModel)]="affiliationReason"
                    placeholder="Please explain your connection or involvement with our church community (e.g., member, staff, volunteer, family of member, etc.)"
                    [disabled]="loading"
                    rows="3"
                    required
                    class="w-full px-4 py-3 border-2 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           border-emerald-400 dark:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
                           resize-none"
                  ></textarea>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This helps our administrators review your request</p>
                </div>
                }

                <!-- Error Message -->
                @if (error) {
                <div class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <svg class="text-red-600 dark:text-red-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span class="text-red-800 dark:text-red-200 text-sm">{{error}}</span>
                </div>
                }

                <!-- Save Button -->
                <button
                  (click)="saveNewSubscriber()"
                  [disabled]="loading || !firstName.trim() || !lastName.trim() || (requiresApproval && !affiliationReason.trim())"
                  type="button"
                  class="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2F5F54] hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F5F54] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  @if (loading) {
                  <div class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                  }
                  @if (!loading) {
                  <span>Complete Registration</span>
                  }
                </button>
              </div>
            </div>
            }

            <!-- Pending Approval Message -->
            @if (showPendingApproval) {
            <div class="mt-4">
              <div class="bg-white dark:bg-gray-800 rounded-md p-4 border border-emerald-200 dark:border-emerald-800 space-y-4">
                <div class="flex items-start gap-3">
                  <svg class="text-emerald-600 dark:text-emerald-400 w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Account Approval Request Submitted
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Your account request has been submitted successfully. An administrator will review your information and you'll receive an email notification once your account has been approved or if additional information is needed.
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      You can close this window now. Please check your email for updates on your account status.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            }

            <!-- Step-by-step instructions (while waiting for MFA code) -->
            @if (waitingForMfaCode && !showSubscriberForm) {
            <div class="mt-4 bg-white dark:bg-gray-800 rounded-md p-4 border border-emerald-200 dark:border-emerald-800">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Here's what to do:
              </h4>
              <ol class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li class="flex items-start gap-2">
                  <span class="flex-shrink-0 w-5 h-5 bg-[#2F5F54] dark:bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Check your email inbox for a message from Prayer Community</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="flex-shrink-0 w-5 h-5 bg-[#2F5F54] dark:bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Look for the <strong>{{codeLength}}-digit verification code</strong> in the email</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="flex-shrink-0 w-5 h-5 bg-[#2F5F54] dark:bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Enter the code above and it will verify automatically</span>
                </li>
              </ol>
            </div>
            }

            <!-- Additional info (only show while waiting for code) -->
            @if (waitingForMfaCode) {
            <div class="mt-4 flex items-start gap-2 text-xs text-[#3a7566] dark:text-emerald-300">
              <!-- Info Icon -->
              <svg class="flex-shrink-0 mt-0.5 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p>
                <strong>No email?</strong> Check your spam folder. The code expires in 10 minutes.
              </p>
            </div>
            }

          @if (waitingForMfaCode) {
          <button
            (click)="resetForm()"
            class="w-full py-2 text-center text-sm font-medium text-[#2F5F54] dark:text-emerald-400 hover:text-[#1a3a2e] dark:hover:text-emerald-300 border border-emerald-300 dark:border-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            ← Try a different email
          </button>
          }
        </div>
        }

        <!-- Login Form -->
        @if (!success) {
        <form class="mt-8 space-y-6" (ngSubmit)="handleSubmit($event)">
          <div>
            <label for="email" class="sr-only">
              Email Address
            </label>
            <div class="relative">
              <!-- Mail Icon -->
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#2F5F54] w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <input
                id="email"
                name="email"
                type="email"
                required
                [(ngModel)]="email"
                class="pl-12 pr-3 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F5F54] focus:border-[#2F5F54]"
                placeholder="Your email address"
              />
            </div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              We'll send you a secure verification code
            </p>
          </div>

          <!-- Error Message -->
          @if (error && !waitingForMfaCode) {
          <div class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <!-- AlertCircle Icon -->
            <svg class="text-red-600 dark:text-red-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-red-800 dark:text-red-200 text-sm">{{error}}</span>
          </div>
          }

          <button
            type="submit"
            [disabled]="loading || !isValidEmail()"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2F5F54] hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F5F54] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (loading) {
              <div class="flex items-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending code...
              </div>
            }
            @if (!loading) {
              <span>Send Verification Code</span>
            }
          </button>
        </form>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  email = '';
  mfaCode: string[] = [];
  mfaCodeInput = ''; // Single input field value
  codeLength = 4; // Will be fetched from settings
  error = '';
  success = false;
  loading = false;
  resendLoading = false;
  waitingForMfaCode = false;
  requireSiteLogin = false; // Track if site-wide protection is enabled
  useLogo = false;
  logoUrl = '';
  // Subscriber form state
  showSubscriberForm = false;
  showPendingApproval = false; // Show pending approval message
  requiresApproval = false; // Track if user needs admin approval
  firstName = '';
  lastName = '';
  affiliationReason = '';
  isAdmin = false; // Track if user is admin
  private isDarkMode = false;
  private returnUrl: string = '/';
  
  private destroy$ = new Subject<void>();

  constructor(
    private adminAuthService: AdminAuthService,
    private supabaseService: SupabaseService,
    private emailNotificationService: EmailNotificationService,
    private userSessionService: UserSessionService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    // Detect dark mode from document class
    this.detectDarkMode();
    
    // Watch for theme changes
    this.watchThemeChanges();
    
    // Load logo from cache/localStorage
    this.loadCachedLogo();
    
    // Fetch fresh branding from database (will update cache)
    await this.fetchBranding();
    
    // Get returnUrl and sessionExpired flag from query params
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/';
      
      // If session expired, pre-fill email and show message
      if (params['email']) {
        this.email = params['email'];
      }
      
      if (params['sessionExpired'] === 'true') {
        this.error = 'Your admin session has expired. Please re-authenticate with MFA.';
      }
      
      // If user was blocked and logged out
      if (params['blocked'] === 'true') {
        this.error = 'This account has been blocked. Please contact an administrator.';
      }
    });

    // Subscribe to site protection status
    this.adminAuthService.requireSiteLogin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(requireSiteLogin => {
        this.requireSiteLogin = requireSiteLogin;
        this.cdr.markForCheck();
      });
    
    // Fetch code length from admin settings (supports 4, 6, or 8 digits)
    await this.fetchCodeLength();
    
    // Initialize code array with the fetched code length
    // This allows the input field to accept the correct number of characters
    this.mfaCode = new Array(this.codeLength).fill('');
    
    // Check if we just sent an MFA code (persisted across re-renders)
    const mfaSent = sessionStorage.getItem('mfa_email_sent');
    const savedEmail = sessionStorage.getItem('mfa_email');
    
    if (mfaSent === 'true' && savedEmail) {
      this.success = true;
      this.waitingForMfaCode = true;
      this.email = savedEmail;
      this.cdr.markForCheck();
      
      // Focus first input after a short delay
      setTimeout(() => {
        this.focusInput(0);
      }, 100);
    }

    // Check if user is already authenticated
    this.adminAuthService.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (isAdmin) => {
        if (isAdmin) {
          try {
            const { data: { session } } = await this.supabaseService.client.auth.getSession();
            const email = session?.user?.email;
            if (email) {
              await this.userSessionService.loadUserSession(email);
            }
          } catch (sessionError) {
            console.warn('[AdminLogin] Failed to load user session:', sessionError);
            // Continue anyway - session might load asynchronously
          }
          this.router.navigate(['/']);
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
    this.loading = true;
    this.cdr.markForCheck();

    try {
      // If waiting for MFA code, verify it
      if (this.waitingForMfaCode) {
        return this.verifyMfaCode();
      }

      // Otherwise, send MFA code
      console.log('[AdminLogin] Starting MFA code send for:', this.email);
      
      const timeoutId = setTimeout(() => {
        console.warn('[AdminLogin] MFA code request timed out');
        this.loading = false;
        this.error = 'Request timed out. Please try again.';
        this.cdr.markForCheck();
      }, 15000);

      const result = await this.adminAuthService.sendMfaCode(this.email);
      
      clearTimeout(timeoutId);
      
      console.log('[AdminLogin] MFA code send result:', result);
      
      if (result.success) {
        console.log('[AdminLogin] MFA code sent successfully');
        this.success = true;
        this.waitingForMfaCode = true;
        // Save to sessionStorage
        sessionStorage.setItem('mfa_email_sent', 'true');
        sessionStorage.setItem('mfa_email', this.email);
        this.cdr.markForCheck();
      } else {
        console.error('[AdminLogin] MFA code failed:', result.error);
        this.error = result.error || 'Failed to send MFA code. Please try again.';
        this.cdr.markForCheck();
      }
    } catch (err) {
      console.error('[AdminLogin] Exception in handleSubmit:', err);
      this.error = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async verifyMfaCode() {
    try {
      // Prevent double submission
      if (this.loading) {
        return;
      }
      
      this.loading = true;
      this.error = '';
      this.cdr.markForCheck();
      
      // Sanitize input before checking
      this.sanitizeCodeInput();
      
      if (!this.isCodeComplete()) {
        this.error = 'Please enter the complete code from your email';
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      console.log('[AdminLogin] Verifying MFA code');

      const result = await this.adminAuthService.verifyMfaCode(this.mfaCode.join(''));

      if (result.success) {
        this.isAdmin = result.isAdmin || false;
        
        // Hide the MFA code input form
        this.waitingForMfaCode = false;
        
        // Keep loading spinner visible - navigate after brief delay
        const userEmail = this.email;
        
        // Clear sessionStorage
        sessionStorage.removeItem('mfa_email_sent');
        sessionStorage.removeItem('mfa_email');
        
        // UserSessionService will cache user info to userSession localStorage
        
        // Brief delay then navigate
        setTimeout(async () => {
          try {
            await this.checkEmailSubscriberAndNavigate(userEmail, this.isAdmin);
          } catch (navError) {
            console.error('[AdminLogin] Navigation error:', navError);
            this.loading = false;
            this.cdr.markForCheck();
          }
        }, 1000);
      } else {
        this.loading = false;
        console.error('[AdminLogin] MFA verification failed:', result.error);
        this.error = result.error || 'Invalid code. Please try again.';
        this.mfaCode = new Array(this.codeLength).fill(''); // Clear code for retry
        this.focusInput(0);
        this.cdr.markForCheck();
      }
    } catch (err) {
      this.loading = false;
      console.error('[AdminLogin] Exception in verifyMfaCode:', err);
      this.error = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      this.cdr.markForCheck();
    }
  }

  async handleResendCode() {
    try {
      this.resendLoading = true;
      this.error = '';
      this.cdr.markForCheck();

      console.log('[AdminLogin] Resending MFA code to:', this.email);

      // Use the same method as the initial send
      const result = await this.adminAuthService.sendMfaCode(this.email);

      if (result.success) {
        console.log('[AdminLogin] Code resent successfully');
        // Clear current code entry for fresh attempt
        this.mfaCode = new Array(this.codeLength).fill('');
        this.error = '';
        this.focusInput(0);
        this.cdr.markForCheck();
      } else {
        console.error('[AdminLogin] Resend failed:', result.error);
        this.error = result.error || 'Failed to resend code. Please try again.';
        this.cdr.markForCheck();
      }
    } catch (err) {
      console.error('[AdminLogin] Exception in handleResendCode:', err);
      this.error = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      this.cdr.markForCheck();
    } finally {
      this.resendLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async checkEmailSubscriberAndNavigate(userEmail: string, isAdmin: boolean) {
    try {
      const isSubscriber = await this.checkEmailSubscriber(userEmail);
      
      if (!isSubscriber) {
        // User not in email_subscribers - check Planning Center
        const pcResult = await lookupPersonByEmail(
          userEmail,
          environment.supabaseUrl,
          environment.supabaseAnonKey
        );
        
        const isInPlanningCenter = pcResult.count > 0;
        
        if (isInPlanningCenter) {
          this.requiresApproval = false;
        } else {
          this.requiresApproval = true;
        }
        
        this.showSubscriberForm = true;
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }
    } catch (blockError) {
      this.error = blockError instanceof Error ? blockError.message : 'Access denied';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    
    // Load user session directly (bypasses subscription timing issues) and wait for it to be persisted
    try {
      await this.userSessionService.loadUserSession(userEmail);
    } catch (sessionError) {
      console.warn('[AdminLogin] Failed to load user session:', sessionError);
      // Continue anyway - session might load asynchronously
    }
    
    // Route to the appropriate page
    // Only use returnUrl if it's NOT /admin (which would be from the admin guard redirect)
    // This ensures admins only go to /admin if they explicitly request it, not from a guard redirect
    const destination = (this.returnUrl && this.returnUrl !== '/' && this.returnUrl !== '/admin') ? this.returnUrl : '/';
    console.log('[AdminLogin] Routing to:', destination, '(returnUrl:', this.returnUrl, ')');
    this.router.navigate([destination]);
  }

  private async fetchCodeLength() {
    try {
      // Fetch the verification code length setting from admin_settings
      // Allows admins to configure code length (4, 6, or 8 digits)
      const { data, error } = await this.supabaseService.client
        .from('admin_settings')
        .select('verification_code_length')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        this.codeLength = data.verification_code_length || 4;
      } else {
        this.codeLength = 4;
      }
    } catch (err) {
      console.error('[AdminLogin] Error fetching code length:', err);
      this.codeLength = 4;
    }
  }

  sanitizeCodeInput(): void {
    // Clean up the input value - remove non-digits and limit length
    let value = this.mfaCodeInput.replace(/\D/g, '').slice(0, this.codeLength);
    this.mfaCodeInput = value;
    this.mfaCode = value.split('');
    this.cdr.markForCheck();
  }

  onCodeInput(): void {
    // Sanitize and check if code is complete
    this.sanitizeCodeInput();
    
    // Automatically submit when code is complete (only if not already loading)
    if (this.isCodeComplete() && !this.loading) {
      // Use setTimeout to ensure the UI has updated before submission
      setTimeout(() => {
        this.verifyMfaCode();
      }, 0);
    }
  }

  handleSingleCodeInput(event: any): void {
    // Deprecated - keeping for backward compatibility
    this.sanitizeCodeInput();
  }

  handleCodeChange(index: number, event: any): void {
    const target = event?.target;
    if (!target) return;
    
    const value = target.value;
    
    // Handle autofill on iOS/Chromium which pastes the full code into the first input
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, this.codeLength);
      if (digits.length >= this.codeLength) {
        this.mfaCode = digits.slice(0, this.codeLength).split('');
        this.error = '';
        // Reset the first input to show only its digit
        if (index === 0 && this.codeInputs?.first) {
          this.codeInputs.first.nativeElement.value = this.mfaCode[0];
        }
        this.focusInput(this.codeLength - 1);
        return;
      }
    }

    // Only allow digits
    if (/^\d$/.test(value)) {
      this.mfaCode[index] = value;
      this.error = '';
      if (index < this.codeLength - 1) {
        // Clear input immediately and move to next field
        target.value = '';
        this.focusInput(index + 1);
      }
    } else {
      this.mfaCode[index] = '';
      target.value = '';
    }
  }

  handleKeyDown(index: number, event: any): void {
    const key = event?.key;
    if (!key) return;
    
    if (key === 'Backspace') {
      event.preventDefault();
      this.mfaCode[index] = '';
      // Move to previous field if current field is empty (or after clearing)
      if (index > 0) {
        this.focusInput(index - 1);
      }
    } else if (key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (key === 'ArrowRight' && index < this.codeLength - 1) {
      this.focusInput(index + 1);
    } else if (key === 'Enter' && this.isCodeComplete()) {
      // Verify on Enter if all digits are filled
      this.handleSubmit(event);
    }
  }

  handlePaste(event: any): void {
    if (!event) return;
    
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D/g, '').slice(0, this.codeLength);
    
    if (digits.length >= this.codeLength) {
      this.mfaCode = digits.slice(0, this.codeLength).split('');
      this.focusInput(this.codeLength - 1);
    }
  }

  focusInput(index: number) {
    setTimeout(() => {
      const inputs = this.codeInputs.toArray();
      if (inputs[index]) {
        inputs[index].nativeElement.focus();
      }
    }, 0);
  }

  isCodeComplete(): boolean {
    return this.mfaCodeInput.length === this.codeLength;
  }

  isValidEmail(): boolean {
    if (!this.email || this.email.trim() === '') {
      return false;
    }
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email.trim());
  }

  resetForm() {
    // Clear sessionStorage
    sessionStorage.removeItem('mfa_email_sent');
    sessionStorage.removeItem('mfa_email');
    this.success = false;
    this.waitingForMfaCode = false;
    this.email = '';
    this.mfaCode = new Array(this.codeLength).fill('');
    this.error = '';
    this.firstName = '';
    this.lastName = '';
    this.affiliationReason = '';
    this.cdr.markForCheck();
  }

  private loadCachedLogo() {
    // Load from window cache first (set by index.html script)
    const windowCache = (window as any).__cachedLogos;
    
    if (windowCache?.useLogo !== undefined) {
      this.useLogo = windowCache.useLogo;
    }

    // Also check localStorage directly
    const useLogo = localStorage.getItem('branding_use_logo');
    const lightLogo = localStorage.getItem('branding_light_logo');
    const darkLogo = localStorage.getItem('branding_dark_logo');
    
    if (useLogo) {
      this.useLogo = useLogo === 'true';
    }

    if (this.useLogo) {
      // Store both light and dark logos
      if (windowCache?.light) {
        localStorage.setItem('branding_light_logo', windowCache.light);
      }
      if (windowCache?.dark) {
        localStorage.setItem('branding_dark_logo', windowCache.dark);
      }
      
      // Update image URL based on current dark mode state
      this.updateLogoUrl();
    }
    
    this.cdr.markForCheck();
  }

  private detectDarkMode() {
    // Get the effective theme (respect user choice or system preference)
    const theme = this.themeService.getTheme();
    
    if (theme === 'system') {
      // If system theme is selected, check OS preference
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      // Otherwise use the user's chosen theme
      this.isDarkMode = theme === 'dark';
    }
  }

  private watchThemeChanges() {
    // Watch for document class changes (when theme is applied)
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark !== this.isDarkMode) {
        this.isDarkMode = isDark;
        this.updateLogoUrl();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also listen to ThemeService changes for when user selects a theme
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.detectDarkMode();
        this.updateLogoUrl();
      });

    // Listen for system theme changes when user has system theme selected
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.themeService.getTheme() === 'system') {
        this.detectDarkMode();
        this.updateLogoUrl();
      }
    });
  }

  private updateLogoUrl() {
    if (!this.useLogo) {
      this.logoUrl = '';
      this.cdr.markForCheck();
      return;
    }

    const lightLogo = localStorage.getItem('branding_light_logo');
    const darkLogo = localStorage.getItem('branding_dark_logo');

    this.logoUrl = this.isDarkMode ? (darkLogo || lightLogo || '') : (lightLogo || '');
    this.cdr.markForCheck();
  }

  private async fetchBranding() {
    try {
      const { data, error } = await this.supabaseService.directQuery<{
        use_logo: boolean;
        light_mode_logo_blob: string;
        dark_mode_logo_blob: string;
      }>(
        'admin_settings',
        {
          select: 'use_logo, light_mode_logo_blob, dark_mode_logo_blob',
          eq: { id: 1 },
          limit: 1
        }
      );

      if (!error && data && Array.isArray(data) && data.length > 0) {
        const settings = data[0];
        
        if (settings.use_logo !== null && settings.use_logo !== undefined) {
          this.useLogo = settings.use_logo;
          localStorage.setItem('branding_use_logo', String(settings.use_logo));
        }
        
        if (settings.light_mode_logo_blob) {
          localStorage.setItem('branding_light_logo', settings.light_mode_logo_blob);
        }
        
        if (settings.dark_mode_logo_blob) {
          localStorage.setItem('branding_dark_logo', settings.dark_mode_logo_blob);
        }

        // Update the logo URL with fresh data
        this.updateLogoUrl();
      }
    } catch (error) {
      console.error('Failed to fetch branding settings:', error);
    }
  }

  private async checkEmailSubscriber(email: string): Promise<boolean> {
    try {
      console.log('[AdminLogin] Checking if user is already a subscriber:', email);
      const { data, error } = await this.supabaseService.directQuery<{
        id: string;
        email: string;
        is_blocked: boolean;
      }>(
        'email_subscribers',
        {
          select: 'id, email, is_blocked',
          eq: { email: email.toLowerCase() },
          limit: 1
        }
      );

      if (error) {
        console.error('[AdminLogin] Error checking subscriber status:', error);
        return false;
      }

      const isSubscriber = data && Array.isArray(data) && data.length > 0;
      
      // Check if user is blocked
      if (isSubscriber && data[0]?.is_blocked) {
        throw new Error('This account has been blocked. Please contact an administrator.');
      }
      
      console.log('[AdminLogin] Subscriber check result:', isSubscriber);
      return isSubscriber || false;
    } catch (err) {
      console.error('[AdminLogin] Exception checking subscriber:', err);
      // Re-throw if it's a blocking error so it can be displayed to the user
      if (err instanceof Error && err.message.includes('blocked')) {
        throw err;
      }
      return false;
    }
  }

  async saveNewSubscriber(): Promise<boolean> {
    try {
      if (!this.firstName.trim() || !this.lastName.trim()) {
        this.error = 'Please enter your first and last name';
        this.cdr.markForCheck();
        return false;
      }

      this.loading = true;
      this.cdr.markForCheck();

      console.log('[AdminLogin] Saving new subscriber or approval request:', this.email, { requiresApproval: this.requiresApproval });

      if (this.requiresApproval) {
        // User requires admin approval - create approval request instead
        console.log('[AdminLogin] Creating account approval request');
        console.log('[AdminLogin] Request params:', {
          email: this.email.toLowerCase(),
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          affiliationReason: this.affiliationReason.trim()
        });
        
        const { data, error } = await this.supabaseService.client
          .rpc('create_account_approval_request', {
            p_email: this.email.toLowerCase(),
            p_first_name: this.firstName.trim(),
            p_last_name: this.lastName.trim(),
            p_affiliation_reason: this.affiliationReason.trim()
          });

        console.log('[AdminLogin] RPC result:', { data, error });

        if (error) {
          console.error('[AdminLogin] Error creating approval request:', error);
          console.error('[AdminLogin] Error details:', {
            message: error.message,
            status: (error as any).status,
            statusText: (error as any).statusText,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code
          });
          
          // Check if it's a duplicate email error
          if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            this.error = 'An approval request already exists for this email address. Please check your email or contact an administrator.';
          } else {
            this.error = `Failed to submit approval request: ${error.message || 'Unknown error'}`;
          }
          
          this.loading = false;
          this.cdr.markForCheck();
          return false;
        }

        console.log('[AdminLogin] Approval request created with ID:', data);

        // Send admin notification email
        try {
          await this.emailNotificationService.sendAccountApprovalNotification(
            this.email.toLowerCase(),
            this.firstName.trim(),
            this.lastName.trim(),
            this.affiliationReason.trim()
          );
          console.log('[AdminLogin] Admin notification email sent');
        } catch (emailError) {
          console.error('[AdminLogin] Failed to send admin notification:', emailError);
          // Don't fail the request if email fails
        }

        // Show pending approval message
        this.showSubscriberForm = false;
        this.showPendingApproval = true;
        this.loading = false;
        this.cdr.markForCheck();
        return true;
      }

      // Normal subscriber flow - user is in Planning Center
      const { data, error } = await this.supabaseService.directMutation<{
        id: string;
      }>(
        'email_subscribers',
        {
          method: 'POST',
          body: {
            email: this.email.toLowerCase(),
            name: `${this.firstName.trim()} ${this.lastName.trim()}`,
            is_active: true,
            is_admin: false,
            receive_admin_emails: false,
            in_planning_center: true,
            planning_center_checked_at: new Date().toISOString()
          },
          returning: true
        }
      );

      if (error) {
        console.error('[AdminLogin] Error saving subscriber:', error);
        console.error('[AdminLogin] Error details:', {
          message: error.message,
          status: (error as any).status,
          statusText: (error as any).statusText
        });
        this.error = `Failed to save subscriber: ${error.message || 'Unknown error'}`;
        this.loading = false;
        this.cdr.markForCheck();
        return false;
      }

      console.log('[AdminLogin] Subscriber saved successfully');
      
      this.showSubscriberForm = false;
      this.firstName = '';
      this.lastName = '';
      this.affiliationReason = '';
      this.loading = false;
      
      // Load user session directly before navigating
      try {
        await this.userSessionService.loadUserSession(this.email);
      } catch (sessionError) {
        console.warn('[AdminLogin] Failed to load user session:', sessionError);
        // Continue anyway - session might load asynchronously
      }
      
      // Now route to the appropriate page
      // Only use returnUrl if it's NOT /admin (which would be from the admin guard redirect)
      // This ensures admins only go to /admin if they explicitly request it, not from a guard redirect
      const destination = (this.returnUrl && this.returnUrl !== '/' && this.returnUrl !== '/admin') ? this.returnUrl : '/';
      console.log('[AdminLogin] Routing to:', destination, '(returnUrl:', this.returnUrl, ')');
      this.router.navigate([destination]);
      
      return true;
    } catch (err) {
      console.error('[AdminLogin] Exception saving subscriber:', err);
      this.error = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      this.loading = false;
      this.cdr.markForCheck();
      return false;
    }
  }
}
