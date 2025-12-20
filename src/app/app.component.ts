import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { ApprovalLinksService } from './services/approval-links.service';
import { AdminAuthService } from './services/admin-auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastContainerComponent],
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

  constructor(
    private router: Router,
    private approvalLinks: ApprovalLinksService,
    private adminAuth: AdminAuthService
  ) {}

  ngOnInit() {
    this.handleApprovalCode();
  }

  /**
   * Handle approval code in URL for one-time admin login
   */
  private async handleApprovalCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) return;

    // Check if already validated
    const existingEmail = localStorage.getItem('approvalAdminEmail');
    if (existingEmail) {
      // Clear URL params and navigate to admin
      window.history.replaceState({}, '', window.location.pathname);
      this.adminAuth.setApprovalSession(existingEmail);
      this.router.navigate(['/admin']);
      return;
    }

    try {
      const result = await this.approvalLinks.validateApprovalCode(code);

      if (result?.user?.email) {
        // Store approval session data
        localStorage.setItem('approvalAdminEmail', result.user.email);
        localStorage.setItem('approvalSessionValidated', 'true');
        localStorage.setItem('approvalApprovalType', result.approval_type);
        localStorage.setItem('approvalApprovalId', result.approval_id);

        // Immediately set admin status
        this.adminAuth.setApprovalSession(result.user.email);

        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        // Navigate to admin - auth service now knows user is admin
        this.router.navigate(['/admin']);
      } else {
        // Code validation failed, go to login
        this.router.navigate(['/admin-login']);
      }
    } catch (error) {
      // Validation error - user can use normal login page
      console.error('Approval code validation failed:', error);
      this.router.navigate(['/admin-login']);
    }
  }
}
