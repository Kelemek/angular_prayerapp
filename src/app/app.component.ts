import { Component, OnInit, Injector, ErrorHandler, NgZone, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <router-outlet></router-outlet>
      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'prayerapp';
  private lastVisibilityState = !document.hidden;

  constructor(
    private router: Router,
    private injector: Injector,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    // Set up global error handler for unhandled errors
    this.setupGlobalErrorHandler();
  }

  /**
   * Set up a global error handler to catch uncaught errors and prevent blank pages
   */
  private setupGlobalErrorHandler(): void {
    // Catch unhandled promise rejections
    this.ngZone.run(() => {
      window.addEventListener('unhandledrejection', (event) => {
        console.error('[GlobalErrorHandler] Unhandled promise rejection:', event.reason);
        // Don't auto-reload - let the app handle recovery gracefully
      });

      // Catch global errors
      window.addEventListener('error', (event) => {
        console.error('[GlobalErrorHandler] Global error:', event.error);
        // Don't auto-reload - let the app handle recovery gracefully
      });
    });
  }

  /**
   * Handle window focus event - Edge on iOS needs explicit change detection trigger
   * Safari handles this automatically, but Edge doesn't always
   */
  @HostListener('window:focus')
  onWindowFocus(): void {
    console.log('[AppComponent] Window regained focus, triggering change detection');
    this.lastVisibilityState = !document.hidden;
    // Force change detection on focus
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.triggerDOMRecoveryIfNeeded();
  }

  /**
   * Handle visibility change - critical for Edge on iOS
   * When app returns from background, manually trigger recovery
   */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (!document.hidden && this.lastVisibilityState === true) {
      console.log('[AppComponent] Page became visible, triggering change detection and recovery');
      this.lastVisibilityState = !document.hidden;
      
      // Force change detection
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      
      // Check DOM integrity
      this.triggerDOMRecoveryIfNeeded();
    }
    this.lastVisibilityState = !document.hidden;
  }

  /**
   * Check if router-outlet is still attached to DOM
   * On Edge/iOS, the DOM can be detached during background suspension
   */
  private triggerDOMRecoveryIfNeeded(): void {
    try {
      const appRoot = document.querySelector('app-root');
      const routerOutlet = document.querySelector('router-outlet');
      
      if (appRoot && routerOutlet) {
        // Check if router outlet is actually in the DOM tree
        if (!appRoot.contains(routerOutlet)) {
          console.warn('[AppComponent] RouterOutlet detached from DOM, triggering recovery');
          // Dispatch recovery event for services to listen to
          window.dispatchEvent(new CustomEvent('app-became-visible'));
        }
      }
      
      // Also check if any content is actually being rendered
      const content = document.querySelector('[role="main"], main, .content, [class*="prayer"], [class*="card"]');
      if (!content && !document.hidden) {
        console.warn('[AppComponent] No content detected, may need recovery');
        // Give a small delay for async data loading
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 100);
      }
    } catch (err) {
      console.debug('[AppComponent] DOM recovery check failed:', err);
    }
  }

  ngOnInit() {
    this.handleApprovalCode();
  }

  /**
   * Handle approval code in URL for one-time admin login
   * Admin services are lazy loaded only when approval code is present
   */
  private async handleApprovalCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) return;

    // Check for account approval/denial codes first
    if (code.startsWith('account_approve_') || code.startsWith('account_deny_')) {
      await this.handleAccountApprovalCode(code);
      return;
    }

    // Check if already validated (for prayer/update approvals)
    const existingEmail = localStorage.getItem('approvalAdminEmail');
    if (existingEmail) {
      // Clear URL params and navigate to admin
      window.history.replaceState({}, '', window.location.pathname);
      
      // Lazy load admin auth service
      const { AdminAuthService } = await import('./services/admin-auth.service');
      const adminAuth = this.injector.get(AdminAuthService);
      await adminAuth.setApprovalSession(existingEmail);
      // Ensure loading is cleared after approval flow
      try { adminAuth.clearLoading(); } catch (e) { /* best-effort */ }
      this.router.navigate(['/admin']);
      return;
    }

    try {
      // Lazy load both services
      const { ApprovalLinksService } = await import('./services/approval-links.service');
      const { AdminAuthService } = await import('./services/admin-auth.service');
      
      const approvalLinks = this.injector.get(ApprovalLinksService);
      const adminAuth = this.injector.get(AdminAuthService);
      
      const result = await approvalLinks.validateApprovalCode(code);

      if (result?.user?.email) {
        // Store approval session data
        localStorage.setItem('approvalAdminEmail', result.user.email);
        localStorage.setItem('approvalSessionValidated', 'true');
        localStorage.setItem('approvalApprovalType', result.approval_type);
        localStorage.setItem('approvalApprovalId', result.approval_id);

        // Immediately set admin status
        await adminAuth.setApprovalSession(result.user.email);
        // Ensure loading is cleared after approval flow
        try { adminAuth.clearLoading(); } catch (e) { /* best-effort */ }

        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        // Check if user is admin before navigating
        const isAdmin = await adminAuth.getIsAdmin();
        if (isAdmin) {
          // Admin user - navigate to admin portal
          this.router.navigate(['/admin']);
        } else {
          // Non-admin user - stay on main site
          this.router.navigate(['/']);
        }
      } else {
        // Code validation failed, go to login
        this.router.navigate(['/login']);
      }
    } catch (error) {
      // Validation error - user can use normal login page
      console.error('Approval code validation failed:', error);
      try {
        const { AdminAuthService } = await import('./services/admin-auth.service');
        const adminAuth = this.injector.get(AdminAuthService);
        adminAuth.clearLoading();
      } catch (e) {
        // ignore if AdminAuthService isn't available
      }
      this.router.navigate(['/login']);
    }
  }

  private async handleAccountApprovalCode(code: string) {
    try {
      // Lazy load required services
      const { ApprovalLinksService } = await import('./services/approval-links.service');
      const { SupabaseService } = await import('./services/supabase.service');
      const { EmailNotificationService } = await import('./services/email-notification.service');
      const { ToastService } = await import('./services/toast.service');
      
      const approvalLinks = this.injector.get(ApprovalLinksService);
      const supabase = this.injector.get(SupabaseService);
      const emailService = this.injector.get(EmailNotificationService);
      const toast = this.injector.get(ToastService);
      
      // Decode the code to get email and action type
      const decoded = approvalLinks.decodeAccountCode(code);
      
      if (!decoded) {
        console.error('Invalid account approval code format');
        toast.showToast('Invalid approval link', 'error');
        this.router.navigate(['/login']);
        return;
      }

      // Get the approval request from database
      const { data: requests, error: fetchError } = await supabase.directQuery<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        approval_status: string;
      }>(
        'account_approval_requests',
        {
          select: 'id, email, first_name, last_name, approval_status',
          eq: { email: decoded.email.toLowerCase() },
          limit: 1
        }
      );

      if (fetchError || !requests || !Array.isArray(requests) || requests.length === 0) {
        console.error('Account approval request not found:', fetchError);
        toast.showToast('Approval request not found', 'error');
        this.router.navigate(['/login']);
        return;
      }

      const request = requests[0];

      if (request.approval_status !== 'pending') {
        toast.showToast(`This request has already been ${request.approval_status}`, 'info');
        this.router.navigate(['/login']);
        return;
      }

      if (decoded.type === 'approve') {
        // Approve the account - add to email_subscribers
        const { error: insertError } = await supabase.directMutation(
          'email_subscribers',
          {
            method: 'POST',
            body: {
              email: request.email.toLowerCase(),
              name: `${request.first_name} ${request.last_name}`,
              is_active: true,
              is_admin: false,
              receive_admin_emails: false
            },
            returning: false
          }
        );

        if (insertError) {
          console.error('Failed to create subscriber:', insertError);
          toast.showToast('Failed to approve account', 'error');
          this.router.navigate(['/login']);
          return;
        }

        // Delete the approval request
        await supabase.directMutation(
          'account_approval_requests',
          {
            method: 'DELETE',
            eq: { id: request.id },
            returning: false
          }
        );

        // Send approval email to user
        try {
          const template = await emailService.getTemplate('account_approved');
          if (template) {
            const subject = emailService.applyTemplateVariables(template.subject, {
              firstName: request.first_name
            });
            const html = emailService.applyTemplateVariables(template.html_body, {
              firstName: request.first_name,
              lastName: request.last_name,
              email: request.email,
              loginLink: `${window.location.origin}/login`
            });
            const text = emailService.applyTemplateVariables(template.text_body, {
              firstName: request.first_name,
              lastName: request.last_name,
              email: request.email,
              loginLink: `${window.location.origin}/login`
            });

            await emailService.sendEmail({
              to: request.email,
              subject,
              htmlBody: html,
              textBody: text
            });
          }
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }

        toast.showToast(`Account approved for ${request.first_name} ${request.last_name}`, 'success');
      } else {
        // Deny the account - delete the request
        await supabase.directMutation(
          'account_approval_requests',
          {
            method: 'DELETE',
            eq: { id: request.id },
            returning: false
          }
        );

        // Send denial email to user
        try {
          const template = await emailService.getTemplate('account_denied');
          if (template) {
            const subject = emailService.applyTemplateVariables(template.subject, {
              firstName: request.first_name
            });
            const html = emailService.applyTemplateVariables(template.html_body, {
              firstName: request.first_name,
              lastName: request.last_name,
              supportEmail: 'support@example.com' // TODO: Get from settings
            });
            const text = emailService.applyTemplateVariables(template.text_body, {
              firstName: request.first_name,
              lastName: request.last_name,
              supportEmail: 'support@example.com'
            });

            await emailService.sendEmail({
              to: request.email,
              subject,
              htmlBody: html,
              textBody: text
            });
          }
        } catch (emailError) {
          console.error('Failed to send denial email:', emailError);
        }

        toast.showToast(`Account denied for ${request.first_name} ${request.last_name}`, 'info');
      }

      // Clear URL params and navigate
      window.history.replaceState({}, '', window.location.pathname);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error handling account approval code:', error);
      const { ToastService } = await import('./services/toast.service');
      const toast = this.injector.get(ToastService);
      toast.showToast('Failed to process approval', 'error');
      this.router.navigate(['/login']);
    }
  }
}
